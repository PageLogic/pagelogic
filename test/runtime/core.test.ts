import { assert } from "chai";
import { Context, Scope } from "../../src/runtime/core";

describe('runtime: core', function () {

  describe('global scope', () => {

    it("1", () => {
      const ctx = new Context();
      assert.equal(ctx.global.proxy['console'], console);
    });

    it("2", () => {
      const ctx = new Context();
      globalThis['pageLogicTest'] = 1;
      assert.equal(ctx.global.proxy['pageLogicTest'], 1);
      delete globalThis['pageLogicTest'];
      assert.notExists(ctx.global.proxy['pageLogicTest']);
    });

    it("3", () => {
      const ctx = new Context();
      ctx.global.proxy['pageLogicTest'] = 1;
      assert.notExists(globalThis['pageLogicTest']);
      assert.equal(ctx.global.proxy['pageLogicTest'], 1);
      delete ctx.global.proxy['pageLogicTest'];
      assert.notExists(ctx.global.proxy['pageLogicTest']);
    });

  });

  describe('root scope', () => {

    it("1", () => {
      const ctx = new Context();
      const root = new Scope(ctx);
      root.link(ctx.global, 'page');
      assert.equal(ctx.global.proxy['page'], root.proxy);
      assert.equal(root.proxy['page'], root.proxy);
    });

  });

});
