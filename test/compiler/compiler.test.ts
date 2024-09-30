import { describe } from 'mocha';
import { assert } from 'chai';
import { Compiler } from '../../src/compiler/compiler';
import path from 'path';

const docroot = path.join(__dirname, 'compiler');
const log = new Array<string>();
const compiler = new Compiler(docroot, {
  logger: ((_, msg) => log.push(msg as string)),
  watch: true
});

describe('compiler/compiler', () => {

  it('001', async () => {
    // make sure clearCache() works with pending pages too
    compiler.clearCache();
    log.splice(0, log.length);
    const promises = [
      compiler.get('001.html'),
      compiler.get('001.html'),
    ];
    assert.deepEqual(log, [
      '[compiler] 001.html will compile',
      '[compiler] 001.html is compiling',
    ]);
    assert.equal(compiler.pages.size, 0);
    assert.equal(compiler.pending.size, 1);
    compiler.clearCache();
    assert.equal(compiler.pages.size, 0);
    assert.equal(compiler.pending.size, 1);
    assert.deepEqual(log, [
      '[compiler] 001.html will compile',
      '[compiler] 001.html is compiling',
      '[compiler] clear cache',
    ]);
    await Promise.all(promises);
    assert.equal(compiler.pages.size, 0);
    assert.equal(compiler.pending.size, 0);
    await compiler.get('001.html');
    assert.deepEqual(log, [
      '[compiler] 001.html will compile',
      '[compiler] 001.html is compiling',
      '[compiler] clear cache',
      '[compiler] 001.html will compile',
    ]);
  });

});
