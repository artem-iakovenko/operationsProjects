const puppeteer = require('puppeteer-extra');
const StealthPlugin = require('puppeteer-extra-plugin-stealth');
puppeteer.use(StealthPlugin());
const config = require('./config.json');
const readline = require('readline');
const keys = require('./keys.json');
const { google } = require('googleapis');
const { cloudsearch } = require('googleapis/build/src/apis/cloudsearch');
const list_of_industries = config.industries;
const client = new google.auth.JWT(
    keys.client_email,
    null,
    keys.private_key, ['https://www.googleapis.com/auth/spreadsheets']
);
const gsapi = google.sheets({ version: 'v4', auth: client });


async function between(min, max) {
    return Math.floor(
        Math.random() * (max - min) + min
    );
}


async function readLine(question) {

    const rl = readline.createInterface({
        input: process.stdin,
        output: process.stdout
    });

    return new Promise(resolve => {

        rl.question(question, (answer) => {
            rl.close();
            resolve(answer)
        });
    })
}



async function scroll_page(page) {
    await page.evaluate(async () => {
        await new Promise((resolve, reject) => {
            var totalHeight = 0;
            var distance = 100;
            var timer = setInterval(() => {
                var scroll_selector = document.querySelector('#search-results-container');
                var scrollHeight = scroll_selector.scrollHeight;
                scroll_selector.scrollBy(0, distance);
                totalHeight += distance;

                if (totalHeight >= scrollHeight) {
                    clearInterval(timer);
                    resolve();
                }
            }, 100);
        });
    });
}



async function update_sheets(data) {

    const check = await gsapi.spreadsheets.values.get({
        spreadsheetId: '17xSb9mjcVQt-fZcMSV0kohgVqZ1_Wg80gy4YDBwiqEo',
        range: `A1:A`,
    });
    count = check.data.values.length + 1;
    const updateInfo = {
        spreadsheetId: '17xSb9mjcVQt-fZcMSV0kohgVqZ1_Wg80gy4YDBwiqEo',
        range: `A${count}`,
        valueInputOption: 'USER_ENTERED',
        resource: { values: data }
    };
    await gsapi.spreadsheets.values.update(updateInfo);
}


/*
async function scrapper(page, browser) {
    var profile_links = await page.$$eval('[data-control-name="view_profile_via_result_name"]', profile_links => profile_links.map(profile_link => profile_link.href));
    var names = await page.$$eval('[data-control-name="view_profile_via_result_name"]', names => names.map(name => name.innerText));

    //await page.waitForTimeout(300000);
    const profile_page = await browser.newPage();

    var data_to_push = [];

    for (pl = 0; pl < profile_links.length; pl++) {
        await profile_page.goto(profile_links[pl], { waitUntil: 'domcontentloaded' });
        await profile_page.waitForSelector(".profile-topcard__current-positions .profile-topcard__summary-position-title", {
            timeout: 0
        });
        var name = names[pl];
        var job_title = await profile_page.$eval(".profile-topcard__current-positions .profile-topcard__summary-position-title", job_title => job_title.innerText);
        var person_li_id_unf = profile_links[pl].split(",");
        var person_li_id = person_li_id_unf[0].replace("https://www.linkedin.com/sales/people/", "");
        var person_li = `https://www.linkedin.com/in/${person_li_id}`;
        var company_link;
        try {
            company_link = await profile_page.$eval(".profile-topcard__current-positions a.ember-view", company_link => company_link.href);
        } catch (e) {
            console.log(e);
            await profile_page.waitForTimeout(20000);
            continue;
        }
        // await profile_page.goto(company_link_about, {waitUntil: 'domcontentloaded'});
        // await profile_page.waitForSelector();
        var li_company = company_link.replace("https://www.linkedin.com/sales/company/", "https://www.linkedin.com/company/");
        var company_name;
        await page.waitForTimeout(between(1, 4) * 1000);


        try {
            await profile_page.goto(li_company + "/about/");
            await profile_page.waitForSelector(".mb4.text-body-small.t-black--light", {
                timeout: 10000
            });
            company_existance = true;
        } catch (e) {
            //console.log("COMPANY DO NOT EXIST ON LINKEDIN");
            company_existance = false;
            company_name = "no data";
        }


        if (company_existance) {
            var website;
            try {
                website = await profile_page.$eval(".mb4.text-body-small.t-black--light a", website => website.href);
            } catch (e) {
                website = "no data";
            }

            var collector = [];
            var hasNumber = /\d/;
            var hq_location;
            try {
                company_name = await profile_page.$eval(".org-top-card__primary-content h1", company_name => company_name.innerText);
            } catch (e) {
                try {
                    company_name = await profile_page.$eval(".org-top-card-listing__summary h1", company_name => company_name.innerText);
                } catch (err) {
                    company_name = "no data";
                }
            }
            var all_cdata = await profile_page.$eval("#main", all_cdata => all_cdata.innerText);
            var industry = "no data";
            for (ind = 0; ind < list_of_industries.length; ind++) {
                var is_industry = all_cdata.includes(list_of_industries[ind]);
                if (is_industry) {
                    industry = list_of_industries[ind];
                    break;
                }
            }
            var company_datas2 = await profile_page.$$eval(".org-top-card-summary-info-list__info-item", company_datas2 => company_datas2.map(company_data2 => company_data2.innerText));
            company_datas2.forEach(element => {
                if (hasNumber.test(element) == false) {
                    collector.push(element);
                };
            });
            if (collector.length == 1) {
                hq_location = collector[0];
            } else if (collector.length == 2) {
                hq_location = collector[1]
            } else {
                hq_location = "no data";
            }

            var size;
            try {
                size = await profile_page.$eval(".text-body-small.t-black--light.mb1", size => size.innerText);
                size = size.replace(" employees", "").replace(",", "");
            } catch (e) {
                size = "no data";
            }
        } else {
            var website = "no data";
            var industry = "no data";
            var size = "no data";
            var hq_location = "no data";
        }
        //var data_to_push = [[name, person_li, job_title, company_name, li_company, website, industry, size, hq_location]];
        data_to_push.push([name, person_li, job_title, company_name, li_company, website, industry, size, hq_location]);
        //console.log(data_to_push);
        //await update_sheets(data_to_push);

        await page.waitForTimeout(between(4, 10) * 1000);
    }
    await update_sheets(data_to_push);
    await profile_page.close();
}
*/

async function scrapper(page, browser) {
    var all_profile_links = await page.$$eval('a[href*="/sales/lead"]', profile_links => profile_links.map(profile_link => profile_link.href));
    var profile_links = [...new Set(all_profile_links)];

    //var names = await page.$$eval('[data-control-name="view_profile_via_result_name"]', names => names.map(name => name.innerText));

    const profile_page = await browser.newPage();
    //var data_to_push = [];

    for (let pl = 0; pl < profile_links.length; pl++) {
        await profile_page.goto(profile_links[pl], { waitUntil: 'domcontentloaded' });
        try {
            await profile_page.waitForSelector('[class*="_current-role-container"]', { timeout: 0 });
        } catch (e) {
            await page.waitForTimeout(10000);
            continue;
        }

        await profile_page.waitForTimeout(5000);

        var contact_name = await profile_page.$eval('[data-anonymize="person-name"]', contact_name => contact_name.innerText);
        contact_name = contact_name.replaceAll('  ', '').replaceAll('\t', '').replaceAll('\n', '');
        var contact_link = (profile_links[pl].split(',')[0]).replace('https://www.linkedin.com/sales/lead/', 'https://www.linkedin.com/in/');


        var company_data = await profile_page.evaluate(() => {
            var result;
            try {
                var company_div = document.querySelector('[class*="_current-role-container"] a[data-anonymize="company-name"]');
                var company_sn_link = company_div.href;
                var company_name = company_div.innerText;
                var job_container = company_div.closest('div');
                var title = job_container.querySelector('[class*="_current-role-container"] [data-anonymize="job-title"]').innerText;
                result = [company_sn_link, company_name, title];
            } catch (e) {
                console.log(e);
                result = false;
            }
            return result;
        });
        //console.log(company_data);

        if (company_data) {
            var company_sn_link = company_data[0];
            var company_name = company_data[1];
            var title = company_data[2];
        } else {
            continue;
        }


        // var company_sn_link;
        // var company_name;
        // try {
        //     company_sn_link = await profile_page.$eval('[class*="_current-role-container"] a[data-anonymize="company-name"]', company_name => company_name.href);
        //     company_name = await profile_page.$eval('[class*="_current-role-container"] a[data-anonymize="company-name"]', company_name => company_name.innerText);

        // } catch (e) {
        //     continue;
        // }
        var company_link = (company_sn_link.split('?')[0]).replace('https://www.linkedin.com/sales/company/', 'https://www.linkedin.com/company/');
        //var title = await profile_page.$eval('[class*="_current-role-container"] [data-anonymize="job-title"]', title => title.innerText);
        var work_duration = await profile_page.$eval('[class*="_current-role-container"] [class*="_position-time-period-range"]', work_duration => work_duration.innerText);
        var contact_location;
        try {
            contact_location = await profile_page.$eval('._lockup-links-container_sqh8tm div', contact_location => contact_location.innerText);
        } catch (e) {
            contact_location = '';
        }

        //await page.waitForTimeout(300000);
        await profile_page.hover('[class*="_current-role-container"] a[data-anonymize="company-name"]');
        // await profile_page.waitForSelector('[data-anonymize="company-size"]', {timeout: 0});

        await profile_page.waitForTimeout(1500);
        await profile_page.click('[class*="_current-role-container"] a[data-anonymize="company-name"]', { waitUntil: 'domcontentloaded' });

        await profile_page.waitForSelector('.account-actions', { timeout: 0 });

        await profile_page.waitForTimeout(1500);

        var company_sizes = await profile_page.$$eval('[data-anonymize="company-size"]', company_sizes => company_sizes.map(company_size => company_size.innerText));
        var employee_size;
        try {
            employee_size = (company_sizes[company_sizes.length - 1]).replaceAll(' ', '').replaceAll('employees', '').replaceAll('\n', '');

        } catch (e) {
            employee_size = 'unknown';
        }

        var industry = await profile_page.$eval('[data-anonymize="industry"]', industry => industry.innerText);
        var revenue;
        try {
            var revenue = await profile_page.$eval('[data-anonymize="revenue"]', revenue => revenue.innerText);
        } catch (e) {
            revenue = '';
        }

        await profile_page.click('.account-actions .mr2', { waitUntil: 'domcontentloaded' });
        await profile_page.waitForSelector('[data-control-name="open_account_details"]', { timeout: 0 });
        await profile_page.click('[data-control-name="open_account_details"]', { waitUntil: 'domcontentloaded' });

        await profile_page.waitForSelector('#company-details-panel__header', { timeout: 0 });

        var website;
        try {
            website = await profile_page.$eval('.company-details-panel-website', website => website.href);
        } catch (e) {
            website = 'unknown';
        }

        var headquarter;
        try {
            headquarter = await profile_page.$eval('.company-details-panel-headquarters', headquarter => headquarter.innerText);
        } catch (e) {
            headquarter = 'unknown';
        }

        var specialities;
        try {
            specialities = await profile_page.$eval('.company-details-panel-specialties', specialities => specialities.innerText);
        } catch (e) {
            specialities = 'unknown';
        }
        await profile_page.waitForTimeout(2000);

        console.log(`\tCurrent Contact: ${contact_name} from ${company_name}`);
        var data_to_push = [];
        data_to_push.push([
            contact_name,
            contact_link,
            company_name,
            company_link,
            title,
            work_duration,
            contact_location,
            employee_size,
            industry,
            website,
            headquarter,
            specialities,
            revenue
        ]);
        await update_sheets(data_to_push);
        await page.waitForTimeout(8000);
    }
    //await update_sheets(data_to_push);
    await profile_page.close();
}



async function launcher() {
    var search_link = await readLine('Search link: ');
    search_link = search_link.replace('&viewAllFilters=true', '');
    var page_number = await readLine('Page Number: ');
    if (page_number != 1) {
        var splitted_link = search_link.split('people?');
        search_link = `${splitted_link[0]}people?page=${page_number}&${splitted_link[1]}`;
    }

    console.log(search_link);
    const browser = await puppeteer.launch({
        headless: false,
        userDataDir: "ChromeData",
        slowMo: 140
    });
    //await browser.pages[0].close();
    const page = await browser.newPage();
    await page.goto(config.feed_page, { waitUntil: 'domcontentloaded' });
    try {
        await page.waitForSelector(".feed-identity-module", {
            timeout: 10000
        });
    } catch (e) {
        console.log("Please log in manually.");
        await page.waitForSelector(".feed-identity-module", {
            timeout: 0
        });
    }

    await page.goto(search_link, { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(20000);
    var cur_page = Number(page_number);
    for (p = 0; p < 40; p++) {
        console.log(`\tPage ${cur_page} in progress...`);
        if (p == 15) {
            // await page.waitForTimeout(900000 * 2);
            break;
        }
        //await page.waitForSelector();
        await scroll_page(page);
        await page.waitForTimeout(between(2, 6) * 1000);
        await scrapper(page, browser);
        try {
            //await page.click(".artdeco-pagination__button--next", { waitUntil: 'domcontentloaded' });
            await page.evaluate(() => { document.querySelector('.artdeco-pagination__button--next').click(); });

        } catch (e) {
            break;
        }
        cur_page += 1;
    }

    await browser.close();
    console.log("Done :)");

}

launcher();