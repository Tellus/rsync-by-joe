import * as core from '@actions/core';
import * as exec from '@actions/exec';
import { writeIdentityFile, writeKnownHosts, useDecryptedKey } from './ssh';
import { getToolPaths } from 'tools';

function inputOrDefault<T extends string | string[] | boolean>(key:string, dflt:T):T {
  if (Array.isArray(dflt)) {   
    const input = core.getMultilineInput(key, { required: false });

    return (input.length > 0 ? input : dflt) as T;
  } else if (typeof dflt === 'string') {
    return (core.getInput(key, { required: false }) || dflt) as T;
  } else if (typeof dflt === 'boolean') {
    return (core.getBooleanInput(key, { required: false }) || dflt) as T;
  } else throw new Error(`Unsupported input type in default value.`);
}

// most @actions toolkit packages have async methods
async function run() {
  try {
    core.info('Checking for necessary binaries...');
    const bins = await getToolPaths();
    core.info('All binaries OK!');
    const rsync:string = bins.rsync;

    let rsyncArgs:string[] = core.getMultilineInput('rsync_args');

    const sourcePath:string = core.getInput('source', { required: true });
    const destPath:string = core.getInput('dest', { required: true });

    const hostAddr:string = core.getInput('host', { required: true });
    const hostPort = core.getInput('port');
    const fingerprint = core.getInput('ssh_host_fingerprint');
    const username:string = core.getInput('username', { required: true });
    const ssh_key:string = core.getInput('ssh_key', { required: true, trimWhitespace: false });
    const ssh_passkey:string = core.getInput('ssh_passkey');

    const knownhostsPath = await (fingerprint ? writeKnownHosts(fingerprint) : writeKnownHosts({ host: hostAddr, port: hostPort }));

    const identityFile = await writeIdentityFile(ssh_key);

    // Add regular arguments.
    rsyncArgs = rsyncArgs.length > 0 ? rsyncArgs : ['-avzr', '--delete', '--mkpath'];

    // Add optional port.
    if (hostPort)
      rsyncArgs.push(`--port=${hostPort}`);
    
    // Add source/destination.
    rsyncArgs.push(sourcePath);
    rsyncArgs.push(`${username}@${hostAddr}:${destPath}`);

    var returnCode;

    if (ssh_passkey) {
      // Encrypted key. Remove password first.
      returnCode = await useDecryptedKey(identityFile, ssh_passkey, identityFilePath => {
        return exec.exec(rsync, rsyncArgs.concat(), {
          env: {
            ... process.env,
            // Using this env var right now before the same option in rsync (-e)
            // seems to be buggy when called with exec().
            RSYNC_RSH: `${bins.ssh} -o "UserKnownHostsFile=${knownhostsPath}" -i ${identityFilePath}`
            // RSYNC_RSH: `${bins.ssh} -o "UserKnownHostsFile=${knownhostsPath}"`
          }
        });
      });
    } else {
      // Unencrypted key. Use as-is.
      returnCode = await exec.exec(rsync, rsyncArgs.concat(), {
        env: {
          ... process.env,
          // Using this env var right now before the same option in rsync (-e)
          // seems to be buggy when called with exec().
          RSYNC_RSH: `${bins.ssh} -o "UserKnownHostsFile=${knownhostsPath}" -i ${identityFile}`
        }
      });
    }

    if (returnCode != 0) {
      core.setFailed(`An error occurred while running rsync. Check your logs for more information.`)
    }
  } catch (error) {
    core.setFailed(error.message);
  }
}
run();