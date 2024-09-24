import { assert } from 'chai';
import { compile } from '../../src/compiler/compiler';
import { Element } from '../../src/html/dom';
import { parse } from '../../src/html/parser';
import { ScopeObj } from '../../src/page/scope';
import { RuntimePage } from '../../src/runtime/runtime-page';
import { ServerGlobal } from '../../src/server/server-global';

function load(html: string): ScopeObj {
  // compile
  const src = parse(html, 'test');
  assert.equal(src.errors.length, 0);
  const comp = compile(src);
  assert.equal(comp.errors.length, 0);
  // load
  const glob = new ServerGlobal(comp.glob.doc, comp.glob.props);
  const page = new RuntimePage(glob);
  return page.root.obj;
}

describe('runtime/base', () => {

  it('001', () => {
    const page = load('<html></html>');
    assert.isUndefined(page.$parent);
    assert.equal(page.$id, 0);
    assert.equal(page.$name, 'page');
    assert.equal(page.$isolated, false);
    assert.equal((page.$dom as Element).name, 'HTML');
    assert.equal((page.$children as Array<unknown>).length, 2);

    const head = (page.$children as Array<unknown>)[0] as ScopeObj;
    assert.equal(head.$parent, page);
    assert.equal(head.$id, 1);
    assert.equal(head.$name, 'head');
    assert.equal(head.$isolated, false);
    assert.equal((head.$dom as Element).name, 'HEAD');

    const body = (page.$children as Array<unknown>)[1] as ScopeObj;
    assert.equal(head.$parent, page);
    assert.equal(body.$id, 2);
    assert.equal(body.$name, 'body');
    assert.equal(body.$isolated, false);
    assert.equal((body.$dom as Element).name, 'BODY');
  });

  it('002', () => {
    const page = load('<html :x=${1}></html>');
    assert.equal(page.x, 1);
  });

  it('003', () => {
    const page = load('<html :x=${1} :y=${x * 2}></html>');
    assert.equal(page.x, 1);
    assert.equal(page.y, 2);
    page.x = 3;
    assert.equal(page.y, 6);
  });

  it('004', () => {
    const page = load('<html :x=${1} :y=${() => x * 2}></html>');
    assert.equal(page.x, 1);
    assert.equal((page.y as () => unknown)(), 2);
    page.x = 3;
    assert.equal((page.y as () => unknown)(), 6);
  });

  it('101', () => {
    const page = load('<html lang="en"></html>');
    assert.notExists(page.attr$lang);
    assert.equal(
      (page.$dom as Element).toString(),
      '<html lang="en" data-lid="0">'
        + '<head data-lid="1"></head>'
        + '<body data-lid="2"></body>'
        + '</html>'
    );
  });

  it('102', () => {
    const page = load('<html lang=${"en"}></html>');
    assert.equal(page.attr$lang, 'en');
    assert.equal(
      (page.$dom as Element).toString(),
      '<html data-lid="0" lang="en">'
        + '<head data-lid="1"></head>'
        + '<body data-lid="2"></body>'
        + '</html>'
    );
  });

  it('103', () => {
    const page = load('<html><body> ${"hi"} </body></html>');
    assert.equal(
      (page.$dom as Element).toString(),
      '<html data-lid="0">'
        + '<head data-lid="1"></head>'
        + '<body data-lid="2"> <!---t0-->hi<!----> </body>'
        + '</html>'
    );
  });

  it('104', () => {
    const page = load('<html><body>${"hi"} </body></html>');
    assert.equal(
      (page.$dom as Element).toString(),
      '<html data-lid="0">'
        + '<head data-lid="1"></head>'
        + '<body data-lid="2"><!---t0-->hi<!----> </body>'
        + '</html>'
    );
  });

  it('105', () => {
    const page = load('<html><body> ${"hi"}</body></html>');
    assert.equal(
      (page.$dom as Element).toString(),
      '<html data-lid="0">'
        + '<head data-lid="1"></head>'
        + '<body data-lid="2"> <!---t0-->hi<!----></body>'
        + '</html>'
    );
  });

  it('106', () => {
    const page = load('<html><body>${"hi"}</body></html>');
    assert.equal(
      (page.$dom as Element).toString(),
      '<html data-lid="0">'
        + '<head data-lid="1"></head>'
        + '<body data-lid="2"><!---t0-->hi<!----></body>'
        + '</html>'
    );
  });

});
