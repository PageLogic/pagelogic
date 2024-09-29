import { assert } from 'chai';
import { before } from 'mocha';
import { Server } from '../../src/server/server';
import { Browser, BrowserNavigationCrossOriginPolicyEnum, BrowserPage, Response, Window } from 'happy-dom';
import path from 'path';
import { CLIENT_CODE_REQ } from '../../src/server/consts';

const docroot = path.join(__dirname, 'www');

async function load(port: number, fname: string): Promise<BrowserPage> {
  const page = new Browser().newPage();
  await page.goto(`http://127.0.0.1:${port}${fname}`);
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

    it('/index', async () => {
      let page = await load(server.port!, '/');
      assert.equal(page.mainFrame.document.title, '/index');
      page = await load(server.port!, '/index');
      assert.equal(page.mainFrame.document.title, '/index');
      page = await load(server.port!, '/index.html');
      assert.equal(page.mainFrame.document.title, '/index');
    });

    it('/other', async () => {
      let page = await load(server.port!, '/other');
      assert.equal(page.mainFrame.document.title, '/other');
      page = await load(server.port!, '/other.html');
      assert.equal(page.mainFrame.document.title, '/other');
    });

    it('/fragment', async () => {
      let page = await load(server.port!, '/fragment');
      assert.equal(page.mainFrame.document.title, 'Page Error');
      page = await load(server.port!, '/fragment.htm');
      assert.equal(page.content.replace(/<.*?>/g, ''), 'Not Found');
    });

    it(CLIENT_CODE_REQ, async () => {
      const page = await load(server.port!, '');
      const res = await page.mainFrame.window.fetch(
        `http://127.0.0.1:${server.port}${CLIENT_CODE_REQ}`
      );
      assert.equal(res.status, 200);
    });

    it('001', async () => {
      const page = await load(server.port!, '/001.html');
      assert.equal(
        page.content,
        '<html data-lid="0"><head data-lid="1"></head>'
        + '<body data-lid="2"></body></html>'
      );
    });

    it('002', async () => {
      const page = await load(server.port!, '/002.html');
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
