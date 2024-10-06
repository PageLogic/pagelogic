import { assert } from 'chai';
import { compile } from '../../src/compiler/compiler';
import { Element } from '../../src/html/dom';
import { parse } from '../../src/html/parser';
import { ScopeObj } from '../../src/page/scope';
import { RuntimePage } from '../../src/runtime/runtime-page';
import { ServerGlobal } from '../../src/server/server-global';
import { Page } from '../../src/page/page';

function load(html: string): { page: Page, root: ScopeObj } {
  // compile
  const src = parse(html, 'test');
  assert.equal(src.errors.length, 0);
  const comp = compile(src);
  assert.equal(comp.errors.length, 0);
  // load
  const glob = new ServerGlobal(comp.global.doc, comp.global.props);
  const page = new RuntimePage(glob);
  return { page, root: page.root.obj };
}

describe('runtime/base', () => {

  it('001', () => {
    const { root } = load('<html></html>');
    //assert.isUndefined(root.$parent);
    assert.equal(root.$id, 0);
    assert.equal(root.$name, 'page');
    assert.equal(root.$isolated, false);
    assert.equal((root.$dom as Element).tagName, 'HTML');
    assert.equal((root.$children as Array<unknown>).length, 2);

    const head = (root.$children as Array<unknown>)[0] as ScopeObj;
    assert.equal(head.$parent, root);
    assert.equal(head.$id, 1);
    assert.equal(head.$name, 'head');
    assert.equal(head.$isolated, false);
    assert.equal((head.$dom as Element).tagName, 'HEAD');

    const body = (root.$children as Array<unknown>)[1] as ScopeObj;
    assert.equal(head.$parent, root);
    assert.equal(body.$id, 2);
    assert.equal(body.$name, 'body');
    assert.equal(body.$isolated, false);
    assert.equal((body.$dom as Element).tagName, 'BODY');
  });

  it('002', () => {
    const { root } = load('<html :x=${1}></html>');
    assert.equal(root.x, 1);
  });

  it('003', () => {
    const { root } = load('<html :x=${1} :y=${x * 2}></html>');
    assert.equal(root.x, 1);
    assert.equal(root.y, 2);
    root.x = 3;
    assert.equal(root.y, 6);
  });

  it('004', () => {
    const { root } = load('<html :x=${1} :y=${() => x * 2}></html>');
    assert.equal(root.x, 1);
    assert.equal((root.y as () => unknown)(), 2);
    root.x = 3;
    assert.equal((root.y as () => unknown)(), 6);
  });

  it('101', () => {
    const { root } = load('<html lang="en"></html>');
    assert.notExists(root.attr$lang);
    assert.equal(
      (root.$dom as Element).toString(),
      '<html lang="en" data-pl="0">'
        + '<head data-pl="1"></head>'
        + '<body data-pl="2"></body>'
        + '</html>'
    );
  });

  it('102', () => {
    const { root } = load('<html lang=${"en"}></html>');
    assert.equal(root.attr$lang, 'en');
    assert.equal(
      (root.$dom as Element).toString(),
      '<html data-pl="0" lang="en">'
        + '<head data-pl="1"></head>'
        + '<body data-pl="2"></body>'
        + '</html>'
    );
  });

  it('103', () => {
    const { root } = load('<html><body> ${"hi"} </body></html>');
    assert.equal(
      (root.$dom as Element).toString(),
      '<html data-pl="0">'
        + '<head data-pl="1"></head>'
        + '<body data-pl="2"> <!---t0-->hi<!----> </body>'
        + '</html>'
    );
  });

  it('104', () => {
    const { root } = load('<html><body>${"hi"} </body></html>');
    assert.equal(
      (root.$dom as Element).toString(),
      '<html data-pl="0">'
        + '<head data-pl="1"></head>'
        + '<body data-pl="2"><!---t0-->hi<!----> </body>'
        + '</html>'
    );
  });

  it('105', () => {
    const { root } = load('<html><body> ${"hi"}</body></html>');
    assert.equal(
      (root.$dom as Element).toString(),
      '<html data-pl="0">'
        + '<head data-pl="1"></head>'
        + '<body data-pl="2"> <!---t0-->hi<!----></body>'
        + '</html>'
    );
  });

  it('106', () => {
    const { root } = load('<html><body>${"hi"}</body></html>');
    assert.equal(
      (root.$dom as Element).toString(),
      '<html data-pl="0">'
        + '<head data-pl="1"></head>'
        + '<body data-pl="2"><!---t0-->hi<!----></body>'
        + '</html>'
    );
  });

  it('201', () => {
    const { root } = load('<html :v="hi"><body>${v}</body></html>');
    assert.equal(
      (root.$dom as Element).toString(),
      '<html data-pl="0">'
        + '<head data-pl="1"></head>'
        + '<body data-pl="2"><!---t0-->hi<!----></body>'
        + '</html>'
    );
  });

  it('202', () => {
    const { root } = load('<html :v="hi"><body>${v}</body></html>');
    root.v = ':-)';
    assert.equal(
      (root.$dom as Element).toString(),
      '<html data-pl="0">'
        + '<head data-pl="1"></head>'
        + '<body data-pl="2"><!---t0-->:-)<!----></body>'
        + '</html>'
    );
  });

  it('301', () => {
    const { root } = load('<html :v=${body.v + "!"}><body :v="hi"></body></html>');
    assert.equal(root.v, 'hi!');
  });

  it('302', () => {
    const { root } = load('<html><head :v="hi"></head><body>${head.v}!</body></html>');
    assert.equal(
      (root.$dom as Element).toString(),
      '<html data-pl="0">'
        + '<head data-pl="1"></head>'
        + '<body data-pl="2"><!---t0-->hi<!---->!</body>'
        + '</html>'
    );
    // @ts-expect-error root is of type `unknown`
    root.head.v = 'hello';
    assert.equal(
      (root.$dom as Element).toString(),
      '<html data-pl="0">'
        + '<head data-pl="1"></head>'
        + '<body data-pl="2"><!---t0-->hello<!---->!</body>'
        + '</html>'
    );
  });

  it('303', () => {
    const { root } = load('<html><body><div ::name="div" :v="hi"></div></body></html>');
    // @ts-expect-error root is of type `unknown`
    assert.equal(root.body.div.v, 'hi');
  });

  it('304', () => {
    const { page, root } = load('<html><body><div ::name="div" :v="hi"></div></body></html>');
    // @ts-expect-error root is of type `unknown`
    assert.exists(root.body.div?.v);
    const bodyScope = page.root.children[1];
    const divScope = bodyScope.children[0];
    page.unlinkScope(divScope);
    // @ts-expect-error root is of type `unknown`
    assert.notExists(root.body.div?.v);
    page.relinkScope(divScope, bodyScope);
    // @ts-expect-error root is of type `unknown`
    assert.exists(root.body.div?.v);
  });

  it('401', () => {
    const { page, root } = load('<html :v=${1}></html>');
    const v = root.v;
    assert.exists(v);
    try {
      delete root.v;
    } catch (ignored) { /* nop */ }
    // values cannot be deleted
    assert.equal(root.v, v);

    root.v = 2;
    // values can be written
    assert.notEqual(root.v, v);
  });

  it('402', () => {
    const { page } = load('<html :v=${1}></html>');

    const console = page.global.obj.console;
    assert.exists(console);
    try {
      delete page.global.obj['console'];
    } catch (ignored) { /* nop */ }
    // global values cannot be deleted
    assert.equal(page.global.obj.console, console);

    try {
      page.global.obj.console = () => {};
    } catch (ignored) { /* nop */ }
    // global values cannot be written
    assert.equal(page.global.obj.console, console);
  });

});
