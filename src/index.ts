import { Command } from 'commander';
import fs from 'fs';
import path from "path";
import { CodeCompiler } from './code/compiler';

const SRC_CLIENT_CODE = 'pagelogic.js';
const DST_CLIENT_CODE = '/pagelogic.js';

const program = new Command();

program
  .name('pagelogic')
  .description('PageLogic CLI - https://github.com/fcapolini/231227')
  .version('1.0.0');

program.command('build')
  .description('builds a PageLogic project')
  .argument('<src-dir>')
  .option('-o, --out-dir <dst-dir>')
  .action(async (srcDir: string, options: any) => {
    //
    // check paths
    //
    const srcPath = path.normalize(path.join(process.cwd(), srcDir));
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

    //
    // copy client code
    //
    const s = await fs.promises.readFile(path.join(__dirname, SRC_CLIENT_CODE), { encoding: 'utf8' });
    await fs.promises.writeFile(path.join(dstPath, DST_CLIENT_CODE), s, { encoding: 'utf8' });

    //
    // compile pages
    //
    const compiler = new CodeCompiler(srcPath, { addSourceMap: true, clientFile: DST_CLIENT_CODE });
    const files = await compiler.list('.html');
    for (let fname of files) {
      const page = await compiler.compile(fname);
      if (page.errors.length) {
        for (let e of page.errors) {
          if (e.from?.loc?.source) {
            const loc = e.from.loc;
            console.error(
              `${path.join(srcDir, loc.source!)}` +
              `[${loc.start.line},${loc.start.column + 1}]`,
              e.msg
            );
          } else {
            console.error(`${path.join(srcDir, fname)}`, e.msg);
          }
        }
        console.log('');
        continue;
      }
      const srcFilePath = path.join(srcPath, fname);
      const dstFilePath = path.join(dstPath, fname);
      if (dstFilePath === srcFilePath) {
        console.error(`cannot overwrite ${path.join(srcDir, fname)}\n`);
        continue;
      }
      await fs.promises.mkdir(path.dirname(dstFilePath), { recursive: true });
      await fs.promises.writeFile(dstFilePath, page.markup!, { encoding: 'utf8' });
      const suffix = path.extname(dstFilePath);
      const length = dstFilePath.length - suffix.length;
      const jsFilePath = dstFilePath.substring(0, length) + '.js';
      await fs.promises.writeFile(jsFilePath, page.code!, { encoding: 'utf8' });
      if (page.sourceMap) {
        await fs.promises.writeFile(jsFilePath + '.map', page.sourceMap, { encoding: 'utf8' });
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
