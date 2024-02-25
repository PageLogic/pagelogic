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
      "name": ".",
      "path": ".",
      "children": [
        {
          "name": "assets",
          "path": "assets",
          "children": []
        },
        {
          "name": "index.html",
          "path": "index.html"
        },
        {
          "name": "pages",
          "path": "pages",
          "children": [
            {
              "name": "about.html",
              "path": "pages/about.html"
            },
            {
              "name": "products.html",
              "path": "pages/products.html"
            }
          ]
        },
        {
          "name": "parts",
          "path": "parts",
          "children": []
        }
      ]
    };
    assert.deepEqual(actual, expected);
  });

  it('should enqueue concurrent get() calls', async () => {
    pageMap.clear();
    // start async listing
    pageMap.get();
    // another listing without waiting
    const list = await pageMap.get();
    assert.notEqual(list.children.length, 0);
  })
});
