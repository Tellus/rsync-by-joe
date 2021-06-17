import { tmpFilename } from './util';
import { promises as fs, constants as fsConstants } from 'fs';
import * as core from '@actions/core';
import * as exec from '@actions/exec';
import * as io from '@actions/io';

import { getTools } from './tools';

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

    const output = await exec.getExecOutput(await io.which('ssh-keyscan'), args, { silent: true });

    fingerprint = output.stdout;
  }

  await fs.writeFile(filePath, fingerprint, { encoding: 'utf-8' });

  return filePath;
}

export async function writeIdentityFile(key:string): Promise<string> {
  const filePath = await tmpFilename();

  await fs.writeFile(filePath, key, { encoding: 'utf-8', mode: fsConstants.S_IRUSR });

  // Verify the file.
  const tools = await getTools();

  const validated = await tools.ssh_keygen([
    '-e', '-f', filePath
  ]);

  if (validated == 0) return filePath;
  else throw core.setFailed(`Failed to validate SSH key.`);
}

type DecryptedAction<T> = (keypath:string) => Promise<T>;

export async function useDecryptedKey<T>(keypath:string, passphrase:string, action:DecryptedAction<T>, timeout:number = 20000): Promise<T> {
  // Decrypt the key in a temporary location.
  const decryptedPath = await tmpFilename();

  await io.cp(keypath, decryptedPath);

  (await getTools()).ssh_keygen([
    '-p', // Change password mode.
    '-P', passphrase, // Set old password.
    '-N', '""', // Remove old password.
    '-f', decryptedPath,
  ]);

  // Set a timeout to delete the key forcefully within a timeframe.
  const timer = setTimeout(() => fs.unlink(decryptedPath), timeout);

  // Run the action with a pointer to the decrypted key.
  const result = await action(decryptedPath);

  // Delete the decrypted key.
  try {
    clearTimeout(timer);
    fs.unlink(decryptedPath);
  } catch (err) {
    // Nothing bad. Probably already deleted?
  } finally {
    return result;
  }
}