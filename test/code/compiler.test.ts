import fs from "fs";
import path from "path";
import assert from "node:assert";
import { describe, test } from "node:test";
import { CodeCompiler } from "../../src/code/compiler";
import { CodeLogic } from "../../src/code/logic";
import { getMarkup } from "../../src/code/markup";

const rootPath = path.join(__dirname, 'compiler');
const compiler = new CodeCompiler(rootPath);

describe('code: compiler', function () {
  let count = 0;
  const limit = 1;

  fs.readdirSync(rootPath).forEach(file => {
    if (
      fs.statSync(path.join(rootPath, file)).isFile() &&
      file.endsWith('-in.html')
    ) {
      if (++count > limit) {
        return;
      }

      test(file, async () => {
        const page = await compiler.compile(file);
        assert.equal(page.errors.length, 0);
        assert.ok(page.markup);
        assert.ok(page.code);
        console.log(page.markup);
        console.log(page.code);
        try {
          
        } catch (ignored: any) {}
      });

    }
  });

});
