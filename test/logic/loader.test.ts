/// <reference types="node" />

import * as acorn from 'acorn';
import { describe } from 'mocha';
import * as parser from '../../src/source/parser';
import { load } from '../../src/logic/loader';
import { assert } from 'chai';

describe('logic/loader', () => {

  it('should extract logic values and texts', () => {
    const source = parser.parse(
      '<div :user="x" title=${"a title"}>hello ${user}!</div>'
    );
    const logic = load(source, null);
    assert.equal(
      source.doc.toString(),
      '<div data-pl-id="0">hello <!---t0--><!---/t-->!</div>'
    );
    assert.deepEqual(
      cleanup(logic.root),
      {
        type: 'scope',
        id: '0',
        name: null,
        tagName: 'DIV',
        values: {
          'user': { type: 'value', key: ':user', val: 'x' },
          'attr$title': { type: 'value', key: 'title', val: '<exp>' }
        },
        texts: [{ type: 'value', val: '<exp>' }],
        children: []
      }
    );
  });

  it('shouldn\'t create needless scopes', () => {
    const source = parser.parse(
      '<div :user="x" title=${"a title"}>' +
        'hello <span>${user}</span>!' +
      '</div>'
    );
    const logic = load(source, null);
    assert.equal(
      source.doc.toString(),
      '<div data-pl-id="0">' +
        'hello <span><!---t0--><!---/t--></span>!' +
      '</div>'
    );
    assert.deepEqual(
      cleanup(logic.root),
      {
        type: 'scope',
        id: '0',
        name: null,
        tagName: 'DIV',
        values: {
          'user': { type: 'value', key: ':user', val: 'x' },
          'attr$title': { type: 'value', key: 'title', val: '<exp>' }
        },
        texts: [{ type: 'value', val: '<exp>' }],
        children: []
      }
    );
  });

  it('should create nested scopes', () => {
    const source = parser.parse(
      '<div :user="x" title=${"a title"}>' +
        'hello <span>${user}</span>!' +
        '<div title=${"another title"}>!</div>' +
      '</div>'
    );
    const logic = load(source, null);
    assert.equal(
      source.doc.toString(),
      '<div data-pl-id="0">' +
        'hello <span><!---t0--><!---/t--></span>!' +
        '<div data-pl-id="1">!</div>' +
      '</div>'
    );
    assert.deepEqual(
      cleanup(logic.root),
      {
        type: 'scope',
        id: '0',
        name: null,
        tagName: 'DIV',
        values: {
          'user': { type: 'value', key: ':user', val: 'x' },
          'attr$title': { type: 'value', key: 'title', val: '<exp>' }
        },
        texts: [{ type: 'value', val: '<exp>' }],
        children: [
          {
            type: 'scope',
            id: '1',
            name: null,
            tagName: 'DIV',
            values: {
              'attr$title': { type: 'value', key: 'title', val: '<exp>' }
            },
            texts: [],
            children: []
          }
        ]
      }
    );
  });

  it('should parse value expression (1)', () => {
    const logic = load(parser.parse(
      '<div :v=${x}/>'
    ), null);
    const value = logic.root.values['v'];
    assert.exists(value);
    assert.exists(value.val);
    assert.equal((value.val as acorn.Expression).type, 'Identifier');
  });

  it('should parse value expression (2)', () => {
    const logic = load(parser.parse(
      '<div :v=${function() { return 1; }}/>'
    ), null);
    const value = logic.root.values['v'];
    assert.exists(value);
    assert.exists(value.val);
    assert.equal((value.val as acorn.Expression).type, 'FunctionExpression');
  });

  it('should parse value expression (3)', () => {
    const logic = load(parser.parse(
      '<div :v=${() => 1}/>'
    ), null);
    const value = logic.root.values['v'];
    assert.exists(value);
    assert.exists(value.val);
    // first level functions are always forced to classic functions
    // (rather than arrow functions)
    assert.equal((value.val as acorn.Expression).type, 'FunctionExpression');
  });

});

function cleanup(scope: unknown): unknown {
  return JSON.parse(JSON.stringify(scope, (k, v) =>
    (k === 'val' && typeof v === 'object')
      ? '<exp>'
      : (k === 'parent' || k === 'src' || k === 'refs' ? undefined : v)
  ));
}
