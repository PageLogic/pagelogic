/// <reference types="node" />

import { describe } from 'mocha';
import * as parser from '../../src/source/parser';
import { load } from '../../src/logic/loader';
import { assert } from 'chai';
import { resolve } from '../../src/logic/resolver';
import { qualify } from '../../src/logic/qualifier';
import { generate } from 'escodegen';

describe('logic/resolver', () => {

  it('001', () => {
    const logic = resolve(qualify(load(parser.parse(
      '<div :user="me">${x}</div>'
    ), null)));
    assert.equal(logic.errors.length, 1);
    assert.equal(logic.errors[0].msg, 'Reference not found: x');
  });

  it('002', () => {
    const logic = resolve(qualify(load(parser.parse(
      '<div :x="me">${x}</div>'
    ), null)));
    assert.equal(logic.errors.length, 0);
    assert.equal(logic.root.texts.length, 1);
    const value = logic.root.texts[0];
    assert.equal(value.refs.length, 1);
    assert.equal(generate(value.refs[0]), 'this.x');
  });

  it('101', () => {
    const logic = resolve(qualify(load(parser.parse(
      '<div :user="me"><div :v="1">${x}</div></div>'
    ), null)));
    assert.equal(logic.errors.length, 1);
    assert.equal(logic.errors[0].msg, 'Reference not found: x');
  });

  it('102', () => {
    const logic = resolve(qualify(load(parser.parse(
      '<div :x="me"><div :v="1">${x}</div></div>'
    ), null)));
    assert.equal(logic.errors.length, 0);
    assert.equal(logic.root.children[0].texts.length, 1);
    const value = logic.root.children[0].texts[0];
    assert.equal(value.refs.length, 1);
    assert.equal(generate(value.refs[0]), 'this.x');
  });

  it('201', () => {
    const source = parser.parse(
      `<div :user="me">
        \${item.x}
        <div :$name="item"/>
      </div>`
    );
    const logic = load(source, null);
    qualify(logic);
    resolve(logic);
    assert.equal(logic.errors.length, 1);
    assert.equal(logic.errors[0].msg, 'Reference not found: item.x');
  });

  it('202', () => {
    const logic = resolve(qualify(load(parser.parse(
      `<div :user="me">
        \${item.x}
        <div :$name="item" :x="1"/>
      </div>`
    ), null)));
    assert.equal(logic.errors.length, 0);
    assert.equal(logic.root.texts.length, 1);
    const value = logic.root.texts[0];
    assert.equal(value.refs.length, 1);
    assert.equal(generate(value.refs[0]), 'this.item.x');
  });

});
