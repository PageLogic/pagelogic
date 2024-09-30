import { assert } from 'chai';
import fs from 'fs';
import { Browser, BrowserPage } from 'happy-dom';
import { before } from 'mocha';
import path from 'path';
import * as k from '../../src/page/consts';
import { CLIENT_CODE_REQ } from '../../src/page/consts';
import { Server } from '../../src/server/server';

const docroot = path.join(__dirname, 'www');

async function load(
  ssr: boolean, csr: boolean, port: number, fname: string
): Promise<BrowserPage> {
  const page = new Browser().newPage();
  await page.goto(`http://127.0.0.1:${port}${fname}`);
  await page.waitUntilComplete();
  const isPL = page.mainFrame.document.querySelector(`html[${k.DOM_ID_ATTR}]`);
  if (!isPL) {
    // not a PageLogic page (might be an error page);
    return page;
  }
  if (ssr) {
    if (page.content.match(/<!---t\d+--><!----->/)) {
      assert(false, 'empty text found in SSR mode');
    }
  } else {
    if (page.content.match(/<!---t\d+-->.+?<!----->/)) {
      assert(false, 'interpolated text found in non-SSR mode');
    }
  }
  if (csr) {
    const query = `script#${k.CLIENT_PROPS_SCRIPT_ID}`;
    const script = page.mainFrame.document.querySelector(query);
    assert.exists(script, `missing ${query} in CSR mode`);
  }
  return page;
}

function getMarkup(page: BrowserPage) {
  const txt = page.content;
  const i1 = txt.indexOf(`<script id="${k.CLIENT_PROPS_SCRIPT_ID}">`);
  const i2 = i1 >= 0 ? txt.indexOf('</script>', i1) : -1;
  if (i2 > 0) {
    return txt.substring(0, i1) + txt.substring(i2 + '</script>'.length);
  }
  return txt;
}

describe('server', () => {
  for (const mode of [
    { ssr: false, csr: false },
    { ssr: true, csr: false },
    { ssr: false, csr: true },
    { ssr: true, csr: true },
  ]) {
    const ssr = mode.ssr;
    const csr = mode.csr;
    const ssrLabel = ssr ? 'ssr' : '!ssr';
    const csrLabel = csr ? 'csr' : '!csr';

    describe(`server/${ssrLabel}+${csrLabel}`, () => {
      let server: Server;
      let browser: Browser;
      const log = new Array<string>();

      before(async () => {
        server = await new Server({
          docroot, mute: true, ssr, csr,
          logger: (_, msg) => log.push(msg as string)
        }).start();
        browser = new Browser();
      });

      after(async () => {
        await browser.close();
        await server.stop();
      });

      it('/index', async () => {
        let page = await load(ssr, csr, server.port!, '/');
        assert.equal(page.mainFrame.document.title, '/index');
        page = await load(ssr, csr, server.port!, '/index');
        assert.equal(page.mainFrame.document.title, '/index');
        page = await load(ssr, csr, server.port!, '/index.html');
        assert.equal(page.mainFrame.document.title, '/index');
      });

      it('/other', async () => {
        let page = await load(ssr, csr, server.port!, '/other');
        assert.equal(page.mainFrame.document.title, '/other');
        page = await load(ssr, csr, server.port!, '/other.html');
        assert.equal(page.mainFrame.document.title, '/other');
      });

      it('/fragment', async () => {
        let page = await load(ssr, csr, server.port!, '/fragment');
        assert.equal(page.mainFrame.document.title, 'Page Error');
        page = await load(ssr, csr, server.port!, '/fragment.htm');
        assert.equal(page.content.replace(/<.*?>/g, ''), 'Not Found');
      });

      it('/text.txt', async () => {
        const page = await load(ssr, csr, server.port!, '/');
        const res = await page.mainFrame.window.fetch(
          `http://127.0.0.1:${server.port}/text.txt`
        );
        assert.equal(res.status, 200);
        const txt = await res.body?.getReader().read();
        assert.equal(txt?.value.toString(), 'some text in /');
      });

      it('/visible/index', async () => {
        let page = await load(ssr, csr, server.port!, '/visible');
        assert.equal(page.mainFrame.document.title, '/visible/index');
        page = await load(ssr, csr, server.port!, '/visible/');
        assert.equal(page.mainFrame.document.title, '/visible/index');
        page = await load(ssr, csr, server.port!, '/visible/index');
        assert.equal(page.mainFrame.document.title, '/visible/index');
        page = await load(ssr, csr, server.port!, '/visible/index.html');
        assert.equal(page.mainFrame.document.title, '/visible/index');
      });

      it('/visible/other', async () => {
        let page = await load(ssr, csr, server.port!, '/visible/other');
        assert.equal(page.mainFrame.document.title, '/visible/other');
        page = await load(ssr, csr, server.port!, '/visible/other.html');
        assert.equal(page.mainFrame.document.title, '/visible/other');
      });

      it('/visible/fragment', async () => {
        let page = await load(ssr, csr, server.port!, '/visible/fragment');
        assert.equal(page.mainFrame.document.title, 'Page Error');
        page = await load(ssr, csr, server.port!, '/visible/fragment.htm');
        assert.equal(page.content.replace(/<.*?>/g, ''), 'Not Found');
      });

      it('/visible/text.txt', async () => {
        const page = await load(ssr, csr, server.port!, '/');
        const res = await page.mainFrame.window.fetch(
          `http://127.0.0.1:${server.port}/visible/text.txt`
        );
        assert.equal(res.status, 200);
        const txt = await res.body?.getReader().read();
        assert.equal(txt?.value.toString(), 'some text in /visible');
      });

      it('/.hidden/index', async () => {
        let page = await load(ssr, csr, server.port!, '/.hidden');
        assert.equal(page.content.replace(/<.*?>/g, ''), 'Not Found');
        page = await load(ssr, csr, server.port!, '/.hidden/');
        assert.equal(page.content.replace(/<.*?>/g, ''), 'Not Found');
        page = await load(ssr, csr, server.port!, '/.hidden/index');
        assert.equal(page.content.replace(/<.*?>/g, ''), 'Not Found');
        page = await load(ssr, csr, server.port!, '/.hidden/index.html');
        assert.equal(page.content.replace(/<.*?>/g, ''), 'Not Found');
      });

      it('/.hidden/other', async () => {
        let page = await load(ssr, csr, server.port!, '/.hidden/other');
        assert.equal(page.content.replace(/<.*?>/g, ''), 'Not Found');
        page = await load(ssr, csr, server.port!, '/.hidden/other.html');
        assert.equal(page.content.replace(/<.*?>/g, ''), 'Not Found');
      });

      it('/.hidden/fragment', async () => {
        let page = await load(ssr, csr, server.port!, '/.hidden/fragment');
        assert.equal(page.content.replace(/<.*?>/g, ''), 'Not Found');
        page = await load(ssr, csr, server.port!, '/.hidden/fragment.htm');
        assert.equal(page.content.replace(/<.*?>/g, ''), 'Not Found');
      });

      it('/.hidden/text.txt', async () => {
        const page = await load(ssr, csr, server.port!, '/');
        const res = await page.mainFrame.window.fetch(
          `http://127.0.0.1:${server.port}/.hidden/text.txt`
        );
        assert.equal(res.status, 404);
      });

      it('/folder/index', async () => {
        // /folder/ directory has priority over /folder.html page
        let page = await load(ssr, csr, server.port!, '/folder');
        assert.equal(page.mainFrame.document.title, '/folder/index');
        page = await load(ssr, csr, server.port!, '/folder/');
        assert.equal(page.mainFrame.document.title, '/folder/index');
        page = await load(ssr, csr, server.port!, '/folder/index');
        assert.equal(page.mainFrame.document.title, '/folder/index');
        page = await load(ssr, csr, server.port!, '/folder/index.html');
        assert.equal(page.mainFrame.document.title, '/folder/index');
      });

      it(CLIENT_CODE_REQ, async () => {
        const page = await load(ssr, csr, server.port!, '');
        const res = await page.mainFrame.window.fetch(
          `http://127.0.0.1:${server.port}${CLIENT_CODE_REQ}`
        );
        assert.equal(res.status, 200);
      });

      it('comp1', async () => {
        // should compile only once (sequential requests)
        log.splice(0, log.length);
        await load(ssr, csr, server.port!, '/comp1');
        await load(ssr, csr, server.port!, '/comp1');
        await load(ssr, csr, server.port!, '/comp1');
        assert.deepEqual(log, [
          '[compiler] /comp1.html will compile',
          '[compiler] /comp1.html is compiled',
          '[compiler] /comp1.html is compiled'
        ]);
      });

      it('comp2', async () => {
        // should compile only once (parallel requests)
        log.splice(0, log.length);
        await Promise.all([
          load(ssr, csr, server.port!, '/comp2'),
          load(ssr, csr, server.port!, '/comp2'),
          load(ssr, csr, server.port!, '/comp2')
        ]);
        await load(ssr, csr, server.port!, '/comp2');
        assert.deepEqual(log, [
          '[compiler] /comp2.html will compile',
          '[compiler] /comp2.html is compiling',
          '[compiler] /comp2.html is compiling',
          '[compiler] /comp2.html is compiled'
        ]);
      });

      it('comp3', async () => {
        // should recompile upon changes
        log.splice(0, log.length);
        await load(ssr, csr, server.port!, '/comp3');
        await load(ssr, csr, server.port!, '/comp3');
        const pathname = path.join(docroot, 'comp3.html');
        const text = fs.readFileSync(pathname).toString();
        fs.writeFileSync(pathname, text);
        await load(ssr, csr, server.port!, '/comp3');
        await load(ssr, csr, server.port!, '/comp3');
        assert.deepEqual(log, [
          '[compiler] /comp3.html will compile',
          '[compiler] /comp3.html is compiled',
          '[compiler] clear cache',
          '[compiler] /comp3.html will compile',
          '[compiler] /comp3.html is compiled'
        ]);
      });

      it('001', async () => {
        const page = await load(ssr, csr, server.port!, '/001.html');
        assert.equal(
          getMarkup(page),
          '<html data-lid="0"><head data-lid="1"></head>'
          + '<body data-lid="2"></body></html>'
        );
      });

      it('002', async () => {
        const page = await load(ssr, csr, server.port!, '/002.html');
        assert.equal(
          getMarkup(page),
          '<html data-lid="0">\n'
          + '<head data-lid="1">\n'
          + '<meta name="color-scheme" content="light dark">\n'
          + '</head>\n'
          + (ssr
            ? '<body data-lid="2">hi <!---t0-->there<!---->!</body>\n'
            : '<body data-lid="2">hi <!---t0--><!---->!</body>\n')
          + '</html>'
        );
      });

    });

  }
});
