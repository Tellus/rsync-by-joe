import { tmpdir } from 'os';
import { join } from 'path';
import Chance from 'chance';
import { promises as fs } from 'fs';
const ch = new Chance();

export async function tmpFilename(extra:string = '.action', ext:string = '.tmp'):Promise<string> {
  let filePath = join(tmpdir(), `${ch.string({ alpha:true, numeric: true, length: 8 })}${extra}${ext}`);

  let stat = await fs.stat(filePath);

  // Generate new name if we managed to hit an existing file.
  while (stat.isFile() || stat.isDirectory()) {
    filePath = join(tmpdir(), `${ch.string({ alpha:true, numeric: true, length: 8 })}${extra}${ext}`);
    stat = await fs.stat(filePath);
  }

  return filePath;
}