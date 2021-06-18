import { tmpFilename } from './util';
import { promises as fs, constants as fsConstants } from 'fs';
import * as core from '@actions/core';
import * as exec from '@actions/exec';
import * as io from '@actions/io';
import i from './inputsEnum';
import { getTool, getTools, ToolsEnum } from './tools';

/**
 * Generates a known_hosts file in a temporary location and returns the path to
 * it. Used by calls to SSH. This is the preferred variant, as you store a
 * specific fingerprint known before hand.
 * @param fingerprint The fingerprint to store.
 */
export async function writeKnownHosts(fingerprint: string): Promise<string>
/**
 * Generates a known_hosts file in a temporary location, to be used by calls to
 * SSH. This variant of the function is *not* recommended, as it blindly trusts
 * whichever server responds from the host address. IN OTHER WORDS, THIS
 * FUNCTION IS VULNERABLE TO MAN-IN-THE-MIDDLE ATTACKS.
 * @param options Host and (optional) port of the remote host.
 */
export async function writeKnownHosts(options:{ host: string, port?: string | number }): Promise<string>
export async function writeKnownHosts(options: string | { host:string, port?: string | number }): Promise<string> {
  const filePath = await tmpFilename();

  let fingerprint;

  if (typeof options === 'string') {
    fingerprint = options;
  } else {
    core.warning(`writeKnownHosts() called with host/port instead of fingerprint. This is NOT recommended and should be considered UNSAFE!`);

    const port = core.getInput(i.port);
    const args = port ? ['-p', port] : [];

    args.push(options.host);

    const output = await exec.getExecOutput(await io.which('ssh-keyscan'), args, { silent: true });

    fingerprint = output.stdout;
  }

  await fs.writeFile(filePath, fingerprint, { encoding: 'utf-8' });

  return filePath;
}

/**
 * Writes an SSH key to a file on disk, in a temporary location as determined
 * by the os. This function essentially just wraps fs.writeFile but stores the
 * file in a location where it will be deleted automatically by the OS, but
 * also validates the file with ssh-keygen and sets very restrictive access
 * rights to the file (only owner can read).
 * 
 * Be warned that the file is still present on disk for a time before the 
 * operating system may decide to delete it. It's recommended that you delete
 * the file (fs.unlink) as soon as you're done with it to minimize the risk of
 * leaking secrets to the rest of the system.
 * @param key SSH key to write to disk.
 * @returns Path to the newly-created file on disk.
 */
export async function writeIdentityFile(key:string): Promise<string> {
  const filePath = await tmpFilename();

  await fs.writeFile(filePath, key, { encoding: 'utf-8', mode: 0o600 });

  if (!await isValidKey(filePath)) {
    throw new Error(`File does not appear to be valid!`);
    // core.setFailed(`Failed to validate SSH key.`);
  }

  return filePath;
}

type DecryptedAction<T> = (keypath:string) => Promise<T>;

/**
 * Creates a version of a password-protected key file that is *not* protected,
 * in a temporary location. A callback is then invoked with the path to the
 * unprotected file. The file is deleted either when the action completes, or
 * when a timeout is reached, whichever happens first.
 * @param keypath Path to the password-protected key file.
 * @param passphrase Password to the file.
 * @param action A callback that will be invoked with the path to a temporary
 * key file without a password.
 * @param timeout Timeout (in milliseconds). When this runs out, the temporary
 * file is deleted, regardless of whether the action has completed or not.
 * @returns Returns a promise to the return value of the action.
 */
export async function useDecryptedKey<T>(keypath:string, passphrase:string, action:DecryptedAction<T>, timeout:number = 20000): Promise<T> {
  // Decrypt the key in a temporary location.
  const decryptedPath = await tmpFilename();

  await io.cp(keypath, decryptedPath);
  await fs.chmod(decryptedPath, 0o600);

  const ssh_keygen = await getTool(ToolsEnum.ssh_keygen);

  const args = [
    '-p', // Change password mode.
    '-P', passphrase, // Set old password.
    '-N', '', // Remove old password.
    '-f', decryptedPath,
  ];

  await ssh_keygen.exec(args, { silent: false });

  // Set a timeout to delete the key forcefully within a timeframe.
  const timer = setTimeout(() => fs.unlink(decryptedPath), timeout);

  // Run the action with a pointer to the decrypted key.
  const result = await action(decryptedPath);

  // Delete the decrypted key.
  try {
    clearTimeout(timer);
    await fs.unlink(decryptedPath);
  } catch (err) {
    // Nothing bad. Probably already deleted?
  } finally {
    return result;
  }
}

export async function isValidKey(keypath:string): Promise<boolean> {
  const ssh_keygen = await getTool(ToolsEnum.ssh_keygen);

  const exitCode = await ssh_keygen.exec([
    '-e', '-f', keypath
  ], { silent: true, ignoreReturnCode: true })

  return exitCode == 0;
}

/**
 * Uses ssh-keygen to try and determine whether a given SSH key on disk is
 * password-protected or not.
 * @param keypath Path to the key file on disk.
 */
export async function isProtectedKey(keypath:string): Promise<boolean> {
  // If two different passwords are valid, there is no password.
  return !(await isPasswordValid(keypath, '"e"') == true && await isPasswordValid(keypath, '"b"') == true);
}

export async function isPasswordValid(keypath:string, password:string): Promise<boolean> {
  const ssh_keygen = await getTool(ToolsEnum.ssh_keygen);

  const result = await ssh_keygen.exec(
    [
      // Validate.
      '-y', 
      // Assume password. This will fail with incorrect passwords.
      '-P', password,
      // Path to key.
      '-f', keypath
    ],
    { silent: true, ignoreReturnCode: true }
  );

  return result == 0; 
}