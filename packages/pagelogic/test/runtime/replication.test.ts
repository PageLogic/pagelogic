import { assert } from 'chai';
import { describe } from 'mocha';
import { boot } from '../../src/runtime/boot';
import { CoreFactory } from '../../src/runtime/core';

const coreFactory = new CoreFactory();

describe.skip('runtime: replication', () => {

  it('should replicate element w/ local data', () => {
    const { root } = boot({
      id: 0,
      values: {},
      children: [
        {
          id: 1,
          values: {
            $listFor: { fn: function() { return ['a', 'b']; } }
          }
        }
      ]
    }, coreFactory);

    assert.equal(root.$children.length, 2);
  });

  it('should replicate element w/ inherited data', () => {
    const { root } = boot({
      id: 0,
      values: {
        list: { fn: function() { return ['a', 'b']; } }
      },
      children: [
        {
          id: 1,
          values: {
            $listFor: {
              fn: function() { return this.list; },
              refs: [
                function() { return this.$value('list'); }
              ]
            }
          }
        }
      ]
    }, coreFactory);

    assert.equal(root.$children.length, 2);
  });

  it('should increase replicated elements', () => {
    const { root } = boot({
      id: 0,
      values: {
        list: { fn: function() { return ['a', 'b']; } }
      },
      children: [
        {
          id: 1,
          values: {
            $listFor: {
              fn: function() { return this.list; },
              refs: [
                function() { return this.$value('list'); }
              ]
            }
          }
        }
      ]
    }, coreFactory);

    root.list = ['x', 'y', 'z'];
    assert.equal(root.$children.length, 3);
  });

  it('should decrease replicated elements', () => {
    const { root } = boot({
      id: 0,
      values: {
        list: { fn: function() { return ['a', 'b']; } }
      },
      children: [
        {
          id: 1,
          values: {
            $listFor: {
              fn: function() { return this.list; },
              refs: [
                function() { return this.$value('list'); }
              ]
            }
          }
        }
      ]
    }, coreFactory);

    root.list = ['x'];
    assert.equal(root.$children.length, 1);
  });

});
