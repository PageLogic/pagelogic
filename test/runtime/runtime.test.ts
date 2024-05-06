/// <reference types="node" />

import { parse } from 'acorn';
import { assert } from 'chai';
import { generate } from 'escodegen';
import fs from 'fs';
import * as happy from 'happy-dom';
import { describe } from 'mocha';
import path from 'path';
import { normalizeText } from 'trillo/preprocessor/util';
import { generator } from '../../src/logic/generator';
import { load } from '../../src/logic/loader';
import { qualify } from '../../src/logic/qualifier';
import { resolve } from '../../src/logic/resolver';
import { boot } from '../../src/runtime/boot';
import { Preprocessor } from '../../src/source/preprocessor';

// https://github.com/capricorn86/happy-dom/tree/master/packages/global-registrator
// GlobalRegistrator.register({ url: 'about:blank', width: 1920, height: 1080 });
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
                try {
                  const fname = file.replace('-in.html', '-err.json');
                  const pname = path.join(dirPath, fname);
                  const text = (await fs.promises.readFile(pname)).toString();
                  const actual = JSON.parse(text);
                  assert.deepEqual(actual, logic.errors);
                  return;
                } catch (err) {
                  console.log(logic.errors);
                  throw err;
                }
              }

              // check generated code
              const js = generate(generator(logic));
              // console.log(js);
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
                const win = new happy.Window();
                const doc = win.document;
                const html = logic.source.doc?.toString() || '';
                // console.log(html);
                doc.write(html);
                // console.log(js);
                const root = eval(js);

                await boot(
                  doc as unknown as Document,
                  root,
                  true
                );
                const actual = doc.documentElement.outerHTML;
                await win.happyDOM.close();
                const expected = (await fs.promises.readFile(pname)).toString().trim();
                assert.equal(normalizeText(actual), normalizeText(expected));
              }
            });

          }
        });
      });

    }
  });
});
