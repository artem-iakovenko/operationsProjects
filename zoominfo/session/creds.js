const fs = require('fs');
const readline = require('readline-sync');
const puppeteer = require('puppeteer-extra');
const PuppeteerHar = require('puppeteer-har');
const StealthPlugin = require('puppeteer-extra-plugin-stealth');
const { google } = require('googleapis');
const keys = require('./keys.json');
puppeteer.use(StealthPlugin());
const user_data = require('./config.json').user_details;


const client = new google.auth.JWT(
    keys.client_email,
    null,
    keys.private_key, ['https://www.googleapis.com/auth/spreadsheets']
);
const gsapi = google.sheets({ version: 'v4', auth: client });


async function get_links() {
    const data_unf = await gsapi.spreadsheets.values.get({
        spreadsheetId: '18VwbC4uYK2sN0HQHrponE8ptQaSsn_aaK8GJ6rnKEBs',
        range: `Searches!A2:B`,
    });
    let searches_data = data_unf.data.values
    let relevant_links = [];
    for (let sd = 0; sd < searches_data.length; sd++) {
        if (searches_data[sd][1] === user_data.name) {
            relevant_links.push(searches_data[sd][0]);
        }
    }
    return relevant_links;
}



async function login(page) {
    await page.goto('https://login.zoominfo.com/');
    await page.waitForSelector('#okta-signin-username');
    await page.waitForTimeout(5000);
    const username_input = await page.$('#okta-signin-username');
    await username_input.click({ clickCount: 3 })
    await username_input.type(user_data.email);
    console.log('email typed');

    await page.waitForTimeout(2000);
    const password_input = await page.$('#okta-signin-password');
    await password_input.click({ clickCount: 3 })
    await password_input.type(user_data.password);
    console.log('pass typed');

    await page.waitForTimeout(2000);
	/*
    const save_acc = await page.$('input[name="remember"]');
    const is_checked = await (await save_acc.getProperty("checked")).jsonValue();
    console.log(is_checked);
    if (!is_checked) {
        await page.click('input[name="remember"]');
    }
    console.log('check ckicked');
	*/
    await page.waitForTimeout(2000);
    await page.click('#okta-signin-submit');

    try {
        await page.waitForSelector('.sms-request-button', {visible: true, timeout: 20000});
        let sms_verification = readline.question('SMS Verification Detected. Please Verify and press Enter\n');
    } catch (e) {
        console.log('No SMS Verification');
    }

    try {
        await page.waitForSelector('button.sales', {visible: true, timeout: 20000});
        await page.waitForTimeout(2000);
        await page.click('button.sales');
    } catch (e) {
        console.log('skip');
    }

    await page.waitForSelector('.user-profile-container', {visible: true, timeout: 0});
    console.log('Login Status: Success');
}



async function get_har(page, links) {
    const har = new PuppeteerHar(page);
    await har.start({ path: 'creds/results.har' });
    await page.waitForTimeout(3000);
    for (let l = 0; l < links.length; l++) {
        await page.goto(links[l]);
        await page.waitForSelector('.contact-name', {timeout: 0});
        await page.waitForTimeout(3000);
    }
    await page.waitForTimeout(5000);
    await har.stop();
}


async function get_cookie(page) {
    const cookies = await page.cookies();
    let cookies_str = '';
    for (let c = 0; c < cookies.length; c++) {
        let name = cookies[c].name;
        let value = cookies[c].value;
        if (c === cookies.length -1) {
            cookies_str = cookies_str + `${name}=${value}`
        } else {
            cookies_str = cookies_str + `${name}=${value}; `
        }
    }
    fs.writeFileSync("creds/cookie.txt", cookies_str);
}



(async() => {
    let search_links = await get_links();
    console.log(search_links);
    const browser = await puppeteer.launch({
        headless: false,
        userDataDir: 'zoominfoCache',
        slowMo: 10
    });
    const page = await browser.newPage();
    await login(page);
    await get_har(page, search_links);
    await get_cookie(page);
    await page.waitForTimeout(5000);
    console.log('Session has been saved');
    await browser.close();
})();
