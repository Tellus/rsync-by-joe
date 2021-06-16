import wait from 'wait';
import * as process from 'process';
import * as cp from 'child_process';
import * as path from 'path';

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
