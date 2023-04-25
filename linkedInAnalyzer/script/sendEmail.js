const nodemailer = require("nodemailer");


async function sendEmail(content, files, emailConfig) {
    let testAccount = await nodemailer.createTestAccount();
    let transporter = nodemailer.createTransport({
        host: "rocket-cms2.hostsila.org",
        port: 465,
        secure: true,
        auth: {
            user: "tools@whale-tool.com",
            pass: "Kitrum88*"
        },
    });
    try {
        emailInfo = await transporter.sendMail({
            from: '"KITRUM Tools 🐳" <tools@whale-tool.com>',
            to: emailConfig.recipients,
            subject: emailConfig.emaiSubject,
            html: content,
            attachments: files
            
        });
        return true;
    } catch (e) {
        return false;
    }
}


async function getAttachments(resultJson) {
    let attachments = [];

    let ts = Date.now();
    let date_ob = new Date(ts);
    let date = date_ob.getDate();
    let month = date_ob.getMonth() + 1;
    let year = date_ob.getFullYear();
    let dateString = year + "-" + month + "-" + date;


    for (let key of Object.keys(resultJson)) {
        attachments.push({
            filename: `${key}-${dateString}.csv`,
            content: resultJson[key]["csv_content"],
        });
    }
    return attachments;
}


async function getEmailTemplate(resultJson, unformattedTemplate) {
    let formattedTempate = unformattedTemplate.replaceAll("'", '"');
    let keysList = Object.keys(resultJson);
    let variable1;
    let variable2;
    if (keysList.length == 1) {
        variable1 = keysList[0];
        variable2 = 'file';
    } else {
        variable1 = keysList.join("/");
        variable2 = 'files';
    }
    formattedTempate = formattedTempate.replaceAll('[variable1]', variable1);
    formattedTempate = formattedTempate.replaceAll('[variable2]', variable2);
    return formattedTempate;
}

async function emailHandler(resultJson, emailConfig) {
    let emailTemplate = await getEmailTemplate(resultJson, emailConfig.emailTemplate);
    let attachments = await getAttachments(resultJson);
    let isSent = await sendEmail(emailTemplate, attachments, emailConfig);
    return isSent;
}

module.exports = { emailHandler };