const config = require('./config.json');
const puppeteer = require('puppeteer-extra');
const readline = require('readline-sync');
const { executablePath } = require('puppeteer')


const StealthPlugin = require('puppeteer-extra-plugin-stealth');
puppeteer.use(StealthPlugin());
const keys = require('./keys.json');
const { google } = require('googleapis');

const client = new google.auth.JWT(
    keys.client_email,
    null,
    keys.private_key, ['https://www.googleapis.com/auth/spreadsheets']
);
const gsapi = google.sheets({ version: 'v4', auth: client });



async function getCompanies(startIndex) {
    const sheetData = await gsapi.spreadsheets.values.get({
        spreadsheetId: config.spreadsheetId,
        range: `Links!A${startIndex}:A`,
        majorDimension: 'COLUMNS'
    });
    let links;
    try {
        links = sheetData.data.values[0];
        return links;
    } catch (e) {
        return false;
    }
}


async function loginVerify(page) {
    await page.goto(config.loginUrl), { waitUntil: 'domcontentloaded' };
    //console.log('Please, Log In and make sure that you are on Home Page!');
    await page.waitForSelector('.user-info', { visible: true, timeout: 0 });
    await page.waitForTimeout(5000);
    console.log('Login Status: Success');
}



async function getFounders(section) {
    let founders = [];
    let foundersElement = await section.$x("//li[contains(., 'Founders')]");
    let foundersContent;
    try {
        foundersContent = await foundersElement[0].$$('a[href*="/person/"]');
    } catch (e) {
        foundersContent = [];
    }
    for (const founder of foundersContent) {
        founderName = await founder.evaluate(el => el.innerText);
        founderName[0] == ' ' ? founderName = founderName.substring(1) : founderName = founderName;
        founderLink = await founder.evaluate(el => el.href);
        founders.push([
            founderName,
            'founders',
            founderLink,
            'Founder',
            ''
        ]);
    }
    return founders;
}


async function getPeople(page) {
    let allPeople = [];
    let contactsIdentifier = await page.$('#contacts');
    let employeesIdentifier = await page.$('#current_employees');
    let advisorsIdentifier = await page.$('#advisors');


    let allEmployees;
    try {
        let employeesSection = await page.evaluateHandle(el => el.nextSibling, employeesIdentifier);
        allEmployees = await employeesSection.$$('li .fields');
    } catch (e) {
        allEmployees = []
    }
    for (const employee of allEmployees) {
        let employeeName = await employee.$eval('a[href*="/person/"]', el => el.innerText);
        let employeeLink = await employee.$eval('a[href*="/person/"]', el => el.href);
        let emplopyeeTitle = await employee.$eval('span', el => el.innerText);
        allPeople.push([
            employeeName,
            'employees',
            employeeLink,
            emplopyeeTitle,
            ''
        ]);
    }

    let allContacts;
    try {
        let contactsSection = await page.evaluateHandle(el => el.nextSibling, contactsIdentifier);
        allContacts = await contactsSection.$$('contacts-card-row');
    } catch (e) {
        allContacts = [];
    }

    for (const contact of allContacts) {
        let contactName = await contact.$eval('.name', el => el.innerText);
        let contactLinkedIn;
        try {
            contactLinkedIn = await contact.$eval('a[href*="linkedin"]', el => el.href);
        } catch (e) {
            contactLinkedIn = '';
        }
        let contactTitle;
        try {
            contactTitle = await contact.$eval('.job-title', el => el.innerText);
        } catch (e) {
            contactTitle = '';
        }
        allPeople.push([
            contactName,
            'contacts',
            '',
            contactTitle,
            ''
        ]);
    }

    let allAdvisors;
    try {
        let advisorsSection = await page.evaluateHandle(el => el.nextSibling, advisorsIdentifier);
        allAdvisors = await advisorsSection.$$('li');
    } catch (e) {
        allAdvisors = [];
    }

    for (const advisor of allAdvisors) {
        let advisorName = await advisor.$eval('a[href*="/person/"]', el => el.innerText);
        let advisorLink = await advisor.$eval('a[href*="/person/"]', el => el.href);
        let advisorTitle = await advisor.$eval('span', el => el.innerText);
        allPeople.push([
            advisorName,
            'advisors',
            advisorLink,
            advisorTitle,
            ''
        ]);
    }
    return allPeople;
}


async function titleChecker(title) {
    lc_title = title.toLowerCase();
    if (lc_title.includes('sales') || lc_title.includes('marketing') || lc_title.includes('finance')) {
        return false;
    }

    for (const word of config.titleKeywords) {
        if (lc_title.includes(word)) {
            return true;
        }
    }
    if (lc_title.includes('vp') || lc_title.includes('vice president') || lc_title.includes('director') || lc_title.includes('head')) {
        for (const word of config.jobFunctions) {
            if (lc_title.includes(word)) {
                return true;
            }
        }
    }
    if (lc_title.includes('product')) {
        return true;
    }
    return false;
    //return false
}


async function filterContacts(contacts) {
    let relevantContacts = [];
    let res = [];
    for (const contact of contacts) {
        let contactName = contact[0];
        let contactRoute = contact[1];
        if (!relevantContacts.includes(contactName)) {
            relevantContacts.push(contactName);
            let isRelevantTitle = true;
            if (contactRoute == 'employees' || contactRoute == 'contacts') {
                let contactTitle = contact[3];
                isRelevantTitle = await titleChecker(contactTitle);
            }
            contact.push(isRelevantTitle);
            res.push(contact);
        }
    }
    return res;

}


async function getCompenyInfo(about, overview, highligts, faq) {

    let companySize;
    try {
        companySize = await about.$eval('a[href*="/search/people/field/organizations/num_employees_enum/"]', el => el.innerText);
    } catch (e) {
        companySize = ''
    }
    let companyDescription;
    try {
        companyDescription = await about.$eval('.description', el => el.innerText);
    } catch (e) {
        companyDescription = ''
    }

    let locations;

    try {
        locationsUnf = await about.$$eval('a[href*="/search/organizations/field/organizations/location_identifiers/"]', els => els.map(el => el.innerText));
        locations = locationsUnf.join(', ');
    } catch (e) {
        locations = '';
    }

    let ipoStatus;
    try {
        ipoStatus = await about.$eval('[d="M14.4,6L14,4H5v17h2v-7h5.6l0.4,2h7V6H14.4z"]', el => el.closest('li').innerText);
    } catch (e) {
        ipoStatus = '';
    }

    let domain;
    try {
        let website = await about.$eval('[d="M12,2C6.5,2,2,6.5,2,12s4.5,10,10,10s10-4.5,10-10S17.5,2,12,2z M11,19.9c-3.9-0.5-7-3.9-7-7.9c0-0.6,0.1-1.2,0.2-1.8L9,15v1c0,1.1,0.9,2,2,2V19.9z M17.9,17.4c-0.3-0.8-1-1.4-1.9-1.4h-1v-3c0-0.6-0.4-1-1-1H8v-2h2c0.6,0,1-0.4,1-1V7h2c1.1,0,2-0.9,2-2V4.6c2.9,1.2,5,4.1,5,7.4C20,14.1,19.2,16,17.9,17.4z"]', el => el.closest('li').innerText);
        domain = website.replaceAll('https://', '').replaceAll('http://', '').replaceAll('www.', '').replaceAll('/', '');
    } catch (e) {
        domain = '';
    }

    let rank;
    try {
        rank = await about.$eval('a[href*="/search/organization.companies/field/organizations/rank_org_company/"]', el => el.innerText);
    } catch (e) {
        rank = '';
    }
    let lastFundingRound;
    try {
        lastFundingRound = await about.$eval('a[href*="/search/funding_rounds/field/organizations/last_funding_type/"]', el => el.innerText);
    } catch (e) {
        lastFundingRound = '';
    }

    let jobsHyperlink;
    try {
        jobsLink = await about.$eval('a[href*="jobbio"]', el => el.href);
        jobsHyperlink = `=HYPERLINK("${jobsLink}", "Actively Hiring")`;
    } catch (e) {
        jobsHyperlink = '';
    }


    let parentHyperlink;
    try {
        let [acquiredSelector] = await about.$x("//li[contains(., 'Acquired by')]");
        let parentCompanyName = await acquiredSelector.$eval('a[href*="/organization/"]', el => el.innerText);
        let parentCompanyLink = await acquiredSelector.$eval('a[href*="/organization/"]', el => el.href);
        parentHyperlink = `=HYPERLINK("${parentCompanyLink}", "${parentCompanyName}")`;
    } catch (e) { 
        parentHyperlink = '';
    }
 

    let foundedDate;
    try {
        let [foundedDateSelector] = await overview.$x("//li[contains(., 'Founded Date')]");
        foundedDate = await foundedDateSelector.$eval('field-formatter', el => el.innerText);
    } catch (e) {
        foundedDate = '';
    }

    let industries;
    try {    
        let [industriesSelector] = await overview.$x("//li[contains(., 'Industries')]");
        let industriesUnf = await industriesSelector.$$eval('a[href*="/search/organizations/field/organizations/categories/"]', els => els.map(el => el.innerText));
        industries = industriesUnf.join(', ');
    } catch (e) {
        industries = '';
    }

    let operatingStatus;
    try {
        let [operatingStatusSelector] = await overview.$x("//li[contains(., 'Operating Status')]");
        operatingStatus = await operatingStatusSelector.$eval('field-formatter', el => el.innerText);
    } catch (e) {
        operatingStatus = '';
    }


    let companyType;
    try {
        let [companyTypeSelector] = await overview.$x("//li[contains(., 'Company Type')]");
        companyType = await companyTypeSelector.$eval('field-formatter', el => el.innerText);
    } catch (e) {
        companyType = '';
    }

    let contactEmail;
    try {
        let [contactEmailSelector] = await overview.$x("//li[contains(., 'Contact Email')]");
        contactEmail = await contactEmailSelector.$eval('field-formatter', el => el.innerText);
    } catch (e) {
        contactEmail = '';
    }

    let hq;
    try {
        let [hqSelector] = await overview.$x("//li[contains(., 'Headquarters Regions')]");
        hq = await hqSelector.$eval('field-formatter', el => el.innerText);
    } catch (e) {
        hq = '';
    }


    let linkedin;
    let facebook;
    let twitter;
    try {
        linkedin = await overview.$eval('a[href*="linkedin"]', el => el.href);
    } catch (e) {
        linkedin = '';
    }

    try {
        facebook = await overview.$eval('a[href*="facebook"]', el => el.href);
    } catch (e) {
        facebook = '';
    }

    try {
        twitter = await overview.$eval('a[href*="twitter"]', el => el.href);
    } catch (e) {
        twitter = '';
    }

    let revenue;
    try {
        let [revenueSelector] = await overview.$x("//li[contains(., 'Estimated Revenue')]");
        revenue = await revenueSelector.$eval('field-formatter', el => el.innerText);
    } catch (e) {
        revenue = '';
    }


    let lastFundDate;
    try {
        lastFundDate = await faq.$eval('a[href*="/search/funding_rounds/field/organizations/last_funding_at/"]', el => el.innerText);
    } catch (e) {
        lastFundDate = '';
    }

    let investorsQuantity;
    try {
        investorsQuantity = await faq.$eval('a[href*="/search/principal.investors/field/organizations/num_investors/"]', el => el.innerText);
    } catch (e) {
        investorsQuantity = '';
    }
    let totalFunds;
    try {
        totalFunds = await faq.$eval('a[href*="/search/funding_rounds/field/organizations/funding_total/"]', el => el.innerText);
    } catch (e) {
        totalFunds = '';
    }

    return [
        domain,
        linkedin,
        facebook,
        twitter,
        ipoStatus,
        companyDescription,
        companySize,
        revenue,
        parentHyperlink,
        locations,
        lastFundingRound,
        rank,
        jobsHyperlink,
        industries,
        foundedDate,
        operatingStatus,
        companyType,
        contactEmail,
        hq,
        investorsQuantity,
        totalFunds,
        lastFundDate
    ];
}




async function orgParser(page, orgUrl) {
    await page.goto(orgUrl, { waitUntil: 'domcontentloaded' });
    await page.waitForSelector('.profile-name', { visible: true, timeout: 0 });
    let companyName = await page.$eval('.profile-name', companyName => companyName.innerText);
    let profileType = await page.$eval('.profile-type span', profileType => profileType.innerText);

    let aboutSection;
    let overviewSection;
    let highlightsSection;
    let faqSection;

    let aboutSelector, overviewSelector, highlightsSelector, faqSelector;
    if (profileType == 'Organization' || profileType == 'ORGANIZATION') {
        [aboutSelector, overviewSelector, highlightsSelector, faqSelector] = ['#company_overview_about', '#overview_default_view', '#company_overview_highlights', '#frequently_asked_questions'];
    } else if (profileType == 'INVESTMENT FIRM') {
        [aboutSelector, overviewSelector, highlightsSelector, faqSelector] = ['#investor_overview_about', '#overview_investor_view', '#investor_overview_highlights', '#frequently_asked_questions'];
    } else {
        console.log('Unknown Profile Type. Skipping...');
        return 0;
    }

    let aboutIdentifier = await page.$(aboutSelector);
    try {
        aboutSection = await page.evaluateHandle(el => el.nextSibling, aboutIdentifier);
    } catch (e) {
        console.log('No About Section');
    }
    let overviewIdentifier = await page.$(overviewSelector);
    try {
        overviewSection = await page.evaluateHandle(el => el.nextSibling, overviewIdentifier);
    } catch (e) {
        console.log('No Overview Section');
    }
    let highlightsIdentifier = await page.$(highlightsSelector);
    try {
        highlightsSection = await page.evaluateHandle(el => el.nextSibling, highlightsIdentifier);
    } catch (e) {
        console.log('No Highlights Section');
    }
    let faqIdentifier = await page.$(faqSelector);
    try {
        faqSection = await page.evaluateHandle(el => el.nextSibling, faqIdentifier);
    } catch (e) {
        console.log('No FAQ Section');
    }

    let companyInfo = [companyName, orgUrl, profileType].concat(await getCompenyInfo(aboutSection, overviewSection, highlightsSection, faqSection));
    let founders = await getFounders(overviewSection);
    await page.waitForTimeout(7000);
    await page.goto(`${orgUrl}/people`, { waitUntil: 'domcontentloaded' });
    await page.waitForSelector('.profile-content', { visible: true, timeout: 0 });
    await page.waitForTimeout(7000);
    //let founders = await getFounders(overviewSection);
    let people = await getPeople(page);
    let contactsList = founders.concat(people);
    let filteredContacts = await filterContacts(contactsList);
    if (filteredContacts.length > 0) {
        console.log(`${filteredContacts.length} contacts available from ${companyName}`);
        let preparedArray = [];
        for (const contact of filteredContacts) {
            let contactRow = contact.concat(companyInfo);
            preparedArray.push(contactRow);
        }
        return preparedArray;
        //console.log(preparedArray);
    } else {
        console.log(`No Contacs available available from ${companyName}. Skipping this Profile`);
        return false;
    }
}



async function updateSheet(data) {

    const check = await gsapi.spreadsheets.values.get({
        spreadsheetId: config.spreadsheetId,
        range: `Grabber!A1:A`,
    });
    count = check.data.values.length + 1;
    const updateInfo = {
        spreadsheetId: config.spreadsheetId,
        range: `Grabber!A${count}`,
        valueInputOption: 'USER_ENTERED',
        resource: { values: data }
    };
    await gsapi.spreadsheets.values.update(updateInfo);
}




(async () => {
    let startIndex = readline.question('Start Index: ');
    let orgs = await getCompanies(startIndex);
    console.log(`Total Companies Available: ${orgs.length}`);
    if (!orgs) {
        console.log('No Links Found...');
        return;
    }
    
    const browser = await puppeteer.launch({
        args: [
		  '--no-sandbox',
		],
		headless: false,
		ignoreHTTPSErrors: true,
		//add this
		executablePath: executablePath(),
        slowMo: 20,
        userDataDir: "crunch"
    });
    const page = await browser.newPage();
    await loginVerify(page);
    let iterationCounter = 1;
    for (const org of orgs) {
        if (iterationCounter % 100 == 0) {
            await page.waitForTimeout(300000);
        }
        let orgData = await orgParser(page, org);
        if (orgData) {
            await updateSheet(orgData);
        }
        console.log('---------------------------------------');
        iterationCounter += 1;
    }


})();