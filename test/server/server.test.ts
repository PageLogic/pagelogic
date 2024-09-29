import { assert } from 'chai';
import { before } from 'mocha';
import { Server } from '../../src/server/server';
import { Browser, BrowserPage } from 'happy-dom';
import path from 'path';

const rootPath = path.join(__dirname, 'www');

async function load(port: number, fname: string): Promise<BrowserPage> {
  const page = new Browser().newPage();
  await page.goto(`http://127.0.0.1:${port}/${fname}`);
  await page.waitUntilComplete();
  return page;
}

describe('server', () => {
  describe('server/!ssr+!csr', () => {
  });

  describe('server/ssr+!csr', () => {
    let server: Server;
    let browser: Browser;
    before(async () => {
      server = await new Server({rootPath, mute: true, ssr: true }).start();
      browser = new Browser();
    });
    after(async () => {
      await browser.close();
      await server.stop();
    });

    it('001', async () => {
      const page = await load(server.port!, '001.html');
      assert.equal(
        page.content,
        '<html data-lid="0"><head data-lid="1"></head>'
        +'<body data-lid="2"></body></html>'
      );
    });
  });

  describe('server/!ssr+csr', () => {

  });

  describe('server/ssr+csr', () => {

  });

});
