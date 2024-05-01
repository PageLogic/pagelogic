/// <reference types="node" />

import { assert } from 'chai';
import { generate } from 'escodegen';
import fs from 'fs';
import { describe } from 'mocha';
import path from 'path';
import { generator } from '../../src/logic/generator';
import { load } from '../../src/logic/loader';
import { qualify } from '../../src/logic/qualifier';
import { resolve } from '../../src/logic/resolver';
import { Preprocessor } from '../../src/source/preprocessor';
import { parse } from 'acorn';
import * as happy from 'happy-dom';
import { normalizeText } from 'trillo/preprocessor/util';

const rootPath = path.join(__dirname, 'core');

describe('runtime/core', () => {
  fs.readdirSync(rootPath).forEach(dir => {
    const dirPath = path.join(rootPath, dir);
    if (
      fs.statSync(dirPath).isDirectory() &&
      !dir.startsWith('.')
    ) {

      describe(dir, () => {
        const preprocessor = new Preprocessor(dirPath);

        fs.readdirSync(dirPath).forEach(file => {
          if (
            fs.statSync(path.join(dirPath, file)).isFile() &&
            file.endsWith('-in.html')
          ) {

            it(file, async () => {
              const source = await preprocessor.load(file);
              const logic = resolve(qualify(load(source, null)));

              // check errors
              if (logic.errors.length) {
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
                return;
              }

              // check generated code
              const js = `(${generate(generator(logic))});`;
              {
                const fname = file.replace('-in.html', '.js');
                const pname = path.join(dirPath, fname);
                if (fs.existsSync(pname)) {
                  const s = (await fs.promises.readFile(pname)).toString();
                  const expectedJS = generate(parse(s, { ecmaVersion: 'latest' }));
                  assert.equal(js, expectedJS);
                }
              }

              // check behavior
              {
                const fname = file.replace('-in.html', '-out.html');
                const pname = path.join(dirPath, fname);
                const window = new happy.Window();
                const html = logic.source.doc?.toString() || '';
                console.log(html);
                window.document.write(html);
                const descr = eval(js);
                const actual = document.documentElement.outerHTML;
                const expected = (await fs.promises.readFile(pname)).toString();
                assert.equal(normalizeText(actual), normalizeText(expected));
              }
            });

          }
        });
      });

    }
  });
});
