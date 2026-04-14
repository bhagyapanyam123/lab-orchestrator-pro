const express = require('express');
const router = express.Router();
const shell = require('shelljs');
const { Connection } = require('jsforce');
require('dotenv').config();

/**
 * POST /api/provision
 * Body: { labId: "a01...", studentEmail: "user@example.com" }
 */
router.post('/', async (req, res) => {
    const { labId, studentEmail } = req.body;
    const alias = `lab_${labId}`;

    // 1. Immediate Validation
    if (!labId || !studentEmail) {
        return res.status(400).json({ error: 'Missing labId or studentEmail' });
    }

    // Send 202 Accepted immediately so the Salesforce Hub doesn't timeout
    res.status(202).json({ message: 'Provisioning sequence initiated' });

    try {
        console.log(`--- Starting Provisioning for Lab: ${labId} ---`);

        // 2. Authenticate to Dev Hub via JWT
        // Uses variables from Heroku Config Vars
        const loginCmd = `sf org login jwt --client-id ${process.env.SF_CLIENT_ID} --jwt-key-file server.key --username ${process.env.SF_HUB_USER} --instance-url https://login.salesforce.com --set-default-dev-hub`;
        
        if (shell.exec(loginCmd).code !== 0) throw new Error('Dev Hub Authentication Failed');

        // 3. Create the Scratch Org
        console.log(`Creating scratch org with alias ${alias}...`);
        const createCmd = `sf org create scratch -f ../config/project-scratch-def.json -a ${alias} --duration-days 1 --json`;
        const createResult = JSON.parse(shell.exec(createCmd, { silent: true }));

        if (!createResult.result) throw new Error('Scratch Org Creation Failed');

        // 4. Deploy Metadata (Agentforce Actions, Flow, etc.)
        console.log('Deploying learning metadata...');
        shell.exec(`sf project deploy start -u ${alias}`);

        // 5. Assign Required Permission Sets (Agentforce Specialist)
        shell.exec(`sf org assign permset -n Agentforce_Specialist -u ${alias}`);

        // 6. Retrieve Org Details for the Hub
        const displayCmd = `sf org display -u ${alias} --json`;
        const orgDetails = JSON.parse(shell.exec(displayCmd, { silent: true }));
        const loginUrl = orgDetails.result.instanceUrl;

        // 7. Callback to Salesforce Hub Org to update the record
        // This closes the loop so the instructor sees the "Active" status
        const conn = new Connection({
            loginUrl: 'https://login.salesforce.com' 
            // In a production scenario, use JWT to get this connection
        });
        
        // Simulating the update to the Hub record
        console.log(`Updating Hub Org record ${labId} with Login URL...`);
        // await conn.sobject('Lab_Session__c').update({ 
        //     Id: labId, 
        //     Status__c: 'Active', 
        //     Login_URL__c: loginUrl 
        // });

        console.log(`--- Provisioning Successful for ${studentEmail} ---`);

    } catch (error) {
        console.error(`CRITICAL ERROR during provisioning: ${error.message}`);
        // Log error back to the Hub Org here so the Escalation Lead (You) can see it
    }
});

module.exports = router;