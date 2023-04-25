const config = require('./config.json');
const { google } = require('googleapis');
const keys = require('./keys.json');
const puppeteer = require('puppeteer-extra');
const readline = require('readline-sync');
const StealthPlugin = require('puppeteer-extra-plugin-stealth');
puppeteer.use(StealthPlugin());


// Connect With Google Sheets
const client = new google.auth.JWT(
    keys.client_email,
    null,
    keys.private_key, ['https://www.googleapis.com/auth/spreadsheets']
);
const gsapi = google.sheets({ version: 'v4', auth: client });


async function login(page) {
    try {
        await page.goto(config.urls.mainUrl);
        await page.waitForSelector('a[href="/login"]', { visible: true, timeout: 0 });
        await page.waitForTimeout(7000);
        await page.click('a[href="/login"]');
        await page.waitForSelector('input[type="email"]');
        await page.waitForTimeout(2000);
        await page.type('input[type="email"]', config.credentials.email);
        await page.waitForTimeout(2000);
        await page.type('input[type="password"]', config.credentials.password);
        await page.waitForTimeout(2000);
        await page.click('input[type="submit"]');
        return true;
    }
    catch (e) {
        return false;
    }
}



async function closePopup(page) {
    try {
        await page.waitForSelector('[data-test="closeButton"]', { timeout: 10000 });
        await page.click('[data-test="closeButton"]');
    } catch (e) {
        await page.waitForTimeout(2000);
    }
}



async function selectSearch(page, searchName) {
    let currentUrl = await page.url();
    if (currentUrl != `${config.urls.mainUrl}${config.urls.jobsPath}`) {
        await page.goto(`${config.urls.mainUrl}${config.urls.jobsPath}`);
    }
    await page.waitForTimeout(2000);
    await page.waitForSelector('[data-test*="SavedSearchTab-SavedSearch"] span span', { visible: true, timeout: 0 });
    let availableSearches = await page.$$('[data-test*="SavedSearchTab-SavedSearch"] span span');
    let searchFound = false;
    for (let search of availableSearches) {
        let searchOption = await page.evaluate(el => el.textContent, search);
        if (searchOption == searchName) {
            searchFound = true;
            await search.click();
            await page.waitForTimeout(5000);
            await page.waitForTimeout('[data-test="StartupResult"]', { timeout: 0 });
        }
    }
    return searchFound;
}


async function scrollSearch(page) {
    let prevLoaded = 0;
    while (true) {
        await page.evaluate(async () => {
            window.scrollBy(0, 10000);
        });
        await page.waitForTimeout(10000);
        let allProfiles = await page.$$('[data-test="StartupResult"]');
        let promotedProfiles = await page.$$('[data-test="StartupResult"] .gap-1');
        let loadedProfiles = allProfiles.length - promotedProfiles.length;
        if (loadedProfiles == prevLoaded) {
            return;
        }
        prevLoaded = loadedProfiles;
    }
}


async function getAllProfiles(page) {
    let companyUrls = await page.$$eval('[class*="headerContainer"] a[href*="/company/"]', els => els.map(el => el.href));
    return [...new Set(companyUrls)];
}



async function parseCompanyDetails(page) {
    let companyHeader = await page.$('[data-test="Masthead"]');
    let companyName;
    try { companyName = await companyHeader.$eval("h1", el => el.innerText); } catch (e) { companyName = ""; }
    let companyDescription;
    try { companyDescription = await companyHeader.$eval("h2", el => el.innerText); } catch (e) { companyDescription = ""; }

    let sidebar = await page.$('[data-test="Sidebar"]');
    let website;
    try { website = await sidebar.$eval('li[class*="websiteLink"] a', el => el.href); } catch (e) { website = ""; }

    let companyLinkedin;
    try { companyLinkedin = await sidebar.$eval('a[href*="linkedin"]', el => el.href); } catch (e) { companyLinkedin = ""; }


    let sidebarOptions = await sidebar.$$('dd');
    let companySize = "";
    let raisedFunds = "";
    let locations = "";
    let companyTypes = "";
    let markets = "";

    for (let sidebarOptrion of sidebarOptions) {
        let optionName = await page.evaluate(el => el.textContent, sidebarOptrion);
        if (optionName == "Company size") {
            try { companySize = await page.evaluate(el => el.nextElementSibling.innerText, sidebarOptrion); } catch (e) { }
        } else if (optionName == "Total raised") {
            try { raisedFunds = await page.evaluate(el => el.nextElementSibling.innerText, sidebarOptrion); } catch (e) { };
        } else if (optionName == "Location") {
            try {
                let locationsHandler = await page.evaluateHandle(el => el.nextElementSibling, sidebarOptrion);
                let locationsList = await locationsHandler.$$eval("li", els => els.map(el => el.innerText));
                locations = locationsList.join("\n");
            } catch (e) {
                console.log(e);
                //
            }
        } else if (optionName == "Company type") {
            try {
                let typesHandler = await page.evaluateHandle(el => el.nextElementSibling, sidebarOptrion);
                let typesList = await typesHandler.$$eval("span", els => els.map(el => el.innerText));
                companyTypes = typesList.join("\n");
            } catch (e) {
                //
            }
        } else if (optionName == "Markets") {
            try {
                let marketsHandler = await page.evaluateHandle(el => el.nextElementSibling, sidebarOptrion);
                let marketsList = await marketsHandler.$$eval("span", els => els.map(el => el.innerText));
                markets = marketsList.join("\n");
            } catch (e) {
                //
            }
        }
    }

    let jobs;;
    try {
        let jobsList = await page.$$eval('[data-test="OverviewTab"] a[href*="/jobs/"]', els => els.map(el => el.innerText));
        jobs = jobsList.join("\n");
    } catch (e) {
        jobs = "";
    }


    return [
        companyName,
        companyDescription,
        website,
        companyLinkedin,
        companySize,
        raisedFunds,
        locations,
        companyTypes,
        markets,
        jobs
    ];

}


async function updateSheet(updateData) {
    try {
        const records = await gsapi.spreadsheets.values.get({
            spreadsheetId: config.spreadsheetId,
            range: `A1:A`,
        });
        count = records.data.values.length + 1;

        const sheetPosition = {
            spreadsheetId: config.spreadsheetId,
            range: `A${count}`,
            valueInputOption: 'USER_ENTERED',
            resource: { values: updateData }
        };
        await gsapi.spreadsheets.values.update(sheetPosition);
    } catch (err) {
        console.log(err);
        console.log('No response from Google Sheets. Skipping...')
    }
}

async function getProfilesInfo(page, profiles) {
    let profileCounter = 1;
    for (let profile of profiles) {
        await page.goto(profile, {
            waitUntil: 'load',
            // Remove the timeout
            timeout: 0
        });
        await page.waitForSelector('[data-test="OverviewTab"]', { visible: true, timeout: 0 });
        await page.waitForTimeout(2000);

        let contacts = await page.$$('.styles_header__LhnxP');
        console.log(`Current Company URL: ${profileCounter}. ${profile}`);
        console.log(`Total Contacts Available: ${contacts.length}`);
        if (contacts.length > 0) {
            let companyInfo = await parseCompanyDetails(page);
            companyInfo.push(profile);
            let updateList = [];
            for (let contact of contacts) {
                let contactName;
                try { contactName = await contact.$eval('h4', el => el.innerText); } catch (e) { contactName = "" };

                let contactUrl;
                try { contactUrl = await contact.$eval('h4 a', el => el.href); } catch (e) { contactUrl = ""; }

                let title
                try { title = await contact.$eval('.styles_byline__wPnKW', el => el.innerText); } catch (e) { title = ""; }

                let bio;
                try { bio = await contact.$eval('[class*=bio]', el => el.innerText); } catch (e) { bio = ""; }

                let contactInfo = [contactName, contactUrl, title, bio];
                let profileResult = contactInfo.concat(companyInfo);
                updateList.push(profileResult);
            }
            await updateSheet(updateList);
        }

        await page.waitForTimeout(5000);
        console.log('---------------------------------------');
        profileCounter += 1;
    }
}


(async () => {
    let searchName = readline.question('Search Name: ');
    const browser = await puppeteer.launch({
        headless: false,
        slowMo: 50
    });
    const page = await browser.newPage();
    await page.setDefaultNavigationTimeout(0);

    await login(page);
    await page.waitForTimeout(5000);
    await closePopup(page);
    await page.waitForTimeout(5000);
    await selectSearch(page, searchName);
    await page.waitForTimeout(5000);
    await scrollSearch(page);
    console.log('Scroll Completed');
    await page.waitForTimeout(5000);
    let pageProfiles = await getAllProfiles(page);
    await page.waitForTimeout(5000);
    await getProfilesInfo(page, pageProfiles);
    await page.waitForTimeout(5000);
    await browser.close();

})();