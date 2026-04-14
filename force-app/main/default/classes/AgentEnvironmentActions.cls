/**
 * @description Senior Architect version of Agentforce Action.
 * Handles: Null checks, 15/18 char OrgID validation, '00D' prefix enforcement, 
 * and simulated database exclusion (Blacklisting).
 */

public with sharing class AgentEnvironmentActions {

    @InvocableMethod(
        label='Run Environment Health Check' 
        description='Triggers a remote fix for a specific Salesforce OrgID via the Heroku Engine. Handles validation and error mapping.'
        category='Agentforce Actions'
    )
    public static List<ActionResult> performOrgHealthCheck(List<ActionRequest> requests) {
        List<ActionResult> results = new List<ActionResult>();
        
        for (ActionRequest req : requests) {
            ActionResult res = new ActionResult();

            // --- SCENARIO 1: NULL OR EMPTY INPUT ---
            if (req == null || String.isBlank(req.orgId)) {
                res.status = 'Error';
                res.message = 'I cannot proceed without a Salesforce Org ID. Please provide your 15 or 18-digit ID starting with 00D.';
                results.add(res);
                continue; 
            }

            String cleanId = req.orgId.trim();

            // --- SCENARIO 2: INVALID SALESFORCE FORMAT ---
            // Validating that it starts with '00D' and meets SF length requirements
            Boolean isValidPrefix = cleanId.startsWithIgnoreCase('00D');
            Boolean isValidLength = (cleanId.length() == 15 || cleanId.length() == 18);

            if (!isValidPrefix || !isValidLength) {
                res.status = 'Error';
                res.message = 'The ID provided (' + cleanId + ') does not follow the Salesforce Org ID format. It must start with "00D" and be 15 or 18 characters long.';
                results.add(res);
                continue;
            }

            // --- SCENARIO 3: VALID FORMAT BUT INVALID DATA (BLACKLIST/00D000) ---
            // This simulates a 'Source of Truth' check where the Org exists but is inactive/expired.
            if (cleanId.contains('00D000000000000')) {
                res.status = 'Error';
                res.message = 'Validation Failed: Org ' + cleanId + ' is flagged as an expired or unauthorized sandbox. Please contact Support for a new environment.';
                results.add(res);
                continue;
            }

            // --- SCENARIO 4: THE HAPPY PATH (INTEGRATION HANDOFF) ---
            try {
                // ARCHITECT NOTE: In a live env, this triggers a Named Credential Callout to Heroku
                // For this Agentforce POC, we return a success signal to the LLM.
                res.status = 'Success';
                res.message = 'Verification Complete. Health check [TXN-' + Integer.valueOf(Math.random() * 10000) + '] initiated for Org ' + cleanId.toUpperCase() + '. Tell the student to refresh in 60 seconds.';
            } catch (Exception e) {
                // --- SCENARIO 5: SYSTEM EXCEPTION (MIDDLEWARE DOWN) ---
                res.status = 'Error';
                res.message = 'System Exception: The health check engine is currently unreachable. Error Detail: ' + e.getMessage();
            }

            results.add(res);
        }
        return results;
    }

    /* Input Structure defined for the Agent Reasoning Engine */
    public class ActionRequest {
        @InvocableVariable(label='Salesforce Org ID' required=true description='The 15 or 18-digit Org ID starting with 00D')
        public String orgId;
    }

    /* Output Structure to give the Agent specific context for its response */
    public class ActionResult {
        @InvocableVariable(label='Response Message' description='The feedback to be summarized by the AI')
        public String message;
        
        @InvocableVariable(label='Status' description='The logical outcome: Success or Error')
        public String status;
    }
}