import { assert } from 'chai';
import { before } from 'mocha';
import path from 'path';
import { Browser, chromium, Page } from 'playwright';
import * as k from '../../src/page/consts';
import { Server } from '../../src/server/server';

process.env.NODE_ENV = 'test';

const docroot = path.join(__dirname, 'www');

describe('client', () => {
  let browser: Browser;
  let page: Page;
  let page2: Page;
  let page3: Page;

  before(async () => {
    browser = await chromium.launch();
    page = await browser.newPage();
    page2 = await browser.newPage();
    page3 = await browser.newPage();
  });

  after(async () => {
    await page3.close();
    await page2.close();
    await page.close();
    await browser.close();
  });

  for (const mode of [
    { ssr: false },
    { ssr: true },
  ]) {
    const ssr = mode.ssr;
    const ssrLabel = ssr ? 'ssr' : '!ssr';

    describe(`client/${ssrLabel}`, () => {
      let server: Server;
      const log = new Array<string>();

      before(async () => {
        server = await new Server({
          docroot, mute: true, ssr, csr: true,
          logger: (_, msg) => log.push(msg as string)
        }).start();
      });

      after(async () => {
        await server.stop();
      });

      async function goto(fname: string): Promise<Page> {
        const res = await page.goto(`http://127.0.0.1:${server.port}${fname}`);
        assert.equal(res?.status(), 200);
        await page.waitForLoadState();
        const globalFound = await page.evaluate(`!!window.${k.CLIENT_GLOBAL}`);
        assert.isTrue(globalFound);
        return page;
      }

      it('/index', async () => {
        const page = await goto('/index');
        const div = await page.$('div');
        const text = await div?.textContent();
        assert.equal(text, 'hi');
      });

    });
  }

});