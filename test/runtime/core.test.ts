import { assert } from "chai";
import { Context } from '../../src/runtime/core';

describe('runtime/core', function () {

  describe('context', function() {

    it("should create context", () => {
      const ctx = new Context({
        root: {
          id: '0',
          values: {}
        }
      });
      const root = ctx.root;
      assert.exists(root);
      assert.equal(Reflect.ownKeys(root.values).length, 0);
      assert.equal(root.children.length, 0);
    });

  });

  describe('scope', function() {

    it("should create named root scope", () => {
      const ctx = new Context({
        root: {
          id: '0',
          name: 'app',
          values: {}
        }
      });
      const root = ctx.root;
      assert.exists(root);
      assert.equal(Reflect.ownKeys(root.values).length, 1);
      assert.exists(root.values['app']);
      assert.equal(root.values['app'].get(), root);
      assert.equal(root.children.length, 0);
    });

    it("should create anonymous nested scope", () => {
      const ctx = new Context({
        root: {
          id: '0',
          values: {},
          children: [
            {
              id: '1',
              values: {},
            }
          ],
        }
      });
      const root = ctx.root;
      assert.exists(root);
      assert.equal(Reflect.ownKeys(root.values).length, 0);
      assert.equal(root.children.length, 1);
      const scope = root.children[0];
      assert.exists(scope);
      assert.equal(Reflect.ownKeys(scope.values).length, 0);
      assert.equal(scope.children.length, 0);
    });

  });

  describe('value', function() {
  });

});
