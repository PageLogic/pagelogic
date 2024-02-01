import fs from "fs";
import * as happy from 'happy-dom';
import assert from "node:assert";
import { describe, test } from "node:test";
import path from "path";
import { CodeTranspiler } from '../../src/code/transpiler';
import { normalizeText } from "../../src/code/utils";
import { WebContext } from "../../src/runtime/web/context";

const rootPath = path.join(__dirname, 'pages');
const transpiler = new CodeTranspiler(rootPath);

describe('runtime: pages', function () {

  fs.readdirSync(rootPath).forEach(file => {
    if (
      fs.statSync(path.join(rootPath, file)).isFile() &&
      file.endsWith('-in.html')
    ) {

      test(file, async () => {
        const html1 = await loadPage(file);
        let html2 = '';
        try {
          const fname = path.join(rootPath, file.replace(/(\-in\.html)$/, '-out.html'));
          html2 = await fs.promises.readFile(fname, { encoding: 'utf8' });
        } catch (ignored: any) {}
        if (html2) {
          assert.equal(normalizeText(html1), normalizeText(html2));
        }
      });

    }
  });

});

async function loadPage(fname: string): Promise<string> {
  const page = await transpiler.compile(fname);
  assert.equal(page.errors.length, 0);
  const window = new happy.Window();
  window.document.write(page.markup!);
  const context = new WebContext(window as any, window.document as any, {});
  const i = page.code!.indexOf('(');
  const code = page.code!.substring(i);
  const props = eval(code);
  context.load(props);
  context.refresh();
  let html = window.document.documentElement.outerHTML;
  html = html.replace(/^<!DOCTYPE html>\n/, '');
  html = html.replace('<script src="runtime.min.js"></script>\n', '');
  html = html.replace(`<script src="${fname.replace('.html', '.js')}"></script>\n`, '');
  html = html.replace(/\sdata-id=".+?"/g, '');
  html = html.replace(/<!---[t\/]\d+-->/g, '');
  return html + '\n';
}
