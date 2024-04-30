/// <reference types="node" />

import { describe } from 'mocha';
import * as parser from '../../src/source/parser';
import { load } from '../../src/logic/loader';
import { assert } from 'chai';

describe('logic/importer', () => {

  it('1', () => {
    const logic = load(parser.parse(
      '<div :user="x">${x}</div>'
    ), null);
    const root = logic.root;
    assert.equal(Reflect.ownKeys(root.values).length, 1);
    assert.equal(root.texts.length, 1);
  });

});
