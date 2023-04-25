function parseJsonItem(moduleName, itemJson) {
    let csvHeader = "";
    let moduleZohoLink = "";
    let contactsZohoLink = "https://crm.zoho.com/crm/org55415226/tab/Contacts/";
    if (moduleName === "Potentials") {
        moduleZohoLink = "https://crm.zoho.com/crm/org55415226/tab/Potentials/";
        csvHeader = "Module;Potential Name;Sales Owner;Delivery Owner;LinkedIn Section;Result;Keywords/Technologies;Contact Name;\n";
    }
    if (moduleName === "Leads") {
        moduleZohoLink = "https://crm.zoho.com/crm/org55415226/tab/Accounts/";
        csvHeader = "Module;Account Name;LinkedIn Section;Result;Keywords/Technologies;Contact Name;\n";
    }
    let csvContent = csvHeader;
    recordsToUpdate = [];
    for (let key of Object.keys(itemJson)) {
        let itemId = key;
        let itemJsonObject = itemJson[itemId];
        let itemName = itemJsonObject.name;

        //Link to Account or to Potential
        let itemCsvLink = "=HYPERLINK(" + "\"" + moduleZohoLink + itemId + "\", " + "\"" + itemName + "\" )";
        let tableRowPrefix;
        //tableRowPrefix = moduleName + ";" + itemCsvLink + ";";

        if (moduleName === "Potentials") {
            recordsToUpdate.push(itemId);
            tableRowPrefix = moduleName + ";" + itemCsvLink + ";" + itemJsonObject.salesOwner + ";" + itemJsonObject.deliveryOwner + ";";
        }
        if (moduleName === "Leads") {
            //Only one contact for Lead
            let itemContact = itemJsonObject['contacts'][0];
            recordsToUpdate.push(itemContact.contactId);
            tableRowPrefix = moduleName + ";" + itemCsvLink + ";";
        }




        let itemJobs = itemJsonObject['jobs'];

        //JOBS
        for (let jobItem of itemJobs) {
            let tableRow = "";

            tableRow += tableRowPrefix + "Jobs" + ";";

            let jobCsvLink = "=HYPERLINK(" + "\"" + jobItem.jobLink + "\" , \"" + jobItem.jobTitle + "\" )";

            if (moduleName === "Potentials") {
                tableRow += jobCsvLink + ";" + jobItem.technologies + ";- \n";
            }
            if (moduleName === "Leads") {
                //Only one contact for Lead
                let itemContact = itemJsonObject['contacts'][0];
                let contactCsvLink = "=HYPERLINK(" + "\"" + contactsZohoLink + itemContact.contactId + "\" , \"" + itemContact.contactName + "\" )";
                tableRow += jobCsvLink + ";" + jobItem.technologies + ";" + contactCsvLink + "\n";
            }

            //write row to csv
            //fs.appendFileSync(fileToWrite, tableRow);
            csvContent += tableRow;
        }

        //CONTACTS
        let itemContacts = itemJsonObject['contacts'];

        for (let contactItem of itemContacts) {
            let contactLink = "=HYPERLINK(" + "\"" + contactsZohoLink + contactItem.contactId + "\", \"" + contactItem.contactName + "\" )";

            //FEATURED
            let contactFeatured = contactItem['featured'];

            for (let featuredItem of contactFeatured) {
                let tableRow = "";

                tableRow += tableRowPrefix + "Featured" + ";";

                let featureCsvLink = "=HYPERLINK(" + "\"" + featuredItem.link + "\"" + ", " + "\"" + featuredItem.name + "\"" + ")";

                tableRow += featureCsvLink + ";" + featuredItem.keywordsFound + ";" + contactLink + "; \n";
                csvContent += tableRow;
            }

            //ACTIVITIES
            let contactActivities = contactItem['activity'];

            for (let activityItem of contactActivities) {
                let tableRow = "";

                tableRow += tableRowPrefix + "Activities" + ";";
                let activityName = "Profile Activity URL";

                let activityCsvLink = "=HYPERLINK(" + "\"" + activityItem.link + "\"" + ", " + "\"" + activityName + "\"" + ")";


                tableRow += activityCsvLink + ";" + activityItem.keywordsFound + ";" + contactLink + "; \n";

                csvContent += tableRow;
            }
        }
    }


    let resultObj = {
        "csv_content": csvContent,
        "records_to_update": recordsToUpdate
    }

    return resultObj;
}



function writeJSONToCsv(jsonObject) {
    potentialsCsvContent = null;
    leadsCsvContent = null;
    resultJson = {};

    for (let key of Object.keys(jsonObject)) {
        if (key === "potentials") {
            potentialsCsvContent = parseJsonItem("Potentials", jsonObject[key]);
        }
        if (key === "leads") {
            leadsCsvContent = parseJsonItem("Leads", jsonObject[key]);
        }
    }

    if (potentialsCsvContent !== null) {
        resultJson['potentials'] = potentialsCsvContent;
    }

    if (leadsCsvContent !== null) {
        resultJson['leads'] = leadsCsvContent;
    }
    return resultJson;
}

module.exports = { writeJSONToCsv };