import fs from 'fs';
import path from 'path';
import { parse } from '../../src/code/parser';
import { assert } from 'chai';
import { normalizeText } from '../../src/code/html';

const rootPath = path.join(__dirname, 'parser');

describe('code: parser', () => {
  fs.readdirSync(rootPath).forEach(file => {
    const filePath = path.join(rootPath, file);
    if (
      fs.statSync(filePath).isFile() &&
      file.endsWith('-in.html')
    ) {

      it(file, async () => {
        const text = await fs.promises.readFile(filePath);
        const source = parse(text.toString(), file);
        if (source.errors.length) {
          const fname = file.replace('-in.html', '-err.json');
          const pname = path.join(rootPath, fname);
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
          const actualHTML = source.toString() + '\n';
          const pname = path.join(rootPath, file.replace('-in.', '-out.'));
          const expectedHTML = await fs.promises.readFile(pname, { encoding: 'utf8' });
          assert.equal(normalizeText(actualHTML), normalizeText(expectedHTML));
        }
      });

    }
  });

});
