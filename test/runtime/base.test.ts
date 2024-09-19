import { assert } from 'chai';
import { generate } from 'escodegen';
import { CompilerPage } from '../../src/compiler/compiler-page';
import { parse } from '../../src/html/parser';
import { Page } from '../../src/page/page';
import { RuntimePage } from '../../src/runtime/runtime-page';
import { ServerGlob } from '../../src/server/server-glob';

describe('runtime/base', () => {

  it('001', () => {
    const page = load('<html></html>');
    console.log(page.glob.doc.toString());//tempdebug
    console.log(page.glob.props);//tempdebug
    //TODO
  });

});

function load(html: string): Page {
  const src = parse(html, 'test');
  assert.equal(src.errors.length, 0);
  const compilerGlob = new ServerGlob(src.doc);
  const compilerPage = new CompilerPage(compilerGlob);
  assert.equal(compilerPage.errors.length, 0);
  const js = generate(compilerPage.ast);
  const props = eval(`(${js})`);
  const serverGlob = new ServerGlob(src.doc, props);
  const runtimePage = new RuntimePage(serverGlob);
  return runtimePage;
}
