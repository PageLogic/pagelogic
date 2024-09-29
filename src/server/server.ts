import express, { Application } from 'express';
import rateLimit from 'express-rate-limit';
import * as http from 'http';
import { AddressInfo } from 'net';
import { pageLogic, PageLogicConfig } from './pagelogic-express';
import exitHook from './exit-hook';
import { defaultLogger, PageLogicLogger } from '../utils/logger';

export interface TrafficLimit {
  windowMs: number,
  maxRequests: number,
}

export interface ServerConfig extends PageLogicConfig {
  port?: number;
  trustProxy?: boolean;
  pageLimit?: TrafficLimit;
  mute?: boolean;
}

export class Server {
  config: ServerConfig;
  logger: PageLogicLogger;
  server?: http.Server;
  port?: number;
  app?: Application;

  constructor(config?: ServerConfig) {
    this.config = config || {};
    this.logger = this.config.logger ?? defaultLogger;
  }

  async start(): Promise<Server> {
    if (this.server) {
      return this;
    }
    const config = this.config;
    const app = this.app = express();
    app.use(express.json());
    app.use(express.urlencoded({ extended: true }));
    // see https://expressjs.com/en/guide/behind-proxies.html
    config.trustProxy && app.set('trust proxy', 1);
    //TODO: will this limit all requests with any extension because of the '*'?
    config.pageLimit && this.setLimiter(config.pageLimit, ['*', '*.html'], app);
    config.docroot ||= process.cwd();

    app.use(pageLogic(config));

    app.use(express.static(config.docroot));
    this.server = app.listen(config.port);
    this.port = (this.server?.address() as AddressInfo).port;
    this.logger('info', `[server] docroot ${config.docroot}`);
    this.logger('info', `[server] address http://127.0.0.1:${this.port}/`);
    exitHook(() => this.logger('info', '[server] will exit'));
    process.on('uncaughtException', (err) => {
      this.logger('error', err.stack ? err.stack : `${err}`);
    });
    return this;
  }

  stop(): Promise<this> {
    return new Promise((resolve, error) => {
      this.server?.close(err => {
        delete this.server;
        delete this.port;
        err ? error(err) : resolve(this);
      });
    });
  }

  setLimiter(limit: TrafficLimit, paths: Array<string>, app: Application) {
    const limiter = rateLimit({
      windowMs: limit.windowMs,
      max: limit.maxRequests,
      standardHeaders: true,
      legacyHeaders: false,
    });
    for (const path of paths) {
      app.use(path, limiter);
    }
  }
}
