import { assert } from 'chai';
import { compile } from '../../src/compiler/compiler';
import { parse } from '../../src/html/parser';
import { Page } from '../../src/page/page';
import { RuntimePage } from '../../src/runtime/runtime-page';
import { ServerGlob } from '../../src/server/server-glob';

describe('runtime/base', () => {

  it('001', () => {
    const page = load('<html></html>');
    console.log(page.glob.doc.toString());//tempdebug
    console.log(JSON.stringify(page.glob.props));//tempdebug
    //TODO
  });

});

function load(html: string): Page {
  // compile
  const src = parse(html, 'test');
  assert.equal(src.errors.length, 0);
  const comp = compile(src);
  assert.equal(comp.errors.length, 0);
  // load
  const glob = new ServerGlob(comp.glob.doc, comp.glob.props);
  const page = new RuntimePage(glob);
  page.refresh(page.root);
  return page;
}
