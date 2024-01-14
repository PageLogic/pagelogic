import { assert } from "chai";
import { Context, Scope } from "../../src/runtime/core";

describe('runtime: core', function () {

  describe('global scope', () => {

    it("can see globals", () => {
      const ctx = new Context();
      assert.equal(ctx.global.proxy['console'], console);
    });

    it("can see added global", () => {
      const ctx = new Context();
      globalThis['pageLogicTest'] = 1;
      assert.equal(ctx.global.proxy['pageLogicTest'], 1);
      delete globalThis['pageLogicTest'];
      assert.notExists(ctx.global.proxy['pageLogicTest']);
    });

    it("can add app globals without polluting", () => {
      const ctx = new Context();
      ctx.global.proxy['pageLogicTest'] = 1;
      assert.notExists(globalThis['pageLogicTest']);
      assert.equal(ctx.global.proxy['pageLogicTest'], 1);
      delete ctx.global.proxy['pageLogicTest'];
      assert.notExists(ctx.global.proxy['pageLogicTest']);
    });

  });

  describe('root scope', () => {

    it("is visible from global by name", () => {
      const { context, root } = contextWithRoot();
      assert.equal(context.global.proxy['root'], root.proxy);
      assert.equal(root.proxy['root'], root.proxy);
    });

    it("can see app globals", () => {
      const { context, root } = contextWithRoot();
      context.global.proxy['pageLogicTest'] = 1;
      assert.equal(root.proxy['pageLogicTest'], 1);
    });

  });

  describe('child scope', () => {

    it("is visible from global by name", () => {
      const { context, root } = contextWithRoot();
      const child = new Scope(context);
      child.link(root, 'child');
      assert.equal(context.global.proxy['root']['child'], child.proxy);
      assert.equal(root.proxy['child'], child.proxy);
      assert.equal(child.proxy['child'], child.proxy);
    });

    it("can see app globals", () => {
      const { context, root } = contextWithRoot();
      const child = new Scope(context);
      child.link(root, 'child');
      context.global.proxy['pageLogicTest'] = 1;
      assert.equal(child.proxy['pageLogicTest'], 1);
    });

  });

  describe('scope values', () => {

    it("can add value", () => {
      const { context, root } = contextWithRoot();

    });

  });

});

function contextWithRoot(): { root: Scope, context: Context } {
  const context = new Context();
  const root = new Scope(context);
  root.link(context.global, 'root');
  return { root, context };
}
