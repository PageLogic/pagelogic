import { Command } from 'commander';
import fs from 'fs';
import path from "path";
import { CodeCompiler } from './code/compiler';
import { GLOBAL_NAME } from './runtime/web/context';
import { Server } from './server/server';

const SRC_CLIENT_CODE = 'pagelogic.js';
const DST_CLIENT_CODE = '/page.logic.js';
const HTML_MARKER = '<!-- pagelogic-generated -->';
const JS_MARKER = '/* pagelogic-generated */';

const program = new Command();

program
  .name('pagelogic')
  .description('PageLogic CLI - https://github.com/fcapolini/pagelogic')
  .version('1.0.0');

program.command('build')
  .description('builds a PageLogic project')
  .argument('<src-dir>')
  .option('-o, --out-dir <dst-dir>')
  .option('-g, --global-alias <alias>', 'alias for PageLogic object in browser', 'page')
  .action(async (srcDir: string, options: any) => {
    //
    // check arguments
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
    let globalAlias = '';
    if (options.globalAlias) {
      if (/^\w+$/.test(options.globalAlias)) {
        globalAlias = options.globalAlias;
      } else {
        console.error(`invalid global alias ${options.globalAlias}`);
        return;
      }
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
    const generated = new Set<string>();
    let ok = true;
    for (let fname of files) {
      const page = await compiler.compile(fname);
      if (page.errors.length) {
        ok = false;
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
      const html = HTML_MARKER + '\n' + page.markup;
      await fs.promises.mkdir(path.dirname(dstFilePath), { recursive: true });
      await fs.promises.writeFile(dstFilePath, html, { encoding: 'utf8' });
      generated.add(dstFilePath);
      const suffix = path.extname(dstFilePath);
      const length = dstFilePath.length - suffix.length;
      const jsFilePath = dstFilePath.substring(0, length) + '.js';
      let code = JS_MARKER + '\n' + page.code!;
      if (globalAlias && globalAlias !== GLOBAL_NAME) {
        code += `\nwindow.${globalAlias} = window.${GLOBAL_NAME}`;
      }
      await fs.promises.writeFile(jsFilePath, code + '\n', { encoding: 'utf8' });
      generated.add(jsFilePath);
      if (page.sourceMap) {
        const jsMapFilePath = jsFilePath + '.map';
        await fs.promises.writeFile(jsMapFilePath, page.sourceMap, { encoding: 'utf8' });
        generated.add(jsMapFilePath);
      }
    }
    //
    // remove obsolete artifacts
    //
    const cleanup = async (dir: string) => {
      const ff = await fs.promises.readdir(dir);
      for (let file of ff) {
        const fname = path.join(dir, file);
        if (fname.endsWith('.map')) {
          continue;
        }
        const stat = await fs.promises.stat(fname);
        if (stat.isDirectory()) {
          cleanup(fname);
          continue;
        }
        if (
          (!file.endsWith('.html') && !file.endsWith('.js')) ||
          !stat.isFile() || generated.has(fname)
         ) {
          continue;
        }
        const text = await fs.promises.readFile(fname, { encoding: 'utf8' });
        if (!text.startsWith(HTML_MARKER) && !text.startsWith(JS_MARKER)) {
          continue;
        }
        await fs.promises.rm(fname);
        if (fname.endsWith('.js')) {
          await fs.promises.rm(fname + '.map');
        }
      }
    }
    ok && await cleanup(dstPath);
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
//     new Server({
//       port: port,
//       rootPath: root,
//       trustProxy: false,
//       pageLimit: {
//         windowMs: 5000,
//         maxRequests: 50
//       },
//       // liveUpdate: true,
//     }).start();
//   });

program.parse();
