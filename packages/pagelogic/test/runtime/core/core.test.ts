import { assert } from 'chai';
import { Context, NAME_KEY, OUTER_KEY, SCOPE_KEY } from '../../../src/runtime/core/context';

describe('runtime: core', () => {

  it('100', () => {
    const ctx = new Context({ root: {
      id: '0'
    }});
    assert.exists(ctx.root);
    assert.equal(ctx.root.id, '0');
  });

  it('101', () => {
    const ctx = new Context({ root: {
      id: '0',
      name: 'root'
    }}).refresh();
    const scope = ctx.root;
    const root = scope.proxy;
    assert.equal(scope, ctx.scopes.get('0'));
    assert.equal(root[SCOPE_KEY], scope);
    assert.equal(root[NAME_KEY], 'root');
    assert.notExists(root[OUTER_KEY]);
  });

  it('102', () => {
    const ctx = new Context({ root: {
      id: '0',
      name: 'root',
      values: {
        x: {
          exp: function() { return 1; }
        }
      }
    }}).refresh();
    const root = ctx.root.proxy;
    assert.equal(root.x, 1);
  });

  it('103', () => {
    const ctx = new Context({ root: {
      id: '0',
      name: 'root',
      values: {
        x: {
          exp: function() { return 1; }
        },
        y: {
          exp: eval('(function() { return this.x * 2; })')
        }
      }
    }}).refresh();
    const root = ctx.root.proxy;
    assert.equal(root.x, 1);
    assert.equal(root.y, 2);
  });

  it('104', () => {
    const ctx = new Context({ root: {
      id: '0',
      name: 'root',
      values: {
        x: {
          exp: function() { return 1; }
        },
        y: {
          exp: eval('(function() { return this.x * 2; })'),
          refs: [
            eval('(function() { return this.$value("x"); })'),
          ]
        }
      }
    }}).refresh();
    const root = ctx.root.proxy;
    assert.equal(root.x, 1);
    assert.equal(root.y, 2);
    root.x = 3;
    assert.equal(root.y, 6);
  });

});
