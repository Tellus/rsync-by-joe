import { tmpFilename } from './util';
import { promises as fs, constants as fsConstants } from 'fs';
import * as core from '@actions/core';
import * as exec from '@actions/exec';
import * as io from '@actions/io';

/**
 * Generates a known_hosts file in a temporary location and returns the path to
 * it. Used by calls to SSH.
 * @param fingerprint The fingerprint to store.
 */
 export async function writeKnownHosts(fingerprint: string): Promise<string>
/**
* Generates a known_hosts file in a temporary location, to be used by calls to
* SSH.
* @param options Host and (optional) port of the remote host.
*/
export async function writeKnownHosts(options:{ host: string, port?: string | number }): Promise<string>
export async function writeKnownHosts(options: string | { host:string, port?: string | number }): Promise<string> {
  const filePath = await tmpFilename();

  let fingerprint;

  if (typeof options === 'string') {
    fingerprint = options;
  } else {
    const port = core.getInput('port');
    const args = port ? ['-p', port] : [];

    args.push(options.host);

    const output = await exec.getExecOutput(await io.which('ssh-keyscan'), args);

    fingerprint = output.stdout;
  }

  await fs.writeFile(filePath, fingerprint, { encoding: 'utf-8' });

  return filePath;
}
 
export async function addSSLKeyToAgent(key:string, passphrase?:string): Promise<void> {
  const execOpts:exec.ExecOptions = {};
  
  if (passphrase)
    execOpts.input = Buffer.from(passphrase + '\n\r');
 
  exec.exec('ssh-add', [
    '-t', '180', // 3 minute lifetime. Long enough to be useful, short enough to be lost quickly.
    key,
  ], execOpts);
}

export async function writeIdentityFile(key:string): Promise<string> {
  const filePath = await tmpFilename();

  await fs.writeFile(filePath, key, { encoding: 'utf-8', mode: fsConstants.S_IRUSR });

  return filePath;
}