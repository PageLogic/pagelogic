import * as acorn from 'acorn';
import escodegen from 'escodegen';
import { assert } from 'chai';
import fs from 'fs';
import { describe } from 'mocha';
import path from 'path';
import * as parser from '../../src/html/parser';
import { CompilerGlob } from '../../src/compiler/compiler-glob';
import { CompilerPage } from '../../src/compiler/compiler-page';

const rootPath = path.join(__dirname, 'page');
const inSuffix = '-in.html';
const outSuffix = '-out.html';
const propsSuffix = '-props.js';
const errSuffix = '-err.json';

describe('compiler/page', () => {
  fs.readdirSync(rootPath).forEach(file => {
    const inPath = path.join(rootPath, file);
    if (
      fs.statSync(inPath).isFile() &&
      file.endsWith(inSuffix)
    ) {
      const name = file.substring(0, file.length - inSuffix.length);

      it(file, async () => {
        const inText = await fs.promises.readFile(inPath);
        const inSource = parser.parse(inText.toString(), file);
        assert.equal(inSource.errors.length, 0);

        const glob = new CompilerGlob(inSource.doc);
        const page = new CompilerPage(glob);

        const errPath = path.join(rootPath, name + errSuffix);
        if (fs.existsSync(errPath)) {
          const errText = await fs.promises.readFile(errPath);
          const expected = JSON.parse(errText.toString());
          const actual = page.errors.map(e => e.msg);
          assert.deepEqual(actual, expected);
        } else if (page.errors.length) {
          page.errors.forEach(e => console.error(e));
          assert.equal(page.errors.length, 0);
        }
        const root = page.root;
        assert.exists(root);
        assert.equal(root.e, inSource.doc.documentElement);

        const outPath = path.join(rootPath, name + outSuffix);
        if (fs.existsSync(outPath)) {
          const outText = await fs.promises.readFile(outPath);
          const outSource = parser.parse(outText.toString(), file);
          assert.equal(inSource.doc.toString(), outSource.doc.toString());
        }

        const propsPath = path.join(rootPath, name + propsSuffix);
        if (fs.existsSync(propsPath)) {
          const propsText = (await fs.promises.readFile(propsPath)).toString();
          const propsAst = acorn.parse(propsText, { ecmaVersion: 'latest' });
          const propsJS = escodegen.generate(propsAst);
          assert.equal(
            `(${escodegen.generate(page.ast)});`,
            propsJS
          );
        }
      });

    }
  });
});
