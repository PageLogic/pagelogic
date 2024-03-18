import { assert } from 'chai';
import { describe } from 'mocha';
import { Context, Props, RefFunction, Scope, Value, ValueFunction, newScope } from '../../src/runtime/core';
import { boot, BootFactory } from '../../src/runtime/boot';

const factory = new class implements BootFactory {
  newContext(): Context {
    return new Context();
  }
  newScope(ctx: Context, props: Props, parent: Scope | null, proto: object | null, isolate: boolean): Scope {
    return newScope(ctx, props, parent, proto, isolate);
  }
  newValue(scope: Scope, fn: ValueFunction, refs?: RefFunction[] | undefined): Value {
    const ret = new Value(fn, refs);
    ret.scope = scope;
    return ret;
  }
};

describe('runtime: boot', () => {

  it('should access values via proxy', () => {
    const { root } = boot({
      id: 0,
      values: {
        x: { fn: function() { return 1; }},
        y: { fn: function() { return 2; }},
      }
    }, factory);

    assert.equal(root.x, 1);
    assert.equal(root.y, 2);
    assert.notEqual(root.x, root.$object.x);
    assert.instanceOf(root.$object.x, Value);
    assert.typeOf(root.x, 'number');
    assert.typeOf(root.y, 'number');
  });

  it('should support scope inheritance', () => {
    const { root } = boot({
      id: 0,
      values: {
        x: { fn: function() { return 1; }},
        y: { fn: function() { return 2; }},
      },
      children: [
        {
          id: 1,
          values: {
            z: { fn: function() { return 3; }},
          }
        }
      ]
    }, factory);
    const scope0 = root;
    const scope1 = root.$children[0];

    assert.equal(scope1.x, 1);
    assert.equal(scope1.y, 2);
    // assert.notEqual(scope1.x, scope1.$object.x);
    assert.instanceOf(scope0.$object.x, Value);
    assert.typeOf(scope1.x, 'number');
    assert.equal(scope1.y, 2);

    assert.equal(scope1.z, 3);
    assert.isFalse(Reflect.ownKeys(scope1.$object).includes('y'));
    scope1.y = 4;
    assert.isFalse(Reflect.ownKeys(scope1.$object).includes('y'));
    assert.equal(scope1.y, 4);
    assert.equal(scope0.y, 4);
  });

});
