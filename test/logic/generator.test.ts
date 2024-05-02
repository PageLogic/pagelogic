/// <reference types="node" />

import { describe } from 'mocha';
import * as parser from '../../src/source/parser';
import { load } from '../../src/logic/loader';
import { assert } from 'chai';
import { resolve } from '../../src/logic/resolver';
import { qualify } from '../../src/logic/qualifier';
import { generator } from '../../src/logic/generator';
import { generate } from 'escodegen';
import { normalizeSpace } from 'trillo/preprocessor/util';
import { SCOPE_VALUE_KEY } from '../../src/runtime/boot';

describe('logic/generator', () => {

  it('101', () => {
    const logic = resolve(qualify(load(parser.parse(
      '<div :v="1">${v}</div>'
    ), null)));
    const ast = generator(logic);
    assert.equal(
      normalizeSpace(generate(ast)),
      normalizeSpace(`{
        id: '0',
        values: {
          v: {
            fn: function () { return '1'; }
          },
          text$0: {
            fn: function () { return this.v; },
            refs: [function () { return this.${SCOPE_VALUE_KEY}('v'); }]
          }
        },
        name: 'page',
        children: [
          { id: '1', values: {}, name: 'head' },
          { id: '2', values: {}, name: 'body' }
        ]
      }`)
    );
  });

  it('102', () => {
    const logic = resolve(qualify(load(parser.parse(
      '<div>${scope2.v}<div :$name="scope2" :v="1"/></div>'
    ), null)));
    const ast = generator(logic);
    assert.equal(
      normalizeSpace(generate(ast)),
      normalizeSpace(`{
        id: '0',
        values: {
          text$0: {
            fn: function () { return this.scope2.v; },
            refs: [function () { return this.scope2.$value('v'); }]
          }
        },
        name: 'page',
        children: [
          { id: '1', values: { v: { fn: function () { return '1'; } } }, name: 'scope2' },
          { id: '2', values: {}, name: 'head' },
          { id: '3', values: {}, name: 'body' }
        ]
      }`)
    );
  });

  it('103', () => {
    const logic = resolve(qualify(load(parser.parse(
      '<div>${scope2["v"]}<div :$name="scope2" :v="1"/></div>'
    ), null)));
    assert.equal(logic.errors.length, 0);
    const ast = generator(logic);
    assert.equal(
      normalizeSpace(generate(ast)),
      normalizeSpace(`{
        id: '0',
        values: {
          text$0: {
            fn: function () { return this.scope2.v; },
            refs: [function () { return this.scope2.$value('v'); }]
          }
        },
        name: 'page',
        children: [
          { id: '1', values: { v: { fn: function () { return '1'; } } }, name: 'scope2' },
          { id: '2', values: {}, name: 'head' },
          { id: '3', values: {}, name: 'body' }
        ]
      }`)
    );
  });

  it('104', () => {
    const logic = resolve(qualify(load(parser.parse(
      '<div>${scope2.v.a}<div :$name="scope2" :v=${{a: 1, b: 2}}/></div>'
    ), null)));
    const ast = generator(logic);
    assert.equal(
      normalizeSpace(generate(ast)),
      normalizeSpace(`{
        id: '0',
        values: {
          text$0: {
            fn: function () { return this.scope2.v.a; },
            refs: [function () { return this.scope2.$value('v'); }]
          }
        },
        name: 'page',
        children: [
          { id: '1', values: { v: { fn: function () { return { a: 1, b: 2 }; } } }, name: 'scope2' },
          { id: '2', values: {}, name: 'head' },
          { id: '3', values: {}, name: 'body' }
        ]
      }`)
    );
  });

  it('105', () => {
    const logic = resolve(qualify(load(parser.parse(
      '<div>${scope2.v}</div>'
    ), null)));
    assert.equal(logic.errors.length, 1);
    assert.equal(logic.errors[0].msg, 'Reference not found: scope2.v');
  });

});
