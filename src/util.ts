import { tmpdir } from 'os';
import { join } from 'path';
import Chance from 'chance';
import { promises as fs } from 'fs';
const ch = new Chance();
import * as core from '@actions/core';

export async function tmpFilename(extra:string = '.action', ext:string = '.tmp'):Promise<string> {
  let filePath = join(tmpdir(), `${ch.string({ alpha:true, numeric: true, length: 8 })}${extra}${ext}`);

  try {
    while (1) await fs.stat(filePath)
  } catch (err) {
    core.debug(`Found valid tmp file name ${filePath}`);
    return filePath;
  }

  return filePath;
}