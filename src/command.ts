#!/usr/bin/env node

import { createCommand, program } from 'commander-version';
import path from "path";
import { CompilerOptions, compiler } from './code/compiler';
import { Server } from './server';
import debounce from 'debounce-promise';
import chokidar from 'chokidar';

const build = createCommand('build')
  .description('builds a PageLogic project')
  .arguments('<src-dir> <dst-dir>')
  .option('-g, --global-alias <alias>', 'alias for PageLogic object in browser', 'page')
  .option('-w, --watch', 'watch for changes', false)
  .action(async (srcDir: string, dstDir: string, options: any) => {
    process.on('uncaughtException', (err) => {
      console.error(err.stack ? err.stack : `${err}`);
    });
    const srcPath = path.normalize(path.join(process.cwd(), srcDir));
    await compile(srcDir, dstDir, options);
    if (options.watch) {
      const deboucedCompile = debounce(compile, 500);
      chokidar.watch(srcPath, {
        ignored: /([/\\]\.)/,
        ignorePermissionErrors: true,
        depth: 20,
        ignoreInitial: true,
      }).on('all', () => {
        deboucedCompile(srcDir, dstDir, options);
      });
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

async function compile(srcDir: string, dstDir: string, options: CompilerOptions) {
  const errors = new Array<string>();
  if (!await compiler(srcDir, dstDir, options, errors)) {
    for (const error of errors) {
      console.error(error);
    }
  }
}
