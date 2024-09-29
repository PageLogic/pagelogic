import { assert } from 'chai';
import { before } from 'mocha';
import { Server } from '../../src/server/server';
import { Browser, BrowserPage } from 'happy-dom';
import path from 'path';

const docroot = path.join(__dirname, 'www');

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
      server = await new Server({
        docroot, mute: true, ssr: true, csr: false
      }).start();
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
        + '<body data-lid="2"></body></html>'
      );
    });

    it('002', async () => {
      const page = await load(server.port!, '002.html');
      assert.equal(
        page.content,
        '<html data-lid="0">\n'
        + '<head data-lid="1">\n'
        + '<meta name="color-scheme" content="light dark">\n'
        + '</head>\n'
        + '<body data-lid="2">hi <!---t0-->there<!---->!</body>\n'
        + '</html>'
      );
    });

  });

  describe('server/!ssr+csr', () => {

  });

  describe('server/ssr+csr', () => {

  });

});
