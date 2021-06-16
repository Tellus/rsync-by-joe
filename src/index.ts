import * as core from '@actions/core';
import * as io from '@actions/io';
import * as exec from '@actions/exec';
import { addSSLKeyToAgent, writeIdentityFile, writeKnownHosts } from './ssh';

interface BinaryPaths {
  rsync: string;

  ssh: string;

  ssh_keyscan: string;
  
  ssh_add:string;
}

async function checkForAllTools(knownBins:Partial<BinaryPaths> = {}): Promise<BinaryPaths> {
  core.info('Checking for necessary binaries...');

  try {
    const bins = {
      rsync: await io.which(knownBins.rsync || 'rsync', true),
      ssh: await io.which(knownBins.ssh || 'ssh', true),
      ssh_keyscan: await io.which(knownBins.ssh || 'ssh-keyscan', true),
      ssh_add: await io.which(knownBins.ssh_add || 'ssh-add', true),
    };
    
    core.info('All binaries OK!');

    return bins;
  } catch (err) {
    core.setFailed(`One or more tools are missing from the system: ${JSON.stringify(err)}`);
    throw err;
  }
}

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
    const rsyncPath = core.getInput('rsync_path', { required: false });
    
    core.info(`Checking for executables...`);
    const bins = await checkForAllTools({
      rsync: rsyncPath || 'rsync',
    });
    const rsync:string = bins.rsync;

    let rsyncArgs:string[] = core.getMultilineInput('rsync_args');

    const sourcePath:string = core.getInput('source', { required: true });
    const destPath:string = core.getInput('dest', { required: true });

    const hostAddr:string = core.getInput('host', { required: true });
    const hostPort = core.getInput('port');
    const fingerprint = core.getInput('ssh_host_fingerprint');
    const username:string = core.getInput('username', { required: true });
    const ssh_key:string = core.getInput('ssh_key', { required: true });
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

    const returnCode = await exec.exec(rsync, rsyncArgs.concat(), {
      env: {
        ... process.env,
        // Using this env var right now before the same option in rsync (-e)
        // seems to be buggy.
        RSYNC_RSH: `${bins.ssh} -o "UserKnownHostsFile=${knownhostsPath}" -i ${identityFile}`
      }
    });

    if (returnCode != 0) {
      core.setFailed(`An error occurred while running rsync. Check your logs for more information.`)
    }

    // const ms = core.getInput('milliseconds');
    // core.info(`Waiting ${ms} milliseconds ...`);

    // core.info((new Date()).toTimeString()); // debug is only output if you set the secret `ACTIONS_RUNNER_DEBUG` to true
    // await wait(parseInt(ms));
    // core.info((new Date()).toTimeString());

    // core.setOutput('time', new Date().toTimeString());
  } catch (error) {
    core.setFailed(error.message);
  }
}
run();