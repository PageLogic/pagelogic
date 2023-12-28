import fs from "fs";
import assert from "node:assert";
import { describe, test } from "node:test";
import path from "path";
import { CodeLoader } from "../../src/code/loader";
import { getMarkup } from "../../src/code/markup";

const rootPath = path.join(__dirname, 'loader');

// https://nodejs.org/docs/latest-v20.x/api/test.html
describe('code: loader', () => {
  fs.readdirSync(rootPath).forEach(dir => {
    const dirPath = path.join(rootPath, dir);
    if (
      fs.statSync(dirPath).isDirectory() &&
      !dir.startsWith('.')
    ) {

      describe(dir, () => {
        const loader = new CodeLoader(dirPath);

        fs.readdirSync(dirPath).forEach(file => {
          if (
            fs.statSync(path.join(dirPath, file)).isFile() &&
            file.endsWith('-in.html')
          ) {

            test(file, async () => {
              const source = await loader.load(file);
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
                const actualHTML = getMarkup(source.ast!) + '\n';
                const pname = path.join(rootPath, dir, file.replace('-in.', '-out.'));
                const expectedHTML = await fs.promises.readFile(pname, { encoding: 'utf8' });
                assert.equal(actualHTML, expectedHTML);
              }
            });
    
          }
        });
      });
    
    }
  });

});
