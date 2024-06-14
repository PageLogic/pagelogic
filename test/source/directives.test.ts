/// <reference types="node" />

import { describe } from 'mocha';
import path from 'path';
import * as dom from '../../src/source/dom';
import { Preprocessor } from '../../src/source/preprocessor';
import { assert } from 'chai';

const rootPath = path.join(__dirname, 'directives');
const preprocessor = new Preprocessor(rootPath);

describe('source/directives', () => {

  it('should preserve directives', async () => {
    const source = await preprocessor.load('001.html');
    const root = source.doc.documentElement;
    const head = root?.children[0] as dom.Element;
    const define = head?.children[0] as dom.Element;
    assert.exists(define);
    assert.equal(define.name, ':DEFINE');
  });

});
