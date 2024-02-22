import fs from "fs";
import path from "path";
import assert from "node:assert";
import { describe, test } from "node:test";
import { CodeLoader } from "../../src/code/loader";
import { CodeLogic } from "../../src/code/logic";
import { getMarkup } from "../../src/code/markup";

const rootPath = path.join(__dirname, 'logic');
const loader = new CodeLoader(rootPath);

describe('code: logic', function () {
  let count = 0;
  const limit = 1000;

  fs.readdirSync(rootPath).forEach(file => {
    if (
      fs.statSync(path.join(rootPath, file)).isFile() &&
      file.endsWith('-in.html')
    ) {
      if (++count > limit) {
        return;
      }

      test(file, async () => {
        const source = await loader.load(file);
        const logic = new CodeLogic(source);

        // console.log(JSON.stringify(logic.root));
        let json2: any;
        try {
          json2 = JSON.parse((await fs.promises.readFile(
            path.join(rootPath, file.replace(/(\-in\.html)$/, '.json'))
          )).toString());
        } catch (ignored: any) {}
        if (json2) {
          const json1 = JSON.parse(JSON.stringify(logic.root));
          assert.deepEqual(json1, json2);
        }

        let html2 = '';
        try {
          const fname = path.join(rootPath, file.replace(/(\-in\.html)$/, '-out.html'));
          html2 = await fs.promises.readFile(fname, { encoding: 'utf8' });
        } catch (ignored: any) {}
        if (html2) {
          const html1 = getMarkup(logic.source.ast!) + '\n';
          assert.equal(html1, html2);
        }
      });

    }
  });

});
