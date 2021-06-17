/**
 * Quick 'n dirty tool to extract the inputs of action.yml and dump it as an
 * enum in a .ts file.
 */

import yaml from 'js-yaml';
import { promises as fs } from 'fs';

async function run() {
  const outFile = process.argv.pop();
  const inFile = process.argv.pop();

  if (!outFile || !inFile) throw new Error(`Must pass both an input file and an output file (in that order).`);

  const parsed = yaml.load(await fs.readFile(inFile, { encoding: 'utf-8' }), {
    filename: inFile,
  });

  if (typeof parsed == 'object') {
    const o = parsed as any;
    const inputs:string[] = [];

    for (const inputKey in o.inputs) {
      inputs.push(`${inputKey} = '${inputKey}',`);
    }

    fs.writeFile(
      outFile,
      `export enum InputsEnum {\n\t${inputs.join('\n\t')}\n}\n\nexport default InputsEnum;`,
      {
        encoding: 'utf-8',
      },
    );
  } else throw new Error(`Unexpected type "${typeof parsed}" was parsed from ${inFile}.`);
}

run();