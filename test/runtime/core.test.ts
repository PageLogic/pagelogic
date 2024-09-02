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

    it("should create a static value", () => {
      let cbValue: unknown;
      const ctx = new Context({
        root: {
          id: '0',
          name: 'app',
          values: {
            v1: {
              val: 1,
              cb: (_, v) => {
                cbValue = v;
                return (v as number) * 2;
              }
            }
          }
        }
      });
      const root = ctx.root;
      assert.equal(root.values['v1'].get(), 2);
      assert.equal(cbValue, 1);
    });

    it("should create a dynamic independent value", () => {
      let cbValue: unknown;
      const ctx = new Context({
        root: {
          id: '0',
          name: 'app',
          values: {
            v2: {
              exp: function() {
                return 2;
              },
              cb: (_, v) => {
                cbValue = v;
                return (v as number) * 2;
              }
            }
          }
        }
      });
      const root = ctx.root;
      assert.equal(root.values['v2'].get(), 4);
      assert.equal(cbValue, 2);
    });

  });

});
