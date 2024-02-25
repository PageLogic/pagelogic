import assert from "node:assert";
import { before, describe, it } from "node:test";
import path from "path";
import { PageMap } from "../../src/server/pagemap";

const rootPath = path.join(__dirname, 'pagemap');

describe('server: pagemap', () => {
  let pageMap: PageMap;

  before(() => {
    pageMap = new PageMap(rootPath);
  });

  it('should provide page map', async () => {
    const actual = await pageMap.get();
    const expected = {
      "":                     { "type": "dir",  "name": "" },
      "assets":               { "type": "dir",  "name": "assets" },
      "index.html":           { "type": "page", "name": "index.html" },
      "pages":                { "type": "dir",  "name": "pages" },
      "pages/about.html":     { "type": "page", "name": "about.html" },
      "pages/products.html":  { "type": "page", "name": "products.html" },
      "parts":                { "type": "dir",  "name": "parts" }
    };
    assert.deepEqual(actual, expected);
  });

  it('should enqueue concurrent get() calls', async () => {
    pageMap.clear();
    // start async listing
    pageMap.get();
    // another listing without waiting
    const list = await pageMap.get();
    assert.notEqual(Reflect.ownKeys(list).length, 1);
  });

  it('should get item for path "/"', async () => {
    const item = await pageMap.getItem('/');
    assert.deepEqual(item, { type: 'dir', name: '' });
  });

  it('should get item for path "/index.html"', async () => {
    const item = await pageMap.getItem('/index.html');
    assert.deepEqual(item, { type: 'page', name: 'index.html' });
  });

  it('should get item for path "/pages/"', async () => {
    const item = await pageMap.getItem('/pages/');
    assert.deepEqual(item, { type: 'dir', name: 'pages' });
    const item2 = await pageMap.getItem('/pages');
    assert.equal(item2, item);
  });
});
