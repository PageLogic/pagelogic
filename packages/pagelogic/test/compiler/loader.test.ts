/// <reference types="node" />

import { assert } from 'chai';
import fs from 'fs';
import { describe } from 'mocha';
import path from 'path';
import { Config } from '../../src/compiler/config';
import { Preprocessor } from '../../src/compiler/preprocessor';
import { normalizeText } from '../../src/compiler/utils';

const rootPath = path.join(__dirname, 'preprocessor');

describe('compiler: preprocessor', () => {
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
            file.endsWith('-in.html')
          ) {

            it(file, async () => {
              const source = await preprocessor.load(file);
              if (source.errors.length) {
                const fname = file.replace('-in.html', '-err.json');
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
              } else {
                // const actualHTML = getMarkup(source.ast!) + '\n';
                const actualHTML = source.doc!.toString() + '\n';
                const pname = path.join(rootPath, dir, file.replace('-in.', '-out.'));
                const expectedHTML = await fs.promises.readFile(pname, { encoding: 'utf8' });
                assert.equal(normalizeText(actualHTML), normalizeText(expectedHTML));
              }
            });

          }
        });
      });

    }
  });
});
