import express, { Application } from "express";
import rateLimit from "express-rate-limit";
import * as http from 'http';
import { PageLogicConfig, pageLogic } from "./server/middleware";
import exitHook from "./server/exit-hook";

interface ServerConfig extends PageLogicConfig {
  port?: number;
  trustProxy?: boolean;
  pageLimit?: TrafficLimit;
  logger?: ServerLogger;
  mute?: boolean;
  ssr?: boolean;
}

export interface TrafficLimit {
  windowMs: number,
  maxRequests: number,
}

export type ServerLogger = (type: 'error' | 'warn' | 'info' | 'debug', msg: any) => void;

//TODO: prevent loading remote stuff in ssr environment
//TODO: serialize compiler calls
export class Server {
  config: ServerConfig;
  server?: http.Server;
  port?: number;

  constructor(config?: ServerConfig) {
    this.config = config || {};
  }

  start(cb?: (server: Server, app: Application, config: ServerConfig) => void): this {
    if (this.server) {
      return this;
    }
    const config = this.config;
    const app = express();
    app.use(express.json());
    app.use(express.urlencoded({ extended: true }));
    // see https://expressjs.com/en/guide/behind-proxies.html
    config.trustProxy && app.set('trust proxy', 1);
    //TODO: will this limit all requests with any extension because of the '*'?
    config.pageLimit && this.setLimiter(config.pageLimit, ['*', '*.html'], app);
    config.rootPath ||= process.cwd();

    app.use(pageLogic(config));

    cb && cb(this, app, config);
    app.use(express.static(config.rootPath));
    this.server = app.listen(config.port);
    this.port = (this.server?.address() as any).port;
    this.log('info', `docroot ${config.rootPath}`);
    this.log('info', `address http://127.0.0.1:${this.port}/`);
    exitHook(() => this.log('info', 'will exit'));
    process.on('uncaughtException', (err) => {
      this.log('error', err.stack ? err.stack : `${err}`);
    });
    return this;
  }

  stop(): this {
    this.server?.close();
    delete this.server;
    delete this.port;
    return this;
  }

  log(type: 'error' | 'warn' | 'info' | 'debug', msg: any) {
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
