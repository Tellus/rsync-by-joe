import * as io from '@actions/io';
import * as core from '@actions/core';
import { exec, getExecOutput } from '@actions/exec';
import { SemVer, parse } from 'semver';
import i from './inputsEnum';

interface ToolEntry {
  name: string;
  bin: string;
  exec: BinaryFunction;
  version: SemVer;
}

interface BinaryPaths {
  rsync: string;

  ssh: string;

  ssh_keyscan: string;
  
  ssh_keygen: string;

  [key:string]: string;
}

type ExecParams = Parameters<typeof exec>;
type BinaryFunction = (args?: ExecParams[1], opts?: ExecParams[2]) => ReturnType<typeof exec>;

interface Binaries {
  rsync: BinaryFunction;

  ssh: BinaryFunction;

  ssh_keyscan: BinaryFunction;
  
  ssh_keygen: BinaryFunction;

  [key:string]: BinaryFunction
}

async function checkForAllTools(): Promise<BinaryPaths> {
  const rsyncPath = core.getInput(i.rsync_path);
  const sshBinPath = core.getInput(i.ssh_bin_path);
  const sshKeyscanPath = core.getInput(i.ssh_keyscan_path);
  const sshKeygenPath = core.getInput(i.ssh_keygen_path);

  try {
    const bins:BinaryPaths = {
      rsync: await io.which(rsyncPath || 'rsync', true),
      ssh: await io.which(sshBinPath || 'ssh', true),
      ssh_keyscan: await io.which(sshKeyscanPath || 'ssh-keyscan', true),
      ssh_keygen: await io.which(sshKeygenPath || 'ssh-keygen', true),
    };

    for (const toolName in bins) {

      let version:string = '';

      const toolEntry:Partial<ToolEntry> = {
        name: toolName,
        bin: bins[toolName],
        exec: (args:ExecParams[1], opts: ExecParams[2]) => exec(bins[toolName], args, opts),
      };



      
    }

    return bins;
  } catch (err) {
    core.setFailed(`One or more tools are missing from the system: ${JSON.stringify(err)}`);
    throw err;
  }
}

const toolPathsPromise:Promise<BinaryPaths> = checkForAllTools();

var tools: Binaries | null = null;

export async function getToolPaths():Promise<BinaryPaths> {
  return toolPathsPromise;
}

export async function getTools():Promise<Binaries> {
  if (!tools) {
    const paths = await toolPathsPromise;

    const newTools:Record<string, BinaryFunction> = {};

    core.info(`Adding simple tool exec functions.`);
    for (const toolKey in paths) {
      core.info(toolKey);
      newTools[toolKey] = (args:ExecParams[1], opts: ExecParams[2]) => exec(paths[toolKey], args, opts);
    }

    // Ugly cast!
    tools = newTools as Binaries;
  }

  return tools;
}

// Start load early.
checkForAllTools();