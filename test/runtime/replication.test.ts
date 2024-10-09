import { assert } from 'chai';
import { compile } from '../../src/compiler/compiler';
import { parse } from '../../src/html/parser';
import { Page } from '../../src/page/page';
import { ScopeObj } from '../../src/page/scope';
import { RuntimePage } from '../../src/runtime/runtime-page';
import { ServerGlobal } from '../../src/server/server-global';

function load(html: string): { page: Page, root: ScopeObj } {
  // compile
  const src = parse(html, 'test');
  assert.equal(src.errors.length, 0);
  const comp = compile(src);
  assert.equal(comp.errors.length, 0);
  // load
  const glob = new ServerGlobal(comp.global.doc, comp.global.pageProps);
  const page = new RuntimePage(glob);
  return { page, root: page.root.obj };
}

describe('runtime/replication', () => {

  it('001', () => {
    const { page } = load('<html><body><ul>'
      + '<:foreach :item=${[]}>'
      + '<li>Item ${item}</li>'
      + '</:foreach>'
      + '</ul></body></html>');
    assert.equal(
      page.global.doc.toString(),
      '<html data-pl="0"><head data-pl="1"></head><body data-pl="2"><ul>'
      + '<template data-pl="3"><li data-pl="4">Item <!---t0--><!----></li></template>'
      + '</ul></body></html>'
    );
  });

  // it('002', () => {
  //   const { page } = load('<html><body><ul>'
  //     + '<:foreach :item=${["a", "b", "c"]}>'
  //     + '<li>Item ${item}</li>'
  //     + '</:foreach>'
  //     + '</ul></body></html>');
  //   assert.equal(
  //     page.global.doc.toString(),
  //     '<html data-pl="0"><head data-pl="1"></head><body data-pl="2"><ul>'
  //     + '<li data-pl="5/4">Item <!---t0-->a<!----></li>'
  //     + '<li data-pl="6/4">Item <!---t0-->b<!----></li>'
  //     + '<li data-pl="7/4">Item <!---t0-->c<!----></li>'
  //     + '<template data-pl="3"><li data-pl="4">Item <!---t0--><!----></li></template>'
  //     + '</ul></body></html>'
  //   );
  // });

});
