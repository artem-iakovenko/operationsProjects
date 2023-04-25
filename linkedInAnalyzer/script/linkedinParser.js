const puppeteer = require('puppeteer-extra');
const StealthPlugin = require('puppeteer-extra-plugin-stealth');
puppeteer.use(StealthPlugin());
let keywords;
let cfgLi;
let liSelectors;


async function pageScroller(page, selector, step, tries, sleep) {
    for (let t = 1; t <= tries; t++) {
        await page.evaluate(({ selector, step }) => {
            if (!selector) {
                window.scrollBy(0, step);
            }
        }, { selector, step });
        await page.waitForTimeout(sleep);
    }
}


async function login(page, linkedinConfig) {
    await page.goto(linkedinConfig.feedUrl, { waitUntil: 'domcontentloaded' });
    try {
        await page.waitForSelector('a[href*="artemiakovenko"]', { timeout: 10000 });
    } catch (e) {
        console.log('Please log in and navigate to Feed Page');
        await page.waitForSelector('a[href*="artemiakovenko"]', { timeout: 0 });
        return;
    }

}


async function parse_technologies(job_details) {
    let array_str = (job_details.replaceAll(/\n/g, ' ').replaceAll(/  +/g, ' ').replaceAll('/', ' ')).split(' ');
    let found_techs = [];
    for (let w = 0; w < array_str.length; w++) {
        let current_word = array_str[w].replaceAll('(', '').replaceAll(')', '').replaceAll(';', '').replaceAll(':', '').replaceAll('!', '').replaceAll("'", "").replaceAll('"', '').replaceAll(',', '');
        var lastLetter = current_word[current_word.length - 1];
        if (lastLetter == ".") {
            current_word = current_word.slice(0, -1);
        }
        if (keywords.hasOwnProperty(current_word.toLowerCase())) {
            found_techs.push(keywords[current_word.toLowerCase()])
        }

    }
    return [...new Set(found_techs)];
}



async function getJobs(page, accountUrl, linkedinConfig) {
    let jobsResult = [];
    if (!accountUrl) {
        return jobsResult;
    }
    let jobsUrl = `${accountUrl}/jobs/`.replaceAll("//", "/");
    await page.goto(jobsUrl, { waitUntil: 'domcontentloaded' });

    try {
        await page.waitForSelector('.org-top-card', { visible: true, timeout: 15000 });
    } catch (e) {
        return [];
    }

    let areJobs = false;
    try {
        await page.waitForSelector('.org-jobs-recently-posted-jobs-module__show-all-jobs-btn a', { visible: true, timeout: 5000 });
        areJobs = true
    } catch (e) {
        // no need to do anything
    }
    if (!areJobs) {
        return jobsResult;
    }
    await page.waitForTimeout(4000);
    let jobDetailsLinkUnf = await page.$eval('.org-jobs-recently-posted-jobs-module__show-all-jobs-btn a', jobDetails_link => jobDetails_link.href);
    let jobDetailsLink = `${jobDetailsLinkUnf.replace('&origin=COMPANY_PAGE_JOBS_CLUSTER_EXPANSION', '')}${linkedinConfig.job_function}${linkedinConfig.keywords}&sortBy=DD`;
    await page.goto(jobDetailsLink, { waitUntil: 'domcontentloaded' });
    await page.waitForSelector('.job-card-container .job-card-list__title', { visible: true, timeout: 0 });
    try {
        await page.waitForSelector('small.jobs-search-results-list__text', { visible: true, timeout: 10000 });
    } catch (e) {
        return jobsResult;
    }
    let totalJobs = await page.$eval('small.jobs-search-results-list__text', totalJobs => totalJobs.innerText);
    totalJobs = totalJobs.replaceAll(' results', '').replaceAll(' result', '').replaceAll(',', '');

    if (Number(totalJobs) == 0) {
        return jobsResult;
    }

    let scrollHeight = await page.evaluate(() => {
        return document.querySelector('.jobs-search-results-list').scrollHeight;
    });

    let scrollStep = 200;
    let stopIndex = 10;
    let startIndex = 1;


    while (true) {
        if (startIndex == stopIndex) {
            break;
        }
        await page.evaluate((step) => {
            let scrollable_div = document.querySelector('.jobs-search-results-list');
            scrollable_div.scrollBy(0, step);
        }, scrollStep);
        await page.waitForTimeout(1000);
        let loadedJobs = (await page.$$('.job-card-container .job-card-list__title')).length;
        if (loadedJobs >= 10 || loadedJobs == Number(totalJobs)) {
            break;
        }
        await page.waitForTimeout(1000);
        startIndex += 1;
    }

    let jobs = await page.$$('.job-card-container .job-card-list__title');

    for (let l = 0; l < 10; l++) {
        try {
            await jobs[l].click();
        } catch (e) {
            return jobsResult;
        }
        await page.waitForTimeout(4000);
        await page.waitForSelector('.jobs-search__job-details--container', { visible: true, timeout: 0 });
        // PARSE DATA
        let jobTitle = await page.$eval('h2[class*="job-title"]', job_title => job_title.innerText);
        let jobLink = await page.$eval('.jobs-search__job-details--container a[href*="jobs/view/"]', job_link => job_link.href);
        let postedDate = await page.$eval('span[class*="posted-date"]', posted_date => posted_date.innerText);
        let jobLocationUnf = await page.$eval('.jobs-unified-top-card__bullet', job_location => job_location.innerText);
        let jobLocation = jobLocationUnf.substring(1, jobLocationUnf.length - 1);
        let jobType = await page.$eval('.jobs-unified-top-card__job-insight', job_type => job_type.innerText);
        let jobDetailsUnf = await page.$eval('#job-details', job_details => job_details.innerText);
        let jobDetails = `${jobTitle} ${jobDetailsUnf}`;
        let technologies = await parse_technologies(jobDetails);
        let tech1 = "";
        let tech2 = "";
        let job_info;
        if (technologies.length > 0) {
            let jobObj = {
                "jobTitle": jobTitle,
                "jobLink": jobLink,
                "postedDate": postedDate,
                "technologies": technologies.join(", ")
            };
            jobsResult.push(jobObj);
            if (jobsResult.length == 5) {
                break;
            }
        }
        await page.waitForTimeout(5000);
    }
    return jobsResult;
}


async function getFeatured(page, accountContact) {
    let featuredResult = [];
    if (!accountContact.contactLinkedIn) {
        return featuredResult;
    }
    await page.goto(`${accountContact.contactLinkedIn}${cfgLi.featuredUrl}`, { waitUntil: 'domcontentloaded' });
    try {
        await page.waitForSelector(liSelectors.emptyFeatured, { timeout: 10000 });
        await page.waitForTimeout(5000);
        return featuredResult;
    } catch (e) {
        //
    }
    try {
        await page.waitForSelector(liSelectors.featuredBoxes, { timeout: 5000 });
    } catch (e) {
        //accountContact.featured = [];
        //featuredResult.push(accountContact);
        return featuredResult;
    }
    let allFeatured = await page.$$(liSelectors.featuredBoxes);
    for (let feature of allFeatured) {
        let featureContent = await feature.$eval(liSelectors.featuredBoxConent, el => el.innerText);
        featureContent = featureContent.toString().toLowerCase();
        let isRelevant = false;
        let keywordsFound = [];
        for (let featureKeyword of cfgLi.featuredKeywords) {
            if (featureContent.includes(featureKeyword)) {
                keywordsFound.push(featureKeyword);
                if (!isRelevant) {
                    isRelevant = true;
                }
            }
        }
        if (isRelevant) {
            let featureType;
            try {
                featureType = await feature.$eval('.mt3 span', el => el.innerText);
                featureType = featureType.replaceAll('\n', '');
            } catch (e) {
                featureType = "unknown";
            }
            let featureName;
            try {
                featureName = await feature.$eval('.text-heading-medium span', el => el.innerText);
                featureName = featureName.replaceAll('\n', '');
            } catch (e) {
                featureName = "unknown";
            }
            let featureLink;
            try {
                featureLink = await feature.$eval('a', el => el.href);
            } catch (e) {
                featureLink = "unknown";
            }
            let featureObj = {
                "name": featureName,
                "type": featureType,
                "link": featureLink,
                "keywordsFound": keywordsFound.join(", ")
            };
            featuredResult.push(featureObj);
            if (featuredResult.length == 10) {
                break;
            }
        }
    }
    await page.waitForTimeout(5000);
    return featuredResult;

}

async function getActivities(page, accountContact) {
    activityResult = [];
    if (!accountContact.contactLinkedIn) {
        return activityResult;
    }
    await page.goto(`${accountContact.contactLinkedIn}${cfgLi.activityUrl}`, { waitUntil: 'domcontentloaded' });
    try {
        await page.waitForSelector(liSelectors.activityBoxes, { timeout: 10000 });
    } catch (e) {
        return activityResult;
    }
    //await pageScroller(page, false, 500, 80, 500);
    let profileActivities = await page.$$(liSelectors.activityBoxes);
    for (let profileActivity of profileActivities) {
        let activityContent = await profileActivity.$eval(liSelectors.activityBoxContent, el => el.innerText);
        activityContent = activityContent.toLowerCase();
        let isRelevant = false;
        keywordsFound = [];
        for (let activityKeyword of cfgLi.activityKeywords) {
            if (activityContent.includes(activityKeyword)) {
                keywordsFound.push(activityKeyword);
                if (!isRelevant) {
                    isRelevant = true;
                }
            }
        }
        if (isRelevant) {
            let linkEnd = await page.evaluate(el => el.getAttribute("data-urn"), profileActivity);
            let postUrl = `https://www.linkedin.com/feed/update/${linkEnd}`;

            let activityObj = {
                "link": postUrl,
                "keywordsFound": keywordsFound.join(", ")
            }
            activityResult.push(activityObj);
            if (activityResult.length == 10) {
                break;
            }
        }
    }
    await page.waitForTimeout(5000);
    return activityResult;
}


async function getProfileNews(page, accountContacts) {
    let result = [];
    let ci = 1;
    for (let accountContact of accountContacts) {
        let featured = await getFeatured(page, accountContact);
        //await page.waitForTimeout(100000);
        let activities = await getActivities(page, accountContact);
        accountContact.featured = featured;
        accountContact.activity = activities;
        result.push(accountContact);
        await page.waitForTimeout(5000);
    }
    return result;
}

async function linkedinLauncher(verificationDetails, linkedinConfig) {
    cfgLi = linkedinConfig;
    liSelectors = cfgLi.selectors;
    keywords = linkedinConfig.technologies;
    let potentialsObjects = verificationDetails.potentials;
    let leadsObjects = verificationDetails.leads;
    if (potentialsObjects === undefined && leadsObjects === undefined) {
        return false;
    } 
    const browser = await puppeteer.launch({
        userDataDir: "../chromeData",
        headless: false
    });
    const page = await browser.newPage();
    await login(page, linkedinConfig);

    await page.waitForTimeout(10000);
    if (potentialsObjects !== undefined) {
        for (let entryId of Object.keys(potentialsObjects)) {
            dataObj = potentialsObjects[entryId];
            let accountJobs = await getJobs(page, dataObj.accountLinkedIn, linkedinConfig);
            verificationDetails.potentials[entryId].jobs = accountJobs;
            let profileNews = await getProfileNews(page, dataObj.contacts);
            verificationDetails.potentials[entryId].contacts = profileNews;
            await page.waitForTimeout(5000);
        }
    }
    if (leadsObjects !== undefined) {
        for (let entryId of Object.keys(leadsObjects)) {
            dataObj = leadsObjects[entryId];
            let accountJobs = await getJobs(page, dataObj.accountLinkedIn, linkedinConfig);
            verificationDetails.leads[entryId].jobs = accountJobs;
            let profileNews = await getProfileNews(page, dataObj.contacts);
            verificationDetails.leads[entryId].contacts = profileNews;
            await page.waitForTimeout(5000);
        }
    }
    await browser.close();
    return verificationDetails;
}

module.exports = { linkedinLauncher };