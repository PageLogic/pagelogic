import { assert } from "chai";
import { Context } from '../../src/runtime/core';

describe('runtime/core', function () {

  describe('context', function() {

    it("should creaate context", () => {
      const ctx = new Context({
        root: {
          id: '0',
          values: {}
        }
      });
      assert.exists(ctx.root);
    });

  });

});
