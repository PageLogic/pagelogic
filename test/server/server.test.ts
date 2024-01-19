import assert from "node:assert";
import { after, before, describe, it, test } from "node:test";
import path from "path";
import { Server } from "../../src/server";
import * as happy from 'happy-dom';

const rootPath = path.join(__dirname, 'server');

describe('server: server', () => {
  let server: Server;

  before(() => {
    server = new Server({ rootPath, mute: true, ssr: true }).start();
  });

  after(() => {
    server.stop();
  });

  it("should serve static content", async () => {
    const win = getWindow();
    const res = await win.fetch(`http://localhost:${server.port}/static.txt`);
    const txt = await res.text();
    assert.equal(txt.trim(), 'some text');
  });

  it("should serve dynamic page", async () => {
    const win = getWindow();
    const res = await win.fetch(`http://localhost:${server.port}/page1.html`);
    const txt = await res.text();
    win.document.write(txt);
    assert.equal(win.document.body.innerText.trim(), 'hello there!');
  });

  it("shouldn't load external JS server side", async () => {
    const win = getWindow();
    const res = await win.fetch(`http://localhost:${server.port}/page2.html`);
    const txt = await res.text();
    win.document.write(txt);
    assert.equal(win.document.body.innerText.trim(), '');
  });

  it("should run embedded JS server side", async () => {
    const win = getWindow();
    const res = await win.fetch(`http://localhost:${server.port}/page3.html`);
    const txt = await res.text();
    win.document.write(txt);
    assert.equal(win.document.body.innerText.trim(), 'hello');
  });

});

function getWindow() {
  return new happy.Window({
    settings: {
      disableJavaScriptFileLoading: true,
      disableJavaScriptEvaluation: true,
      disableCSSFileLoading: true,
      enableFileSystemHttpRequests: false
    }
  });
}
