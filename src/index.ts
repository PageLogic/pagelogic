import { Command } from 'commander';
import fs from 'fs';
import path from "path";
import { CodeCompiler } from './code/compiler';

const program = new Command();

program
  .name('pagelogic')
  .description('PageLogic CLI - https://github.com/fcapolini/231227')
  .version('1.0.0');

program.command('build')
  .description('builds a PageLogic project')
  .argument('<src-dir>')
  .option('-o, --out-dir <dst-dir>')
  .action(async (srcDir, options) => {
    const srcPath = path.normalize(path.join(process.cwd(), srcDir));
    // const dstPath = path.normalize(path.join(process.cwd(), dstDir));
    let dstPath = srcPath;
    if (options.outDir) {
      dstPath = path.normalize(path.join(process.cwd(), options.outDir));
    }
    if (!fs.statSync(srcPath).isDirectory()) {
      console.error(`${srcPath} is not a directory`);
      return;
    }
    if (!fs.statSync(dstPath).isDirectory()) {
      console.error(`${dstPath} is not a directory`);
      return;
    }
    const compiler = new CodeCompiler(srcPath);
    const files = await compiler.list('.pl.html');
    for (let fname of files) {
      const res = await compiler.compile(fname);
      for (let e of res.errors) {
        const source = e.from!.loc!.source!;
        const pos = e.from!.loc!.start;
        console.log(source, `[${pos.line}, ${pos.column}]`, e.msg);
      }
    }
  });

// program.command('serve')
//   .description('serves a PageLogic project')
//   .argument('<pathname>', 'path to docroot')
//   .option('-p, --port <number>', 'port number, default: 3000')
//   // .option('-l, --live', 'enable auto reload on page changes')
//   .action((pathname, options) => {
//     const root = path.normalize(path.join(process.cwd(), pathname));
//     const port = parseInt(options.port) || 3000;
//     // const live = options.live || false;
//     // new Server({
//     //   port: port,
//     //   rootPath: root,
//     //   trustProxy: false,
//     //   pageLimit: {
//     //     windowMs: 5000,
//     //     maxRequests: 50
//     //   },
//     //   // liveUpdate: true,
//     // }).start();
//   });

program.parse();
