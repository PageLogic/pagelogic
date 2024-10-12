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

  it('001 empty list', () => {
    const { doc } = load('<html :list=${[]}><body><ul>'
      + '<:foreach :item=${list}>'
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

  it('002 initial list', () => {
    const { page } = load('<html :list=${["a", "b", "c"]}><body><ul>'
      + '<:foreach :item=${list}>'
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

  it('003 items update', () => {
    const { page, root } = load('<html :list=${["a", "b", "c"]}><body><ul>'
      + '<:foreach :item=${list}>'
      + '<li>Item ${item}</li>'
      + '</:foreach>'
      + '</ul></body></html>');
    root.list = ['a', 'y', 'z'];
    assert.equal(
      page.global.doc.toString(),
      '<html data-pl="0"><head data-pl="1"></head><body data-pl="2"><ul>'
      + '<li data-pl="-4">Item <!---t0-->a<!----></li>'
      + '<li data-pl="-4">Item <!---t0-->y<!----></li>'
      + '<li data-pl="-4">Item <!---t0-->z<!----></li>'
      + '<template data-pl="3"><li data-pl="4">Item <!---t0--><!----></li></template>'
      + '</ul></body></html>'
    );
  });

  it('004 items addition', () => {
    const { page, root } = load('<html :list=${["a", "b", "c"]}><body><ul>'
      + '<:foreach :item=${list}>'
      + '<li>Item ${item}</li>'
      + '</:foreach>'
      + '</ul></body></html>');
    root.list = ['a', 'b', 'c', 'x', 'y'];
    assert.equal(
      page.global.doc.toString(),
      '<html data-pl="0"><head data-pl="1"></head><body data-pl="2"><ul>'
      + '<li data-pl="-4">Item <!---t0-->a<!----></li>'
      + '<li data-pl="-4">Item <!---t0-->b<!----></li>'
      + '<li data-pl="-4">Item <!---t0-->c<!----></li>'
      + '<li data-pl="-4">Item <!---t0-->x<!----></li>'
      + '<li data-pl="-4">Item <!---t0-->y<!----></li>'
      + '<template data-pl="3"><li data-pl="4">Item <!---t0--><!----></li></template>'
      + '</ul></body></html>'
    );
  });

  it('005 items removal', () => {
    const { page, root } = load('<html :list=${["a", "b", "c"]}><body><ul>'
      + '<:foreach :item=${list}>'
      + '<li>Item ${item}</li>'
      + '</:foreach>'
      + '</ul></body></html>');
    root.list = ['b', 'c'];
    assert.equal(
      page.global.doc.toString(),
      '<html data-pl="0"><head data-pl="1"></head><body data-pl="2"><ul>'
      + '<li data-pl="-4">Item <!---t0-->b<!----></li>'
      + '<li data-pl="-4">Item <!---t0-->c<!----></li>'
      + '<template data-pl="3"><li data-pl="4">Item <!---t0--><!----></li></template>'
      + '</ul></body></html>'
    );
  });

  it('006 rehydration', () => {
    const { page } = load('<html :list=${["a", "b", "c"]}><body><ul>'
      + '<:foreach :item=${list}>'
      + '<li>Item ${item}</li>'
      + '</:foreach>'
      + '</ul></body></html>');
    // reload
    const doc2 = (page.global.doc as ServerDocument).clone(null, null);
    const page2 = new RuntimePage(p => {
      return new ServerGlobal(
        p, doc2, page.global.pageProps
      );
    });
    assert.equal(
      page2.global.doc.toString(),
      '<html data-pl="0"><head data-pl="1"></head><body data-pl="2"><ul>'
      + '<li data-pl="-4">Item <!---t0-->a<!----></li>'
      + '<li data-pl="-4">Item <!---t0-->b<!----></li>'
      + '<li data-pl="-4">Item <!---t0-->c<!----></li>'
      + '<template data-pl="3"><li data-pl="4">Item <!---t0--><!----></li></template>'
      + '</ul></body></html>'
    );
  });

  it('101 rehydration - empty list', () => {
    const { page } = load('<html :list=${[]}><body><ul>'
      + '<:foreach :item=${list}>'
      + '<li>Item ${item}</li>'
      + '</:foreach>'
      + '</ul></body></html>');
    // reload
    const doc2 = (page.global.doc as ServerDocument).clone(null, null);
    const page2 = new RuntimePage(p => {
      return new ServerGlobal(
        p, doc2, page.global.pageProps
      );
    });
    assert.equal(
      page2.global.doc.toString(),
      '<html data-pl="0"><head data-pl="1"></head><body data-pl="2"><ul>'
      + '<template data-pl="3"><li data-pl="4">Item <!---t0--><!----></li></template>'
      + '</ul></body></html>'
    );
  });

  it('102 rehydration - initial list', () => {
    const { page } = load('<html :list=${["a", "b", "c"]}><body><ul>'
      + '<:foreach :item=${list}>'
      + '<li>Item ${item}</li>'
      + '</:foreach>'
      + '</ul></body></html>');
    // reload
    const doc2 = (page.global.doc as ServerDocument).clone(null, null);
    const page2 = new RuntimePage(p => {
      return new ServerGlobal(
        p, doc2, page.global.pageProps
      );
    });
    assert.equal(
      page2.global.doc.toString(),
      '<html data-pl="0"><head data-pl="1"></head><body data-pl="2"><ul>'
      + '<li data-pl="-4">Item <!---t0-->a<!----></li>'
      + '<li data-pl="-4">Item <!---t0-->b<!----></li>'
      + '<li data-pl="-4">Item <!---t0-->c<!----></li>'
      + '<template data-pl="3"><li data-pl="4">Item <!---t0--><!----></li></template>'
      + '</ul></body></html>'
    );
  });

  it('103 rehydration - items update', () => {
    const { page } = load('<html :list=${["a", "b", "c"]}><body><ul>'
      + '<:foreach :item=${list}>'
      + '<li>Item ${item}</li>'
      + '</:foreach>'
      + '</ul></body></html>');
    // reload
    const doc2 = (page.global.doc as ServerDocument).clone(null, null);
    const page2 = new RuntimePage(p => {
      return new ServerGlobal(
        p, doc2, page.global.pageProps
      );
    });
    page2.root.obj.list = ['a', 'y', 'z'];
    assert.equal(
      page2.global.doc.toString(),
      '<html data-pl="0"><head data-pl="1"></head><body data-pl="2"><ul>'
      + '<li data-pl="-4">Item <!---t0-->a<!----></li>'
      + '<li data-pl="-4">Item <!---t0-->y<!----></li>'
      + '<li data-pl="-4">Item <!---t0-->z<!----></li>'
      + '<template data-pl="3"><li data-pl="4">Item <!---t0--><!----></li></template>'
      + '</ul></body></html>'
    );
  });

  it('104 rehydration - items addition', () => {
    const { page } = load('<html :list=${["a", "b", "c"]}><body><ul>'
      + '<:foreach :item=${list}>'
      + '<li>Item ${item}</li>'
      + '</:foreach>'
      + '</ul></body></html>');
    // reload
    const doc2 = (page.global.doc as ServerDocument).clone(null, null);
    const page2 = new RuntimePage(p => {
      return new ServerGlobal(
        p, doc2, page.global.pageProps
      );
    });
    page2.root.obj.list = ['a', 'y', 'z', 'x', 'y'];
    assert.equal(
      page2.global.doc.toString(),
      '<html data-pl="0"><head data-pl="1"></head><body data-pl="2"><ul>'
      + '<li data-pl="-4">Item <!---t0-->a<!----></li>'
      + '<li data-pl="-4">Item <!---t0-->y<!----></li>'
      + '<li data-pl="-4">Item <!---t0-->z<!----></li>'
      + '<li data-pl="-4">Item <!---t0-->x<!----></li>'
      + '<li data-pl="-4">Item <!---t0-->y<!----></li>'
      + '<template data-pl="3"><li data-pl="4">Item <!---t0--><!----></li></template>'
      + '</ul></body></html>'
    );
  });

  it('105 rehydration - items removal', () => {
    const { page } = load('<html :list=${["a", "b", "c"]}><body><ul>'
      + '<:foreach :item=${list}>'
      + '<li>Item ${item}</li>'
      + '</:foreach>'
      + '</ul></body></html>');
    // reload
    const doc2 = (page.global.doc as ServerDocument).clone(null, null);
    const page2 = new RuntimePage(p => {
      return new ServerGlobal(
        p, doc2, page.global.pageProps
      );
    });
    page2.root.obj.list = ['b', 'c'];
    assert.equal(
      page2.global.doc.toString(),
      '<html data-pl="0"><head data-pl="1"></head><body data-pl="2"><ul>'
      + '<li data-pl="-4">Item <!---t0-->b<!----></li>'
      + '<li data-pl="-4">Item <!---t0-->c<!----></li>'
      + '<template data-pl="3"><li data-pl="4">Item <!---t0--><!----></li></template>'
      + '</ul></body></html>'
    );
  });

});
