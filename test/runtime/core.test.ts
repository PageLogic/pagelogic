import { assert } from "chai";
import { Context, Scope, UNINITED, Value } from "../../src/runtime/core";

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
      const v1 = new Value(context, root, () => 1);
      assert.isUndefined(v1.get());
      context.refresh();
      assert.equal(v1.get(), 1);
    });

    it("can add value callback", () => {
      const { context, root } = contextWithRoot();
      const v1 = new Value(context, root, () => 1);
      v1.cb = v => v * 3;
      context.refresh();
      assert.equal(v1.get(), 3);
    });

    it("can update local dependent value", () => {
      const { context, root } = contextWithRoot();
      const v1 = new Value(context, root, () => 1, 'x1');
      // @ts-ignore
      const v2 = new Value(context, root, () => { with(root.proxy) return x1 + 3 }, 'x2', [
        // @ts-ignore
        () => $value('x1')
      ]);
      context.refresh();
      assert.equal(v1.get(), 1);
      assert.equal(v2.get(), 4);
      v1.set(2);
      assert.equal(v1.get(), 2);
      assert.equal(v2.get(), 5);
    });

  });

});

function contextWithRoot(): {
  root: Scope, global: Scope, context: Context
} {
  const context = new Context();
  const global = context.global;
  const root = new Scope(context).link(global, 'root');
  return { root, global, context };
}
