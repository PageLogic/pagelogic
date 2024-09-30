import { assert } from 'chai';
import fs from 'fs';
import { before } from 'mocha';
import path from 'path';
import { Browser, chromium, Page } from 'playwright';
import * as k from '../../src/page/consts';
import { CLIENT_CODE_REQ } from '../../src/page/consts';
import { Server } from '../../src/server/server';

process.env.NODE_ENV = 'test';

const docroot = path.join(__dirname, 'www');

async function load(
  page: Page,
  checkSSR: boolean, checkCSR: boolean, port: number, fname: string
) {
  await page.goto(`http://127.0.0.1:${port}${fname}`);
  if (checkSSR) {
    if ((await page.content()).match(/<!---t\d+--><!---->/)) {
      assert(false, 'empty text found in SSR mode');
    }
  } else {
    if ((await page.content()).match(/<!---t\d+-->.+?<!---->/)) {
      assert(false, 'interpolated text found in non-SSR mode');
    }
  }
  if (checkCSR) {
    const query = `script#${k.CLIENT_PROPS_SCRIPT_ID}`;
    const script = await page.$(query);
    assert.exists(script, `missing ${query} in CSR mode`);
  }
}

async function getMarkup(page: Page) {
  const txt = await page.content();
  const i1 = txt.indexOf(`<script id="${k.CLIENT_PROPS_SCRIPT_ID}">`);
  const i2 = i1 >= 0 ? txt.indexOf('</script>', i1) : -1;
  if (i2 > 0) {
    return txt.substring(0, i1) + txt.substring(i2 + '</script>'.length);
  }
  return txt;
}

describe('server', () => {
  let browser: Browser;
  let page1: Page;
  let page2: Page;
  let page3: Page;

  before(async () => {
    browser = await chromium.launch();
    page1 = await browser.newPage();
    page2 = await browser.newPage();
    page3 = await browser.newPage();
  });

  after(async () => {
    await page3.close();
    await page2.close();
    await page1.close();
    await browser.close();
  });

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
      const log = new Array<string>();

      before(async () => {
        server = await new Server({
          docroot, mute: true, ssr, csr,
          logger: (_, msg) => log.push(msg as string)
        }).start();
      });

      after(async () => {
        await server.stop();
      });

      it('/index', async () => {
        await load(page1, ssr, csr, server.port!, '/');
        assert.equal(await page1.title(), '/index');
        await load(page1, ssr, csr, server.port!, '/index');
        assert.equal(await page1.title(), '/index');
        await load(page1, ssr, csr, server.port!, '/index.html');
        assert.equal(await page1.title(), '/index');
      });

      it('/other', async () => {
        await load(page1, ssr, csr, server.port!, '/other');
        assert.equal(await page1.title(), '/other');
        await load(page1, ssr, csr, server.port!, '/other.html');
        assert.equal(await page1.title(), '/other');
      });

      it('/fragment', async () => {
        await load(page1, false, false, server.port!, '/fragment');
        assert.equal(await page1.title(), 'Page Error');
        await load(page1, false, false, server.port!, '/fragment.htm');
        assert.equal((await getMarkup(page1)).replace(/<.*?>/g, ''), 'Not Found');
      });

      it('/text.txt', async () => {
        const res = await fetch(
          `http://127.0.0.1:${server.port}/text.txt`
        );
        assert.equal(res.status, 200);
        const txt = await res.text();
        assert.equal(txt, 'some text in /');
      });

      it('/visible/index', async () => {
        await load(page1, ssr, csr, server.port!, '/visible');
        assert.equal(await page1.title(), '/visible/index');
        await load(page1, ssr, csr, server.port!, '/visible/');
        assert.equal(await page1.title(), '/visible/index');
        await load(page1, ssr, csr, server.port!, '/visible/index');
        assert.equal(await page1.title(), '/visible/index');
        await load(page1, ssr, csr, server.port!, '/visible/index.html');
        assert.equal(await page1.title(), '/visible/index');
      });

      it('/visible/other', async () => {
        await load(page1, ssr, csr, server.port!, '/visible/other');
        assert.equal(await page1.title(), '/visible/other');
        await load(page1, ssr, csr, server.port!, '/visible/other.html');
        assert.equal(await page1.title(), '/visible/other');
      });

      it('/visible/fragment', async () => {
        await load(page1, false, false, server.port!, '/visible/fragment');
        assert.equal(await page1.title(), 'Page Error');
        await load(page1, false, false, server.port!, '/visible/fragment.htm');
        assert.equal((await getMarkup(page1)).replace(/<.*?>/g, ''), 'Not Found');
      });

      it('/visible/text.txt', async () => {
        const res = await fetch(
          `http://127.0.0.1:${server.port}/visible/text.txt`
        );
        assert.equal(res.status, 200);
        const txt = await res.text();
        assert.equal(txt, 'some text in /visible');
      });

      it('/.hidden/index', async () => {
        await load(page1, false, false, server.port!, '/.hidden');
        assert.equal((await getMarkup(page1)).replace(/<.*?>/g, ''), 'Not Found');
        await load(page1, false, false, server.port!, '/.hidden/');
        assert.equal((await getMarkup(page1)).replace(/<.*?>/g, ''), 'Not Found');
        await load(page1, false, false, server.port!, '/.hidden/index');
        assert.equal((await getMarkup(page1)).replace(/<.*?>/g, ''), 'Not Found');
        await load(page1, false, false, server.port!, '/.hidden/index.html');
        assert.equal((await getMarkup(page1)).replace(/<.*?>/g, ''), 'Not Found');
      });

      it('/.hidden/other', async () => {
        await load(page1, false, false, server.port!, '/.hidden/other');
        assert.equal((await getMarkup(page1)).replace(/<.*?>/g, ''), 'Not Found');
        await load(page1, false, false, server.port!, '/.hidden/other.html');
        assert.equal((await getMarkup(page1)).replace(/<.*?>/g, ''), 'Not Found');
      });

      it('/.hidden/fragment', async () => {
        await load(page1, false, false, server.port!, '/.hidden/fragment');
        assert.equal((await getMarkup(page1)).replace(/<.*?>/g, ''), 'Not Found');
        await load(page1, false, false, server.port!, '/.hidden/fragment.htm');
        assert.equal((await getMarkup(page1)).replace(/<.*?>/g, ''), 'Not Found');
      });

      it('/.hidden/text.txt', async () => {
        const res = await fetch(
          `http://127.0.0.1:${server.port}/.hidden/text.txt`
        );
        assert.equal(res.status, 404);
      });

      it('/folder/index', async () => {
        // /folder/ directory has priority over /folder.html page
        await load(page1, ssr, csr, server.port!, '/folder');
        assert.equal(await page1.title(), '/folder/index');
        await load(page1, ssr, csr, server.port!, '/folder/');
        assert.equal(await page1.title(), '/folder/index');
        await load(page1, ssr, csr, server.port!, '/folder/index');
        assert.equal(await page1.title(), '/folder/index');
        await load(page1, ssr, csr, server.port!, '/folder/index.html');
        assert.equal(await page1.title(), '/folder/index');
      });

      it(CLIENT_CODE_REQ, async () => {
        const res = await fetch(
          `http://127.0.0.1:${server.port}${CLIENT_CODE_REQ}`
        );
        assert.equal(res.status, 200);
      });

      it('comp1', async () => {
        // should compile only once (sequential requests)
        log.splice(0, log.length);
        await load(page1, ssr, csr, server.port!, '/comp1');
        await load(page2, ssr, csr, server.port!, '/comp1');
        await load(page3, ssr, csr, server.port!, '/comp1');
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
          load(page1, ssr, csr, server.port!, '/comp2'),
          load(page2, ssr, csr, server.port!, '/comp2'),
          load(page3, ssr, csr, server.port!, '/comp2')
        ]);
        await load(page1, ssr, csr, server.port!, '/comp2');
        const entries = new Set(log);
        assert(entries.has('[compiler] /comp2.html will compile'));
        assert(entries.has('[compiler] /comp2.html is compiling'));
        assert(entries.has('[compiler] /comp2.html is compiled'));
      });

      it('comp3', async () => {
        // should recompile upon changes
        log.splice(0, log.length);
        await load(page1, ssr, csr, server.port!, '/comp3');
        await load(page1, ssr, csr, server.port!, '/comp3');
        const pathname = path.join(docroot, 'comp3.html');
        const text = fs.readFileSync(pathname).toString();
        fs.writeFileSync(pathname, text);
        await load(page1, ssr, csr, server.port!, '/comp3');
        await load(page1, ssr, csr, server.port!, '/comp3');
        assert.deepEqual(log, [
          '[compiler] /comp3.html will compile',
          '[compiler] /comp3.html is compiled',
          '[compiler] clear cache',
          '[compiler] /comp3.html will compile',
          '[compiler] /comp3.html is compiled'
        ]);
      });

      it('001', async () => {
        await load(page1, ssr, csr, server.port!, '/001.html');
        assert.equal(
          await getMarkup(page1),
          '<!DOCTYPE html><html data-pl="0"><head data-pl="1"></head>'
          + '<body data-pl="2">'
          + (csr
            ? '<script id="pl-client" src="/.pagelogic.js"></script>'
            : '')
          + '</body></html>'
        );
      });

      it('002', async () => {
        await load(page1, ssr, csr, server.port!, '/002.html');
        assert.equal(
          await getMarkup(page1),
          '<!DOCTYPE html><html data-pl="0">'
          + '<head data-pl="1">\n'
          + '<meta name="color-scheme" content="light dark">\n'
          + '</head>\n'
          + (ssr
            ? '<body data-pl="2">hi <!---t0-->there<!---->!'
            : '<body data-pl="2">hi <!---t0--><!---->!')
          + (csr
            ? '<script id="pl-client" src="/.pagelogic.js"></script>'
            : '')
          + '\n</body>'
          + '</html>'
        );
      });

    });

  }
});
