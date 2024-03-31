import { assert } from 'chai';
import { describe } from 'mocha';
import { CoreFactory, Value } from '../../src/runtime/core';
import { boot } from '../../src/runtime/boot';

const coreFactory = new CoreFactory();

describe('runtime: boot', () => {

  it('should access values via proxy', () => {
    const { root } = boot({
      id: 0,
      values: {
        x: { fn: function() { return 1; }},
        y: { fn: function() { return 2; }},
      }
    }, coreFactory);

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
    }, coreFactory);
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

  it('should support scope name', () => {
    const { root } = boot({
      id: 0,
      values: {},
      children: [
        {
          id: 1,
          values: {
            $name: 'body',
            y: { fn: function() { return 20; }},
          }
        }
      ]
    }, coreFactory);
    const scope0 = root;
    const scope1 = root.$children[0];

    assert.equal(scope1.$name, 'body');
    assert.equal(scope0.body, scope1);
    assert.equal(scope0.body.y, 20);
  });

});
