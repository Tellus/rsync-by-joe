import * as io from '@actions/io';
import * as core from '@actions/core';

interface BinaryPaths {
  rsync: string;

  ssh: string;

  ssh_keyscan: string;
  
  ssh_keygen: string;
}

async function checkForAllTools(): Promise<BinaryPaths> {
  const rsyncPath = core.getInput('rsync_path', { required: false });
  const sshBinPath = core.getInput('ssh_bin_path', { required: false });
  const sshKeyscanPath = core.getInput('ssh_keyscan_path', { required: false });
  const sshKeygenPath = core.getInput('ssh_keygen_path', { required: false });

  try {
    const bins:BinaryPaths = {
      rsync: await io.which(rsyncPath || 'rsync', true),
      ssh: await io.which(sshBinPath || 'ssh', true),
      ssh_keyscan: await io.which(sshKeyscanPath || 'ssh-keyscan', true),
      ssh_keygen: await io.which(sshKeygenPath || 'ssh-keygen', true),
    };

    return bins;
  } catch (err) {
    core.setFailed(`One or more tools are missing from the system: ${JSON.stringify(err)}`);
    throw err;
  }
}

const toolPathsPromise:Promise<BinaryPaths> = checkForAllTools();

export async function getToolPaths():Promise<BinaryPaths> {
  return toolPathsPromise;
}

// Start load early.
checkForAllTools();