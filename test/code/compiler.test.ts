import { parse } from "acorn";
import { generate } from "escodegen";
import fs from "fs";
import assert from "node:assert";
import { describe, test } from "node:test";
import path from "path";
import { CodeCompiler } from "../../src/code/compiler";

const rootPath = path.join(__dirname, 'compiler');
const compiler = new CodeCompiler(rootPath);

describe('code: compiler', function () {
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
        const page = await compiler.compile(file);

        // check errors
        let errors: string[] = [];
        try {
          const fname = file.replace('-in.html', '-err.json');
          const pname = path.join(rootPath, fname);
          const text = await fs.promises.readFile(pname, { encoding: 'utf8' });
          errors = JSON.parse(text);
        } catch (ignored: any) {}
        assert.deepEqual(page.errors.map(e => e.msg), errors);

        if (!page.errors.length) {
          // check markup
          // console.log(page.markup);
          assert.ok(page.markup);
          let markup: string | null = null;
          try {
            const fname = file.replace('-in.html', '-out.html');
            const pname = path.join(rootPath, fname);
            markup = await fs.promises.readFile(pname, { encoding: 'utf8' });
          } catch (ignored: any) {}
          if (markup) {
            assert.equal(page.markup + '\n', markup);
          }

          // check code
          // console.log(page.code);
          assert.ok(page.code);
          let code: string | null = null;
          try {
            const fname = file.replace('-in.html', '.js');
            const pname = path.join(rootPath, fname);
            code = await fs.promises.readFile(pname, { encoding: 'utf8' });
          } catch (ignored: any) {}
          if (code) {
            assert.equal(
              generate(parse(page.code, { ecmaVersion: 'latest' })),
              generate(parse(code, { ecmaVersion: 'latest' }))
            );
          }
        }
      });

    }
  });

});
