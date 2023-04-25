const puppeteer = require("puppeteer");
const config = require('./config.json');
var readlineSync = require('readline-sync');


let saveButton = true;
let browser;

//let searchLink = readlineSync.question('Search URL:\n');
let listName = readlineSync.question('List Name:\n');


async function launch() {
    browser = await puppeteer.launch({
        //  devtools: true,
        headless: false,
        //args: ["--user-data-dir=./Chrome Data/"],
        slowMo: 200,
        ignoreHTTPSErrors: true,
    });

    let page = await browser.newPage();
    await page.setDefaultTimeout(40000);
    await page.setViewport({ width: 1366, height: 768 });
    if  (await login(page)) {
        console.log('Please navigate to the relevant search to start!');
        // await page.goto(searchLink,
        //     { waitUntil: ['networkidle0', "domcontentloaded"] });
        await start(page);
    }
}


async function login(page) {
    try {
        await page.goto(config.login_link, { waitUntil: 'networkidle2' });
        await page.waitForSelector('#current-password', {visible: true, timeout: 0});
        await page.waitForTimeout(1000);
        await page.type('#o1-input', config.email);
        await page.waitForTimeout(1000);
        await page.type('#current-password', config.password);
        await page.waitForTimeout(1000);
        const login_btn = await page.$x('//*[@id="provider-mounter"]/div/div[2]/div[1]/div/div[2]/div/div[2]/div/form/div[6]/button');
        await login_btn[0].click();
        await page.waitForSelector('[id*="account-menu"]', {visible: true, timeout: 0});
        await page.waitForTimeout(5000);
        console.log('Login Success!');
        return true;
    } catch (e) {
        return false;
    }

}

async function start(page) {
    await page.waitForSelector('.zp_n5qRT', { visible: true, timeout: 0 });
    console.log('Search Found');
    await page.waitForTimeout(5000);
    let collected = 0;
    let pageIndex = 1;
    while (true) {
        await page.waitForSelector('[data-input]');
        await page.evaluate(() => {
            return document.getElementsByTagName('table')[0].rows.length;
        })
        await selectPage(page);
        console.log('contacts selected');
        await checkForSaveButton(page).then(out => page = out);

        console.log(saveButton, 'before')

        if (saveButton) {
            await afterSaveButton(page)
        } else {
            await afterBlock(page)
        }

        console.log(saveButton, 'after')

        await page.waitForXPath("//a[contains(., 'Saved')]");
        const savedNav = await page.$x("//a[contains(., 'Saved')]");
        await savedNav[1].click();

        await page.waitForXPath("//a[contains(., 'Net New')]", { visible: true });
        const netNew = await page.$x("//a[contains(., 'Net New')]");
        await netNew[0].click();
        collected += 25;
        console.log(collected);
        if (pageIndex % 20 == 0) {
            await page.reload();
            await page.waitForSelector('.zp_n5qRT', { visible: true });
            await page.waitForTimeout(3000);
        }
        pageIndex += 1;
    }
}

async function checkForSaveButton(page) {
    if (saveButton) {
        try {
            await page.waitForSelector(".apollo-icon-plus", { visible: true });
            await page.click('.apollo-icon-plus');

            saveButton = true;

        } catch (e) {
            console.log(e);
            console.log('no save button');
            saveButton = false;
        }
    }
    return await page;
}

async function afterSaveButton(page) {
    await page.waitForSelector('input[class="Select-input "]', { visible: true });
    await page.focus('input[class="Select-input "]');
    await page.keyboard.sendCharacter(listName);
    await page.keyboard.press('Enter');
    let confirm = "//div[contains(text(), 'Confirm')]";
    let switcher = false;

    try {
        await page.waitForXPath(confirm, { visible: true });
    } catch (e) {
        confirm = "//div[contains(@class, 'zp-button')]";
        await page.waitForXPath(confirm, { visible: true });
        switcher = true
    }

    const put = await page.$x(confirm);
    if (switcher)
        await put[put.length - 1].click();
    else
        await put[0].click();
}

async function afterBlock(page) {
    try {
        await page.waitForXPath("//i[contains(@class, 'mdi-menu-down')]", { visible: true });
        await page.evaluate(el => {
            return el.click();
        }, (await page.$x("//i[contains(@class, 'mdi-menu-down')]"))[3])

        await page.waitForXPath("//a[contains(text(), 'Add to Lists')]", { visible: true });
        const confirm1 = await page.$x("//a[contains(text(), 'Add to Lists')]");
        confirm1[0].click();
        console.log('here 1 ')

        await page.waitFor('input[class="Select-input "]', { visible: true });
        await page.focus('input[class="Select-input "]');
        await page.keyboard.sendCharacter(listName);
        await page.keyboard.press('Enter');
        console.log('here 2 ')

        await page.waitForXPath("//div[contains(text(), 'Add to Lists')]", { visible: true });
        const confirm = await page.$x("//div[contains(text(), 'Add to Lists')]");
        await confirm[1].click();
        console.log('here 3 ')
    } catch (e) {
        console.log(e);
        saveButton = true;
    }
}


async function selectPage(page) {
    try {
        await page.waitForSelector('[data-input]', { visible: true });
        const checkList = await page.$$('[data-input]');
        await checkList[0].click();

        await page.waitForXPath("//a[contains(text(), 'Select this page')]", { visible: true });
        const selectPage = await page.$x("//a[contains(text(), 'Select this page')]");
        await selectPage[0].click();
    } catch (e) {
        await selectPage(page);
    }
}

launch();

