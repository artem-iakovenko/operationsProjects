const axios = require('axios');
let requestConfig;


function sleep(ms) {
    return new Promise((resolve) => {
        setTimeout(resolve, ms);
    });
}


async function parseLinkedinUrl(unformattedUrl) {
    if (unformattedUrl[unformattedUrl.length - 1] == '/') {
        return unformattedUrl.slice(0, -1);
    }
    return unformattedUrl;
}

async function getAccessToken(crmConfig) {
    refreshUrl = `https://accounts.zoho.com/oauth/v2/token?refresh_token=${crmConfig.refreshToken}&client_id=${crmConfig.clientId}&client_secret=${crmConfig.clientSecret}&grant_type=refresh_token`
    let response = await axios.post(refreshUrl);
    if (response.status == 200) {
        return response.data.access_token;
    }
    return false;
}

async function getDataFromCv(cvModule, crmConfig) {
    let allRecords = [];
    let page = 1;
    while (true) {
        let pageData = [];
        try {
            let moduleUrl;
            if (cvModule == 'potentials') {
                moduleUrl = `${crmConfig.potentialsUrl}${crmConfig.potentialsCvId}&per_page=200&page=${page}`;
            } else if (cvModule == 'leads') {
                moduleUrl = `${crmConfig.leadsUrl}${crmConfig.leadsCvId}&per_page=200&page=${page}`;
            }
            let response = await axios.get(moduleUrl, requestConfig);
            let pageData = response.data.data;
            allRecords.push.apply(allRecords, pageData);
        } catch (e) {
            pageData = [];
        }
        if (pageData.length < 200) {
            break;
        }
        page += 1;
    }
    return allRecords;
}


async function getPotentialsExtraInfo(crmConfig, potentials, onlyJobs) {
    console.log('a');
    let potentialsMap = {};
    let potentialCounter = 1;
    for (let potential of potentials) {
        potentialCounter += 1;
        let potentialData = {};
        try {
            let potentialUrl = `${crmConfig.potentialsUrlByID}` + potential.id;
            let response = await axios.get(potentialUrl, requestConfig);
            potentialData = response.data.data[0];
            let potentialName = potentialData.Deal_Name;

            let salesOwner = potentialData.Owner_of_Potential;
            salesOwner = salesOwner == null ? "" : salesOwner;
            let deliveryOwner = potentialData.Potential_Delivery_Owner;
            deliveryOwner = deliveryOwner == null ? "" : deliveryOwner;
            let potentialAccId = potentialData.Account_Name.id;
            let accountDetailsResponse = await axios.get(`${crmConfig.accountDetailsUrl}` + potentialAccId, requestConfig);
            let accountDetailsData = accountDetailsResponse.data.data[0];
            let accountLinkedIn = false;
            if (accountDetailsData.Account_LinkedIn_Url !== null) {
                accountLinkedIn = await parseLinkedinUrl(accountDetailsData.Account_LinkedIn_Url);
            }


            if (onlyJobs) {
                potentialData = {
                    "name": potentialName,
                    "accountLinkedIn": accountLinkedIn
                };
                potentialsMap[potential.id] = potentialData;
                console.log(potentialData);
                continue;
            }

            let potentialContacts = [];
            let relatedContactsFieldsUrl = `${crmConfig.potentialsUrlByID}` + potential.id + `${crmConfig.relatedFieldsSuffixUrl}`;
            let responseContactsRelatedFields = await axios.get(relatedContactsFieldsUrl, requestConfig);
            let contactsData = responseContactsRelatedFields.data.data;
            try {
                for (let contactItem of contactsData) {
                    let contactLinkedIn = false;
                    if (contactItem.Contact_LinkedIn_Url !== null) {
                        contactLinkedIn = await parseLinkedinUrl(contactItem.Contact_LinkedIn_Url);
                    }
                    let contactsObj = {
                        "contactId": contactItem.id,
                        "contactName": contactItem.First_Name + " " + contactItem.Last_Name,
                        "contactLinkedIn": contactLinkedIn
                    };
                    potentialContacts.push(contactsObj);
                }
            } catch (e) {
                // skip
            }
            potentialData = {
                "name": potentialName,
                "accountLinkedIn": accountLinkedIn,
                "salesOwner": salesOwner,
                "deliveryOwner": deliveryOwner,
                "contacts": potentialContacts
            };
            potentialsMap[potential.id] = potentialData;
        } catch (e) {
            continue;
        }
    }
    return potentialsMap;
}


async function getLeadsExtraInfo(crmConfig, leads) {
    let allLeads = {};
    let leadCounter = 1;
    for (let lead of leads) {
        leadCounter += 1;
        try {
            let leadData = {};
            let contactId = lead.id;
            let contactName = lead.First_Name + " " + lead.Last_Name;
            let contactLinkedIn = false;
            if (lead.Contact_LinkedIn_Url !== null) {
                contactLinkedIn = await parseLinkedinUrl(lead.Contact_LinkedIn_Url);
            }
            let accountId = lead.Account_Name.id;
            let accountName = lead.Account_Name.name;
            let accountDetailsResponse = await axios.get(`${crmConfig.accountDetailsUrl}` + accountId, requestConfig);
            let accountDetailsData = accountDetailsResponse.data.data[0];
            let accountLinkedIn = false;
            if (accountDetailsData.Account_LinkedIn_Url !== null) {
                accountLinkedIn = await parseLinkedinUrl(accountDetailsData.Account_LinkedIn_Url);
            }
            leadData = {
                "name": accountName,
                "accountLinkedIn": accountLinkedIn,
                "contacts": [
                    {
                        "contactId": contactId,
                        "contactName": contactName,
                        "contactLinkedIn": contactLinkedIn
                    }
                ]
            };
            allLeads[accountId] = leadData;
        } catch (e) {
            continue;
        }
    }
    return allLeads;
}


async function getInputData(crmConfig, menuOption, onlyJobs) {
    let accessToken = await getAccessToken(crmConfig);
    requestConfig = { headers: { "Authorization": `Zoho-oauthtoken ${accessToken}` } };
    if (!accessToken) {
        return false;
    }
    let returnMap = {};
    let potentials;
    let fullPotentialsInfo;
    let leads;
    let fullLeadsInfo;
    if (menuOption == "1") {
        potentials = await getDataFromCv("potentials", crmConfig);
        fullPotentialsInfo = await getPotentialsExtraInfo(crmConfig, potentials, onlyJobs);
        returnMap['potentials'] = fullPotentialsInfo;
    } else if (menuOption == "2") {
        leads = await getDataFromCv("leads", crmConfig);
        fullLeadsInfo = await getLeadsExtraInfo(crmConfig, leads);
        returnMap['leads'] = fullLeadsInfo;
    } else if (menuOption == "3") {
        potentials = await getDataFromCv("potentials", crmConfig);
        fullPotentialsInfo = await getPotentialsExtraInfo(crmConfig, potentials, onlyJobs);
        returnMap['potentials'] = fullPotentialsInfo;
        leads = await getDataFromCv("leads", crmConfig);
        fullLeadsInfo = await getLeadsExtraInfo(crmConfig, leads);
        returnMap['leads'] = fullLeadsInfo;
    } else if (menuOption == "4") {
        potentials = await getDataFromCv("potentials", crmConfig);
        fullPotentialsInfo = await getPotentialsExtraInfo(crmConfig, potentials, onlyJobs);
        returnMap['potentials'] = fullPotentialsInfo;

    } else {
        returnMap = false;
    }
    return returnMap;
}


async function updater(jsonResObj) {
    let date_ob = new Date();
    let date = ("0" + date_ob.getDate()).slice(-2);
    let month = ("0" + (date_ob.getMonth() + 1)).slice(-2);
    let year = date_ob.getFullYear();
    let currentDate = year + "-" + month + "-" + date;
    for (let key of Object.keys(jsonResObj)) {
        let apiUrl = "";
        if(key === "potentials") {
            apiUrl = 'https://www.zohoapis.com/crm/v2/Deals';
        }
        if(key === "leads") {
            apiUrl = 'https://www.zohoapis.com/crm/v2/Contacts';
        }
        let recordsToUpd = jsonResObj[key].records_to_update;
        let objArrToUpd = [];

        for (let recordId of recordsToUpd) {
            let updObj = {
                'id': recordId,
                'Last_Li_Checked_Date': currentDate
            }

            objArrToUpd.push(updObj);
        }

        dataObj = {
            'data': objArrToUpd
        }
        await axios.put(apiUrl, dataObj, requestConfig);
    }
}


async function updateRecords(crmConfig, parsedData) {
    try {
        let accessToken = await getAccessToken(crmConfig);
        requestConfig = { headers: { "Authorization": `Zoho-oauthtoken ${accessToken}` } };
        await updater(parsedData);
        return true;
    } catch (e) {
        return false;
    }

}

module.exports = { getInputData, updateRecords};