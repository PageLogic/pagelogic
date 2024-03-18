import fs from 'fs';
import path from 'path';
import { normalizeText } from '../../src/compiler/utils';
import { assert } from 'chai';
import { Loader } from '../../src/compiler/loader';
import { Config } from '../../src/compiler/config';

const rootPath = path.join(__dirname, 'loader');

describe('compiler: loader', () => {
  fs.readdirSync(rootPath).forEach(dir => {
    const dirPath = path.join(rootPath, dir);
    if (
      fs.statSync(dirPath).isDirectory() &&
      !dir.startsWith('.')
    ) {

      describe(dir, () => {
        const loader = new Loader(new Config({ rootPath: dirPath }));

        fs.readdirSync(dirPath).forEach(file => {
          if (
            fs.statSync(path.join(dirPath, file)).isFile() &&
            file.endsWith('-in.html')
          ) {

            it(file, async () => {
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
