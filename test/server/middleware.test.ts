import assert from "node:assert";
import { after, before, describe, test } from "node:test";
import path from "path";
import express, { Application } from "express";
import { PageLogicConfig, pageLogic } from "../../src/server/middleware";

const rootPath = path.join(__dirname, 'middleware');

describe('server: middleware', () => {
  let server;
  let port;

  before(() => {
    const app = express();
    app.use(pageLogic({}));
    server = app.listen();
    port = (server?.address() as any).port;
  });

  after(() => {
    server?.close();
  });

});
