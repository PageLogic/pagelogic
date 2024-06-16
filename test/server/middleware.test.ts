import path from "path";
import express, { Application } from "express";
import { PageLogicConfig, pageLogic } from "../../src/server/middleware";

const rootPath = path.join(__dirname, 'middleware');
const runtimePath = './dist/pagelogic-rt.js';

describe('server: middleware', () => {
  let server;
  let port;

  before(() => {
    const app = express();
    app.use(pageLogic({ rootPath, runtimePath }));
    server = app.listen();
    port = (server?.address() as any).port;
  });

  after(() => {
    server?.close();
  });

});
