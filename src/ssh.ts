import { tmpFilename } from './util';
import { promises as fs, PathLike } from 'fs';
import * as core from '@actions/core';
import * as exec from '@actions/exec';
import * as io from '@actions/io';

/**
 * Generates a known_hosts file in a temporary location and returns the path to
 * it. Used by calls to SSH.
 * @param fingerprint The fingerprint to store.
 */
async function writeKnownHosts(fingerprint: string): Promise<PathLike>
/**
* Generates a known_hosts file in a temporary location, to be used by calls to
* SSH.
* @param options Host and (optional) port of the remote host.
*/
async function writeKnownHosts(options:{ host: string, port?: string | number }): Promise<PathLike>
async function writeKnownHosts(options: string | { host:string, port?: string | number }): Promise<PathLike> {
  const filePath = await tmpFilename();

  let fingerprint;

  if (typeof options === 'string') {
    fingerprint = options;
  } else {
    const port = core.getInput('port');
    const args = port ? ['-p', port] : [];

    const output = await exec.getExecOutput(await io.which('ssh-keyscan'), args);

    fingerprint = output.stdout;
  }

  await fs.writeFile(filePath, fingerprint, { encoding: 'utf-8' });

  return filePath;
}
 
async function addSSLKeyToAgent(key:string, passphrase?:string): Promise<void> {
  const execOpts:exec.ExecOptions = {};
  
  if (passphrase)
    execOpts.input = Buffer.from(passphrase + '\n\r');
 
  exec.exec('ssh-add', [
    '-t', '180', // 3 minute lifetime. Long enough to be useful, short enough to be lost quickly.
    key,
  ], execOpts);
}
 