#!/usr/bin/env node

import { createCommand, program } from 'commander-version';
import path from "path";
import { compiler } from './code/compiler';
import { Server } from './server/server';

const build = createCommand('build')
  .description('builds a PageLogic project')
  .arguments('<src-dir> <dst-dir>')
  .option('-g, --global-alias <alias>', 'alias for PageLogic object in browser', 'page')
  .action(async (srcDir: string, dstDir: string, options: any) => {
    const errors = new Array<string>();
    if (!await compiler(errors, srcDir, dstDir, options.globalAlias)) {
      for (let error of errors) {
        console.error(error);
      }
    }
  });

  const serve = createCommand('serve')
  .description('serves a PageLogic project')
  .arguments('<pathname>')
  .option('-p, --port <number>', 'port number', '3000')
  .option('-ssr, --enable-ssr <boolean>', 'enables server-side rendering', 'true')
  // .option('-l, --live', 'enable auto reload on page changes')
  .action((pathname, options) => {
    const root = path.normalize(path.join(process.cwd(), pathname));
    const port = parseInt(options.port) || 3000;
    const ssr = options.ssr !== 'false';
    // const live = options.live || false;
    new Server({
      port: port,
      rootPath: root,
      trustProxy: false,
      pageLimit: {
        windowMs: 5000,
        maxRequests: 50
      },
      ssr
      // liveUpdate: true,
    }).start();
  });

program(__dirname)
  .name('pagelogic')
  .description('PageLogic CLI - https://github.com/fcapolini/pagelogic')
  .addCommand(build)
  .addCommand(serve)
  .parse();
