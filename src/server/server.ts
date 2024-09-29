import express, { Application } from 'express';
import rateLimit from 'express-rate-limit';
import * as http from 'http';
import { AddressInfo } from 'net';
import { pageLogic, PageLogicConfig } from './pagelogic-express';
import exitHook from './exit-hook';

export interface TrafficLimit {
  windowMs: number,
  maxRequests: number,
}

export type ServerLogger = (type: 'error' | 'warn' | 'info' | 'debug', msg: unknown) => void;

export interface ServerConfig extends PageLogicConfig {
  port?: number;
  trustProxy?: boolean;
  pageLimit?: TrafficLimit;
  logger?: ServerLogger;
  mute?: boolean;
}

//TODO: prevent loading remote stuff in ssr environment
//TODO: serialize compiler calls
export class Server {
  config: ServerConfig;
  server?: http.Server;
  port?: number;
  app?: Application;

  constructor(config?: ServerConfig) {
    this.config = config || {};
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
    this.log('info', `docroot ${config.docroot}`);
    this.log('info', `address http://127.0.0.1:${this.port}/`);
    exitHook(() => this.log('info', 'will exit'));
    process.on('uncaughtException', (err) => {
      this.log('error', err.stack ? err.stack : `${err}`);
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

  log(type: 'error' | 'warn' | 'info' | 'debug', msg: unknown) {
    if (!this.config.mute) {
      if (this.config.logger) {
        this.config.logger(type, msg);
      } else {
        const ts = this.getTimestamp();
        switch (type) {
        case 'error': console.error(ts, type, msg); break;
        case 'warn': console.warn(ts, type, msg); break;
        case 'info': console.info(ts, type, msg); break;
        case 'debug': console.debug(ts, type, msg); break;
        default: console.log(ts, type, msg);
        }
      }
    }
  }

  getTimestamp(): string {
    const d = new Date();
    return d.getFullYear() + '-'
        + ('' + (d.getMonth() + 1)).padStart(2, '0') + '-'
        + ('' + d.getDate()).padStart(2, '0') + ' '
        + ('' + d.getHours()).padStart(2, '0') + ':'
        + ('' + d.getMinutes()).padStart(2, '0') + ':'
        + ('' + d.getSeconds()).padStart(2, '0');
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
