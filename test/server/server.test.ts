import path from "path";
import { Server } from "../../src/server/server";
import * as happy from 'happy-dom';
import { assert } from "chai";

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
    const win = getWindow(server);
    const res = await win.fetch(`http://localhost:${server.port}/static.txt`);
    const txt = await res.text();
    assert.equal(txt.trim(), 'some text');
  });

  it.skip("should serve dynamic page", async () => {
    const win = getWindow(server);
    const res = await win.fetch(`http://localhost:${server.port}/page1.html`);
    const txt = await res.text();
    win.document.write(txt);
    assert.equal(win.document.body.innerText.trim(), 'hello there!');
  });

  it("shouldn't load external JS server side", async () => {
    const win = getWindow(server);
    const res = await win.fetch(`http://localhost:${server.port}/page2.html`);
    const txt = await res.text();
    win.document.write(txt);
    assert.equal(win.document.body.innerText.trim(), '');
  });

  it("should run embedded JS server side", async () => {
    const win = getWindow(server);
    const res = await win.fetch(`http://localhost:${server.port}/page3.html`);
    const txt = await res.text();
    win.document.write(txt);
    assert.equal(win.document.body.innerText.trim(), 'hello');
  });

  it.skip("should overcome PL-10 bug", async () => {
    const win = getWindow(server);
    const res = await win.fetch(`http://localhost:${server.port}/pl-10.html`);
    const txt = await res.text();
    assert.isTrue(txt.toLowerCase().indexOf('invalid "as" attribute') >= 0);
  });

});

function getWindow(server: Server) {
  return new happy.Window({
    url: `http://localhost:${server.port}/`,
    settings: {
      disableJavaScriptFileLoading: true,
      disableJavaScriptEvaluation: true,
      disableCSSFileLoading: true,
      enableFileSystemHttpRequests: false
    }
  });
}
