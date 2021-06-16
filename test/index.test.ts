import wait from 'wait';
import * as process from 'process';
import * as cp from 'child_process';
import * as path from 'path';
import { StringDecoder } from 'string_decoder';

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

test('test runs', () => {
  process.env['INPUT_HOST'] = 'BIG BAD HOST';
  process.env['INPUT_USERNAME'] = 'BIG BAD USER';
  process.env['INPUT_SSH_KEY'] = `BIG BAD SECRET`;
  process.env['INPUT_SOURCE'] = './dist';
  process.env['INPUT_DEST'] = '/home/USER/tmptmptmp';

  const ip = path.join(__dirname, '..', 'dist', 'index.js');
  console.log(`Running test using file ${ip}`);

  try {
    const result = cp.execSync(`node ${ip}`, {env: process.env});
    
    console.log(result.toString());
  } catch (err) {
    console.error(err);
    
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