

const readline = require('readline-sync');
const config = require('../config.json');
//const testUpdate = require('./object.json');

//const potentialsTest = require('../expectedResult.json');
var fs = require("fs");

const crmHandler = require("./getCrmData.js");
const linkedinHandler = require("./linkedinParser.js");
const csvParser = require("./csvParser.js");
const emailSender = require("./sendEmail.js");
const { on } = require('events');



async function mainMenu() {
    let option = readline.question(config.mainMenu);
    while (!config.possibleOptions.includes(option)) {
        option = readline.question(config.mainMenuError);
        if (option == "exit") {
            return "5";
        }
    }
    return option;
}


(async () => {
    let scopesSelection = await mainMenu();
    if (!config.successOptions.includes(scopesSelection)) {
        return;
    }

    let onlyJobs = (config.onlyJobsOptions.includes(scopesSelection)) ? true : false;

    // GET DATA FROM ZOHO CRM
    console.log("===================================================================================");

    console.log("1. Collecting Data from ZOHO CRM");
    let crmDataToCheck = await crmHandler.getInputData(config.crm, scopesSelection, onlyJobs);
    //let crmDataToCheck = potentialsTest;
    if (!crmDataToCheck) {
        console.log("Status: Failure")
        return;
    }
    console.log("Status: Success")
    console.log("===================================================================================");

    
    // COLLECT DATA ON LINKEDIN
    console.log("2. Collect LinkedIn Data");
    let linkedinResults = await linkedinHandler.linkedinLauncher(crmDataToCheck, config.linkedin, onlyJobs);
    if (!linkedinResults) {
        console.log("Status: Failure");
        return;
    }
    console.log("Status: Success");
    console.log("===================================================================================");

    fs.writeFile("./linkedinBackup.json", JSON.stringify(linkedinResults, null, 4), (err) => {
        if (err) {  console.error(err);  return; };
        console.log("File has been created");
    });
    // SEND EMAIL WITH RESULTS
    let parsedData = await csvParser.writeJSONToCsv(linkedinResults);
    let emailSent = await emailSender.emailHandler(parsedData, config.email);
    console.log(`Email Sent?: ${emailSent}`);

    // UPDATE DATE OF CHECKING ON POTENTIALS/LEADS WE CHECKED
    let isUpdated = await crmHandler.updateRecords(config.crm, parsedData);
    if (!isUpdated) {
        console.log("Status: Failure");
        return;
    }
    console.log("Status: Success");
    console.log("===================================================================================");
    

})();