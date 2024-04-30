/// <reference types="node" />

import { describe } from 'mocha';
import * as parser from '../../src/source/parser';
import { load } from '../../src/logic/loader';
import { assert } from 'chai';
import { qualify } from '../../src/logic/qualifier';
import { generate } from 'escodegen';

describe('logic/qualifier', () => {

  it('001', () => {
    const logic = qualify(load(parser.parse(
      '<div>${x}</div>'
    ), null));
    const scope = logic.root;
    assert.equal(
      generate(scope.texts[0].val),
      'this.x'
    );
  });

  it('002', () => {
    const logic = qualify(load(parser.parse(
      '<div><div>${x}</div></div>'
    ), null));
    const scope = logic.root;
    assert.equal(
      generate(scope.texts[0].val),
      'this.x'
    );
  });

  it('003', () => {
    const logic = qualify(load(parser.parse(
      '<div><div :v="">${x}</div></div>'
    ), null));
    const scope = logic.root.children[0];
    assert.equal(
      generate(scope.texts[0].val),
      'this.x'
    );
  });

  it('101', () => {
    const logic = qualify(load(parser.parse(
      '<div :v=${x}></div>'
    ), null));
    const scope = logic.root;
    assert.equal(
      generate(scope.values['v'].val),
      'this.x'
    );
  });

  it('102', () => {
    const logic = qualify(load(parser.parse(
      '<div><div :v=${x}></div></div>'
    ), null));
    const scope = logic.root.children[0];
    assert.equal(
      generate(scope.values['v'].val),
      'this.x'
    );
  });

  it('201', () => {
    const logic = qualify(load(parser.parse(
      `<div :v=\${() => {
        let x = 1;
        return x;
      }}></div>`
    ), null));
    const scope = logic.root;
    assert.equal(
      parser.normalizeText(generate(scope.values['v'].val)),
      parser.normalizeText(`function () {
        let x = 1;
        return x;
      }`)
    );
  });

  it('202', () => {
    const logic = qualify(load(parser.parse(
      `<div :v=\${() => {
        let y = 1;
        return x;
      }}></div>`
    ), null));
    const scope = logic.root;
    assert.equal(
      parser.normalizeText(generate(scope.values['v'].val)),
      parser.normalizeText(`function () {
        let y = 1;
        return this.x;
      }`)
    );
  });

  it('203', () => {
    const logic = qualify(load(parser.parse(
      `<div :v=\${(x) => {
        let y = 1;
        return x;
      }}></div>`
    ), null));
    const scope = logic.root;
    assert.equal(
      parser.normalizeText(generate(scope.values['v'].val)),
      parser.normalizeText(`function (x) {
        let y = 1;
        return x;
      }`)
    );
  });

  it('204', () => {
    const logic = qualify(load(parser.parse(
      `<div :v=\${(x) => {
        return (() => x);
      }}></div>`
    ), null));
    const scope = logic.root;
    assert.equal(
      parser.normalizeText(generate(scope.values['v'].val)),
      parser.normalizeText(`function (x) {
        return () => x;
      }`)
    );
  });

  it('205', () => {
    const logic = qualify(load(parser.parse(
      `<div :v=\${(y) => {
        return (() => x);
      }}></div>`
    ), null));
    const scope = logic.root;
    assert.equal(
      parser.normalizeText(generate(scope.values['v'].val)),
      parser.normalizeText(`function (y) {
        return () => this.x;
      }`)
    );
  });

  it('301', () => {
    const logic = qualify(load(parser.parse(
      `<div :v=\${function() {
        let x = 1;
        return x;
      }}></div>`
    ), null));
    const scope = logic.root;
    assert.equal(
      parser.normalizeText(generate(scope.values['v'].val)),
      parser.normalizeText(`function () {
        let x = 1;
        return x;
      }`)
    );
  });

  it('302', () => {
    const logic = qualify(load(parser.parse(
      `<div :v=\${function(x) {
        return x;
      }}></div>`
    ), null));
    const scope = logic.root;
    assert.equal(
      parser.normalizeText(generate(scope.values['v'].val)),
      parser.normalizeText(`function (x) {
        return x;
      }`)
    );
  });

  it('303', () => {
    const logic = qualify(load(parser.parse(
      `<div :v=\${function() {
        return x;
      }}></div>`
    ), null));
    const scope = logic.root;
    assert.equal(
      parser.normalizeText(generate(scope.values['v'].val)),
      parser.normalizeText(`function () {
        return this.x;
      }`)
    );
  });

  it('401', () => {
    const logic = qualify(load(parser.parse(
      `<div :v=\${function() {
        const f = () => x;
        return f();
      }}></div>`
    ), null));
    const scope = logic.root;
    assert.equal(
      parser.normalizeText(generate(scope.values['v'].val)),
      parser.normalizeText(`function () {
        const f = () => this.x;
        return f();
      }`)
    );
  });

  it('402', () => {
    const logic = qualify(load(parser.parse(
      `<div :v=\${function(x) {
        const f = () => x;
        return f();
      }}></div>`
    ), null));
    const scope = logic.root;
    assert.equal(
      parser.normalizeText(generate(scope.values['v'].val)),
      parser.normalizeText(`function (x) {
        const f = () => x;
        return f();
      }`)
    );
  });

});
