import * as core from '@actions/core';
import * as io from '@actions/io';
import * as exec from '@actions/exec';
import wait from './wait';

async function checkForAllTools(): Promise<void> {
  const promises:Promise<string>[] = [
    io.which('ssh-keyscan', true),
    io.which('ssh-add', true),
    io.which('rsync', true),
  ];

  await Promise.all(promises).catch((err) => core.setFailed(`One or more tools are missing from the system: ${JSON.stringify(err)}`));
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
  await checkForAllTools();

  try {
    const rsyncPath = core.getInput('rsync_path', { required: false });
    
    core.debug(`Checking for rsync executable...`);
    const rsync:string = await io.which(rsyncPath.length > 0 ? rsyncPath : 'rsync');

    const rsyncArgs:string[] = core.getMultilineInput('rsync_args', { required: false });
    const sourcePath:string = core.getInput('source', { required: true });
    const destPath:string = core.getInput('dest', { required: true });
    const username:string = core.getInput('username', { required: true });
    const hostAddr:string = core.getInput('host', { required: true });
    const hostPort = core.getInput('port', { required: false });

    if (hostPort)
      rsyncArgs.push(`--port=${hostPort}`);
    
    rsyncArgs.push(sourcePath);
    rsyncArgs.push(`${username}@${hostAddr}:${destPath}`);

    // Add the remote host's keys to known_hosts so we don't freeze on that.
    // await addHostKey(hostAddr);

    // If we were passed a passkey, attempt to decrypt the private key.

    // Add SSH key to ssh_config.

    const returnCode = await exec.exec(rsync, rsyncArgs.concat());

    if (returnCode != 0) {
      core.setFailed(`An error occurred while running rsync. Check your logs for more information.`)
    }

    // const ms = core.getInput('milliseconds');
    // core.info(`Waiting ${ms} milliseconds ...`);

    // core.debug((new Date()).toTimeString()); // debug is only output if you set the secret `ACTIONS_RUNNER_DEBUG` to true
    // await wait(parseInt(ms));
    // core.info((new Date()).toTimeString());

    // core.setOutput('time', new Date().toTimeString());
  } catch (error) {
    core.setFailed(error.message);
  }
}
run();