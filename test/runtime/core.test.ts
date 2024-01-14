import { assert } from "chai";
import { Context, Scope } from "../../src/runtime/core";

describe('runtime: core', function () {

  it("global scope", () => {
    const ctx = new Context();
    assert.equal(ctx.global.proxy['console'], console);
  });

  it("root scope", () => {
    const ctx = new Context();
    const root = new Scope(ctx);
    root.link(ctx.global, 'page');
    assert.equal(ctx.global.proxy['page'], root.proxy);
    assert.equal(root.proxy['page'], root.proxy);
  });

});
