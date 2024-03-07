import { assert } from 'chai';
import { Context } from '../../../src/runtime/core/context';

describe('runtime: core', () => {

  it('001', () => {
    const ctx = new Context({ root: {
      id: 'root'
    }});
    assert.exists(ctx.root);
  });

});
