const config = require('./config.json');
const accounts = config.accounts;
const selectors = config.selectors;
const puppeteer = require('puppeteer-extra');
const keys = require('./keys.json');

const readline = require('readline-sync');
const { google } = require('googleapis');
const StealthPlugin = require('puppeteer-extra-plugin-stealth');
const { executablePath } = require('puppeteer')
var utc = new Date().toJSON().slice(0,10).replace(/-/g,'-');

const client = new google.auth.JWT(
    keys.client_email,
    null,
    keys.private_key, ['https://www.googleapis.com/auth/spreadsheets']
);
const gsapi = google.sheets({ version: 'v4', auth: client });


puppeteer.use(StealthPlugin());




async function updateSheets(data) {

    const check = await gsapi.spreadsheets.values.get({
        spreadsheetId: config.spreadsheetId,
        range: `A1:A`,
    });
    count = check.data.values.length + 1;
    const updateInfo = {
        spreadsheetId: config.spreadsheetId,
        range: `A${count}`,
        valueInputOption: 'USER_ENTERED',
        resource: { values: data }
    };
    await gsapi.spreadsheets.values.update(updateInfo);
}






async function login(page, email, password) {
    await page.goto(config.inboxUrl, { 'waitUntil': 'load' });
    await page.waitForTimeout(5000);
    try {
        await page.waitForSelector(selectors.mainPageMessages, { timeout: 10000 });
        console.log("logged in");
        return true;
    } catch (e) {
        console.log(`Email: ${email}\nPassword: ${password}\nStatus: Login Fail\n\nPlease log in and navigate to inbox`);
        await page.waitForSelector(selectors.mainPageMessages, { timeout: 0 });
        return true;
    }
}



async function getMessageInfo(page, persona, personaEmail) {
    await page.waitForTimeout(5000);
    await page.waitForSelector(selectors.messageHeader, { timeout: 0 });
    let messageHeader = await page.$(selectors.messageHeader);
    let labels = await page.$$eval(selectors.label, els => els.map(el => el.innerText));
    let folderName = labels[labels.length - 1];
    //let subject = await messageHeader.$eval('.hP', el => el.innerText);




    console.log(folderName);

    // FROM HERE

    await page.waitForSelector('.gF.gK .gD');
    var main_check = await page.evaluate(() => {
        var help = [];
        var help2 = [];
        [...document.querySelectorAll(".gF.gK .gD")].map((el) => (help.push(el.getAttribute('email'))));
        [...document.querySelectorAll(".gF.gK .gD")].map((el) => (help2.push(el.textContent)));
        return [help, help2];
    });
    var main_emails = main_check[0];
    var main_names = main_check[1];
    var email_address;
    var full_name;
    if (main_emails.length == 1) {
        email_address = main_emails[0].toLowerCase();
        full_name = main_names[0];
    } else {
        for (h = 0; h < main_emails.length; h++) {
            //if (main_emails[h] != receiver_email) {
            if (main_emails[h] != personaEmail) {
                email_address = main_emails[h].toLowerCase();
                full_name = main_names[h];
                break;
            }
        }
    }
    var other_emails = await page.evaluate(() => {
        var cc_emails = [];
        [...document.querySelectorAll(".iw.ajw span span")].map((el) => (cc_emails.push(el.getAttribute('email'))));
        return cc_emails;
    });
    var filtered_other_emails = [];
    for (j = 0; j < other_emails.length; j++) {
        if (config.excludemails.includes(other_emails[j].toLowerCase()) == false && other_emails[j] != email_address && filtered_other_emails.includes(other_emails[j].toLowerCase()) == false) {
            filtered_other_emails.push(other_emails[j].toLowerCase());
        }
    }
    var mail_subject = await page.$eval(".hP", mail_subject => mail_subject.textContent);
    mail_subject = mail_subject.replace("RE: ", "").replace("Re: ", "").replace("AW: ", "");
    final_other_emails = filtered_other_emails.join(", ");
    if (config.excludemails.includes(email_address)) {
        try {
            email_string = await page.$eval(".ii.gt div div div div div ", text => text.textContent);
            var foundEmails = [];
            var emailRegex = /(([^<>()[\]\\.,;:\s@\"]+(\.[^<>()[\]\\.,;:\s@\"]+)*)|(\".+\"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))/;
            while (match = emailRegex.exec(email_string)) {
                foundEmails.push(match[0]);
                email_string = email_string.replace(match[0], "")
            }
            email_address = foundEmails[0];
            full_name = "unknown";
        } catch (e) {
            email_address = await page.url();
            full_name = "unknown";
        }
    }
    let messageData = [[email_address, full_name, final_other_emails, folderName.replace('Notinterested/', ''), persona, utc, mail_subject]];
    return messageData;
}


async function messagesParser(page, query, persona, personaEmail) {
    //let query2 = "https://mail.google.com/mail/u/0/#search/label%3A(notintesrect)+AND+label%3Aunread";
    await page.goto(query, { 'waitUntil': 'load' });
    try {
        await page.waitForSelector('table.zt', { timeout: 10000 });
        let massegeTables = await page.$$('table.zt');
        let lastTableMessages = await massegeTables[massegeTables.length - 1].$$('.zA');
        if (lastTableMessages.length == 0) {
            console.log("Messages not found");
            return false;
        }
        console.log("Messages Found");
        await page.waitForTimeout(10000);
        await lastTableMessages[0].click();
        await page.waitForTimeout(10000);
        isLastMessage = false;

        await page.waitForSelector(selectors.nextMsgBtn, { timeout: 0 });

        while (true) {
            // DO STUFF HERE
            await page.waitForTimeout(3000);
            let messageInfo = await getMessageInfo(page, persona, personaEmail);
            await updateSheets(messageInfo);
            // save to google sheet
            console.log(messageInfo);
            let arrowIndex = await page.$eval(selectors.nextMsgBtn, el => el.parentElement.tabIndex);
            await page.waitForTimeout(2000);
            //readline.question('Go to next message?\n');
            //await page.waitForTimeout(300000);
            if (arrowIndex == 0) {
                await page.click(selectors.nextMsgBtn);
                await page.waitForTimeout(3000);
            } else {
                console.log('thats all');
                break;
            }

        }

        await page.waitForTimeout(5000);
        return;

    } catch (e) {
        console.log(e);
        console.log("Messages not found");
        return false;
    }
}



(async () => {
    for (let account of accounts) {
        const browser = await puppeteer.launch({
            headless: false,
            userDataDir: `chromeCache/${account.cacheFolder}`,
            args: ['--no-sandbox',],
            headless: false,
            ignoreHTTPSErrors: true,
            executablePath: executablePath(),
            slowMo: 50
        });
        const pages = await browser.pages();
        const page = await pages[0];
        await page.setDefaultNavigationTimeout(0);

        await login(page, account.email, account.password);
        await page.waitForTimeout(10000);
        await messagesParser(page, account.query, account.fullname, account.email);
        // await page.goto('https://www.youtube.com/', 'waitUntil':'load');
        await page.waitForTimeout(100000000);
    }

})();