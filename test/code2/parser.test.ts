import assert from "node:assert";
import { describe, test } from "node:test";
import fs from "fs";
import path from "path";
import { parse } from "../../src/code2/parser";

const rootPath = path.join(__dirname, 'parser');

describe('code: parser', () => {
  fs.readdirSync(rootPath).forEach(file => {
    const filePath = path.join(rootPath, file);
    if (
      fs.statSync(filePath).isFile() &&
      file.endsWith('.html')
    ) {

      test(file, async () => {
        const s1 = await fs.promises.readFile(filePath, { encoding: 'utf8' });
        const s2 = await fs.promises.readFile(filePath.replace('.html', '.json'), { encoding: 'utf8' });
        const actual = JSON.parse(JSON.stringify(parse(s1)));
        // console.log(JSON.stringify(actual));
        const expected = JSON.parse(s2);
        assert.deepEqual(actual, expected);
      });

    }
  });
});
