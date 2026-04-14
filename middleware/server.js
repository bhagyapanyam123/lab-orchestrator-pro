const shell = require('shelljs');
const { Connection } = require('jsforce');

async function createLab(labId, studentEmail) {
    // 1. JWT Auth to the Dev Hub
    shell.exec(`sf org login jwt --client-id ${process.env.SF_CLIENT_ID} --jwt-key-file server.key --username ${process.env.SF_HUB_USER} --instance-url https://login.salesforce.com`);

    // 2. Create the Scratch Org (The "Worker")
    const alias = `lab_${labId}`;
    const createResult = shell.exec(`sf org create scratch -f config/project-scratch-def.json -a ${alias} --duration-days 1 --json`);

    if (createResult.code !== 0) throw new Error('Org Creation Failed');

    // 3. Deploy Metadata (Agentforce Actions, Prompt Templates)
    shell.exec(`sf project deploy start -u ${alias}`);

    // 4. Capture Login URL
    const orgInfo = JSON.parse(shell.exec(`sf org display -u ${alias} --json`, {silent:true}));
    const loginUrl = orgInfo.result.instanceUrl;

    // 5. Update the Hub Org Record via JSForce
    const conn = new Connection({ /* JWT Auth Params */ });
    await conn.sobject('Lab_Session__c').update({ Id: labId, Login_URL__c: loginUrl, Status__c: 'Active' });
}