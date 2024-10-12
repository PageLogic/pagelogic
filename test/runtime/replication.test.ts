import { assert } from 'chai';
import { compile } from '../../src/compiler/compiler';
import { parse } from '../../src/html/parser';
import { Page } from '../../src/page/page';
import { ScopeObj } from '../../src/page/scope';
import { RuntimePage } from '../../src/runtime/runtime-page';
import { ServerGlobal } from '../../src/server/server-global';
import { ServerDocument } from '../../src/html/server-dom';
import { PageProps } from '../../src/page/props';

function load(html: string): { page: Page, root: ScopeObj, doc: ServerDocument } {
  // compile
  const src = parse(html, 'test');
  assert.equal(src.errors.length, 0);
  const comp = compile(src);
  assert.equal(comp.errors.length, 0);
  // load
  const doc = (comp.global.doc as ServerDocument).clone(null, null);
  const page = new RuntimePage(page => {
    return new ServerGlobal(
      page, doc, comp.global.props as unknown as PageProps
    );
  });
  return { page, root: page.root.obj, doc };
}

describe('runtime/replication', () => {

  it('001', () => {
    const { doc } = load('<html><body><ul>'
      + '<:foreach :item=${[]}>'
      + '<li>Item ${item}</li>'
      + '</:foreach>'
      + '</ul></body></html>');
    assert.equal(
      doc.toString(),
      '<html data-pl="0"><head data-pl="1"></head><body data-pl="2"><ul>'
      + '<template data-pl="3"><li data-pl="4">Item <!---t0--><!----></li></template>'
      + '</ul></body></html>'
    );
  });

  it('002', () => {
    const { page } = load('<html><body><ul>'
      + '<:foreach :item=${["a", "b", "c"]}>'
      + '<li>Item ${item}</li>'
      + '</:foreach>'
      + '</ul></body></html>');
    assert.equal(
      page.global.doc.toString(),
      '<html data-pl="0"><head data-pl="1"></head><body data-pl="2"><ul>'
      + '<li data-pl="-4">Item <!---t0-->a<!----></li>'
      + '<li data-pl="-4">Item <!---t0-->b<!----></li>'
      + '<li data-pl="-4">Item <!---t0-->c<!----></li>'
      + '<template data-pl="3"><li data-pl="4">Item <!---t0--><!----></li></template>'
      + '</ul></body></html>'
    );
  });

});
