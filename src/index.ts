import * as core from '@actions/core';
import * as exec from '@actions/exec';
import { writeIdentityFile, writeKnownHosts, useDecryptedKey, isProtectedKey } from './ssh';
import { getToolPaths, getTools, ToolsEnum } from 'tools';
import i, { InputsEnum } from './inputsEnum';

import { StringDecoder } from 'string_decoder';
const decoder = new StringDecoder('utf-8');

function inputOrDefault<T extends string | string[] | boolean>(key:InputsEnum, dflt:T):T {
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
    const bins = await getTools();
    const toolPaths = await getToolPaths();
    const rsync = bins.rsync;
    core.info('All binaries OK!');

    let rsyncArgs:string[] = core.getMultilineInput(i.rsync_args);

    var sourcePath:string = core.getInput(i.source, { required: true });

    if (sourcePath.startsWith('/')) {
      core.warning(`Source path starts at root! Fixing to cwd instead: .${sourcePath}`);
      sourcePath = `.${sourcePath}`;
    }

    const excludePattern:string = core.getInput(i.exclude);
    var destPath:string = core.getInput(i.dest, { required: true });

    const hostAddr:string = core.getInput(i.host, { required: true });
    const hostPort = core.getInput(i.port);
    const fingerprint = core.getInput(i.ssh_host_fingerprint);
    const username:string = core.getInput(i.username, { required: true });
    const ssh_key:string = core.getInput(i.ssh_key, { required: true, trimWhitespace: false });
    const ssh_passkey:string = core.getInput(i.ssh_passkey);

    const knownhostsPath = await (fingerprint ? writeKnownHosts(fingerprint) : writeKnownHosts({ host: hostAddr, port: hostPort }));

    const identityFile = await writeIdentityFile(ssh_key);

    if (await isProtectedKey(identityFile) && !ssh_passkey) {
      return core.setFailed(`The SSH key is password protected, but no password has been passed.`);
    }

    // Add regular arguments.
    rsyncArgs = rsyncArgs.length > 0 ? rsyncArgs : ['-avzr', '--delete', '--mkpath'];

    if (rsync.version) {
      if (rsync.version.compare('3.2.3') == -1 && rsyncArgs.includes('--mkpath')) {
        core.warning(`rsync versions older than 3.2.3 do not support the --mkpath argument. It will now be ignored.`);
        rsyncArgs.splice(rsyncArgs.indexOf('--mkpaths'), 1);
      }
    } else {
      core.warning(`Could not determine version of rsync binary. Some arguments may not work!`);
    }

    // Add optional port.
    if (hostPort)
      rsyncArgs.push(`--port=${hostPort}`);
    
    // Add exclude pattern.
    rsyncArgs.push(`--exclude=${excludePattern || 'node_modules/'}`);

    // Add source/destination.
    rsyncArgs.push(sourcePath);
    rsyncArgs.push(`${username}@${hostAddr}:${destPath}`);

    var returnCode;
    
    if (ssh_passkey) {
      // Encrypted key. Remove password first.
      try {
        returnCode = await useDecryptedKey(identityFile, ssh_passkey, identityFilePath => {
          return rsync.exec(rsyncArgs, {
            env: {
              ... process.env,
              // Using this env var right now before the same option in rsync (-e)
              // seems to be buggy when called with exec().
              RSYNC_RSH: `${toolPaths.ssh} -o "UserKnownHostsFile=${knownhostsPath}" -o "PasswordAuthentication=no" -i ${identityFilePath}`
              // RSYNC_RSH: `${bins.ssh} -o "UserKnownHostsFile=${knownhostsPath}"`
            }
          });
        });
      } catch (err) {
        core.setFailed(decoder.write(err.stdout));
      }
    } else {
      // Unencrypted key. Use as-is.
      try {
        returnCode = await rsync.exec(rsyncArgs, {
          env: {
            ... process.env,
            // Using this env var right now before the same option in rsync (-e)
            // seems to be buggy when called with exec().
            RSYNC_RSH: `${toolPaths.ssh} -o "UserKnownHostsFile=${knownhostsPath}" -o "PasswordAuthentication=no" -i ${identityFile}`
          }
        });
      } catch (err) {
        core.setFailed(decoder.write(err.stdout));
      }
    }

    if (returnCode) {
      core.setFailed(`An error occurred while running rsync. Check your logs for more information.`)
    }
  } catch (error) {
    core.setFailed(error.message);
  }
}
run();