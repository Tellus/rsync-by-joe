import wait from 'wait';
import * as process from 'process';
import * as cp from 'child_process';
import * as path from 'path';
import { StringDecoder } from 'string_decoder';
import { promises as fs } from 'fs';

test('throws invalid number', async () => {
  await expect(wait('foo' as any)).rejects.toThrow('milliseconds not a number');
});

test('wait 500 ms', async () => {
  const start = new Date();
  await wait(500);
  const end = new Date();
  var delta = Math.abs(end.getTime() - start.getTime());
  expect(delta).toBeGreaterThanOrEqual(500);
});

// shows how the runner will run a javascript action with env / stdout protocol
// test('test runs', () => {
//   process.env['INPUT_MILLISECONDS'] = '500';
//   const ip = path.join(__dirname, '..', 'dist', 'index.js');
//   console.log(cp.execSync(`node ${ip}`, {env: process.env}).toString());
// })

test('test runs', async () => {
  // Get secret test info from an ignored file.
  var testConf:any;

  try {
    testConf = JSON.parse(await fs.readFile(path.join(__dirname, 'test_run.conf.json'), { encoding: 'utf-8' }));
  } catch (err) {
    console.warn(`Could not find local secrets file. Assuming execution in an untrusted environment. We're fine!`);
    return;
  }

  console.log(`Loading test secrets from file:`)
  for (const key in testConf.env) {
    process.env[key] = testConf.env[key];
    console.log(`\t${key}:${testConf.env[key]}`);
  }

  const ip = path.join(__dirname, '..', 'dist', 'index.js');
  console.log(`Running test using file ${ip}`);

  try {
    const result = cp.execSync(`node ${ip}`, {env: process.env});
    
    console.log(result.toString());
  } catch (err) {
    const decoder = new StringDecoder('utf-8');

    // decoder.write(err.'')
    console.log(`stdout::`);
    const _stdout = decoder.write(err.stdout);
    console.log(_stdout);
    console.log(`stderr::`);
    const _stderr = decoder.write(err.stderr);
    console.log(_stderr);

    throw decoder.write(err.stdout);
  }

});