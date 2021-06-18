import * as io from '@actions/io';
import * as core from '@actions/core';
import { exec, getExecOutput } from '@actions/exec';
import { SemVer, parse } from 'semver';
import i from './inputsEnum';
import { mapValues, values } from 'lodash';

export enum ToolsEnum {
  rsync = 'rsync',
  ssh = 'ssh',
  ssh_keyscan = 'ssh_keyscan',
  ssh_keygen = 'ssh_keygen',
}

type ToolsRecord<T> = { readonly [key in ToolsEnum as string]: T }

const VersionRegExps:ToolsRecord<{ arg: string, re: RegExp }> = {
  rsync: {
    arg: '--version',
    re: /rsync\W+version\W+v(?<version>\d+(?:\.\d+)+)\W+/i,
  },
  ssh: {
    arg: '-V',
    re: /OpenSSH_(?<version>\d+(?:\.\d+)+)/,
  },
};

interface ToolEntry {
  name: ToolsEnum;
  bin: string;
  exec: BinaryFunction;
  version: SemVer | null;
}

type ExecParams = Parameters<typeof exec>;
type BinaryFunction = (args?: ExecParams[1], opts?: ExecParams[2]) => ReturnType<typeof exec>;

async function checkForAllTools(): Promise<ToolsRecord<string>> {
  const rsyncPath = core.getInput(i.rsync_path);
  const sshBinPath = core.getInput(i.ssh_bin_path);
  const sshKeyscanPath = core.getInput(i.ssh_keyscan_path);
  const sshKeygenPath = core.getInput(i.ssh_keygen_path);
  
  try {
    const bins:ToolsRecord<string> = {
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

const toolPathsPromise:Promise<ToolsRecord<string>> = checkForAllTools();

var tools: ToolsRecord<ToolEntry> | null = null;

export async function getToolPaths():Promise<ToolsRecord<string>> {
  return toolPathsPromise;
}

export async function getTools():Promise<ToolsRecord<ToolEntry>> {
  if (tools == null) {
    const paths = await toolPathsPromise;

    tools = mapValues(paths, (path, name, obj) => (<ToolEntry>{
      bin: path,
      name,
      exec: (args:ExecParams[1], opts: ExecParams[2]) => exec(path, args, opts),
    }));

    // Tac on versions.
    for (const tool of values(tools)) {
      tool.version = await getToolVersion(tool.name);
    }
  }

  return tools;
}

export async function getTool(tool:ToolsEnum): Promise<ToolEntry> {
  return (await getTools())[tool];
}

/**
 * Tries to detect the version of a given tool.
 * @param tool Tool to check versions for.
 * @returns SemVer object with version information if found, null otherwise.
 */
async function getToolVersion(tool:ToolsEnum): Promise<SemVer | null> {
  const toolPath = (await toolPathsPromise)[tool];

  const versionParseInfo = VersionRegExps[tool];

  if (versionParseInfo) {

    const versionString = (await getExecOutput(toolPath, [versionParseInfo.arg], { silent: true } )).stdout;
    const versionMatch = versionString.match(versionParseInfo.re);

    if (versionMatch?.groups) {
      return versionMatch.groups['version'] ? parse(versionMatch.groups['version']) : null;
    }
  }
  
  // Bailout if we didn't find any valid version data.
  return null;
}

// Start load early.
checkForAllTools();