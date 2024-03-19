/// <reference types="node" />

import { assert } from 'chai';
import { generate } from 'escodegen';
import fs from 'fs';
import { describe } from 'mocha';
import path from 'path';
import { Config } from '../../src/compiler/config';
import { parseLogic } from '../../src/compiler/logic';
import { Preprocessor } from '../../src/compiler/preprocessor';
import { transpile } from '../../src/compiler/transpiler';
import * as utils from '../../src/compiler/utils';

const rootPath = path.join(__dirname, 'transpiler');

describe('compiler: transpiler', () => {
  fs.readdirSync(rootPath).forEach(dir => {
    const dirPath = path.join(rootPath, dir);
    if (
      fs.statSync(dirPath).isDirectory() &&
      !dir.startsWith('.')
    ) {

      describe(dir, () => {
        const preprocessor = new Preprocessor(new Config({ rootPath: dirPath }));

        fs.readdirSync(dirPath).forEach(file => {
          if (
            fs.statSync(path.join(dirPath, file)).isFile() &&
            file.endsWith('.html')
          ) {

            it(file, async () => {
              const source = await preprocessor.load(file);
              parseLogic(source);
              transpile(source);

              if (source.errors.length) {
                const fname = file.replace('.html', '-err.json');
                const pname = path.join(dirPath, fname);
                const aerrs = source.errors.map(e => e.msg);
                let eerrs = [];
                try {
                  const etext = (await fs.promises.readFile(pname)).toString();
                  eerrs = JSON.parse(etext);
                  assert.deepEqual(aerrs, eerrs);
                } catch (e) {
                  assert.deepEqual(aerrs, eerrs);
                }
                return;
              }

              const fname = file.replace('.html', '.js');
              const pname = path.join(dirPath, fname);
              const expected = (await fs.promises.readFile(pname)).toString();
              const actual = generate(source.ast);

              assert.equal(
                utils.normalizeSpace(actual)?.trim(),
                utils.normalizeSpace(expected)?.trim()
              );
            });

          }
        });
      });

    }
  });
});