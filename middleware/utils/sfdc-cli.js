const shell = require(shelljs);

const runCommand = (cmd) => {
    const result = shell.exec(cmd, { silent: false });
    if (result.code !== 0) throw new Error(`Command Failed: ${cmd}`);
    return result;
};

module.exports = {
    authenticate: (clientId, username) => {
        return runCommand(`sf org login jwt --client-id ${clientId} --jwt-key-file ../../server.key --username ${username} --instance-url https://login.salesforce.com`);
    },
    createOrg: (alias) => {
        return runCommand(`sf org create scratch -f ../../config/project-scratch-def.json -a ${alias} --duration-days 1`);
    }
};
