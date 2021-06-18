import * as ssh from '../src/ssh';
import * as path from 'path';
import * as fsSync from 'fs';

const protKeyPath = path.join(__dirname, 'protected_key');
// note: protected_key's password is "password".
const password = 'password';
const unsafeKeyPath = path.join(__dirname, 'unsafe_key');
const badKey = path.join(__dirname, 'invalid_key');

test('Validates a good, unprotected key', async () => {
  expect(await ssh.isValidKey(unsafeKeyPath)).toEqual(true);
});

test('Validates a good, protected key', async () => {
  expect(await ssh.isValidKey(protKeyPath)).toEqual(true);
});

test('Does not validate a bad key', async () => {
  expect(await ssh.isValidKey(badKey)).toEqual(false);
});

test('Correctly identifies a password-protected file', async () => {
  expect(await ssh.isProtectedKey(protKeyPath)).toEqual(true);
});

test('Correctly identifies an unprotected file', async () => {
  expect(await ssh.isProtectedKey(unsafeKeyPath)).toEqual(false);
});

test('Runs an action on key with correct password', async () => {
  var tmpFile: string = '';

  await ssh.useDecryptedKey(protKeyPath, password, async (decryptPath) => {
    tmpFile = decryptPath;

    expect(protKeyPath).not.toEqual(decryptPath);

    // Expect temp file to exist.
    expect(fsSync.existsSync(decryptPath)).toEqual(true);
    // Expect temp file to be valid.
    expect(await ssh.isValidKey(decryptPath)).toEqual(true);
    // Expect temp file to be unprotected.
    expect(await ssh.isProtectedKey(decryptPath)).toEqual(false)
  });

  // Expect unsafe file to be gone after action.
  expect(fsSync.existsSync(tmpFile)).toEqual(false);
})