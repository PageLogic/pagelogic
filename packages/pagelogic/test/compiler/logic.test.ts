import { assert } from 'chai';
import fs from 'fs';
import path from 'path';
import { Loader } from '../../src/compiler/loader';
import { Config } from '../../src/compiler/config';
import { parseLogic } from '../../src/compiler/logic';

const rootPath = path.join(__dirname, 'logic');

describe('compiler: logic', () => {
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
            file.endsWith('.html')
          ) {

            it(file, async () => {
              const source = await loader.load(file);
              parseLogic(source);

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

              const fname = file.replace('.html', '.json');
              const pname = path.join(dirPath, fname);
              const text = (await fs.promises.readFile(pname)).toString();
              const expected = JSON.parse(text);

              assert.deepEqual(source.logic, expected);
            });

          }
        });
      });

    }
  });
});
