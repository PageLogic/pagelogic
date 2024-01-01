import { NextFunction, Request, Response } from 'express';
import { Window } from 'happy-dom';
import { CodeCompiler, Page } from '../code/compiler';
import fs from "fs";
import path from "path";

// https://expressjs.com/en/guide/writing-middleware.html
// https://typescript.tv/hands-on/how-to-type-express-js-middleware/

export interface PageLogicConfig {
  rootPath?: string;
  ssr?: boolean;
  // virtualFiles?: Array<VirtualFile>;
}

const CLIENT_FILE = '/pagelogic-rt.js';
const pages = new Map<string, Page>();
let runtimeJs = '';

try {
  // add initial pseudo-page for runtime js delivery
  runtimeJs = fs.readFileSync(
    path.join(__dirname, '../pagelogic.js'),
    { encoding: 'utf8' }
  );
  pages.set('/pagelogic-rt', {
    fname: CLIENT_FILE,
    errors: [],
    files: [],
    code: runtimeJs,
  });
} catch (error: any) {
  console.log('runtimeJs', error);
}

export function pageLogic(config: PageLogicConfig) {
  const rootPath = config.rootPath || process.cwd();
  const compiler = new CodeCompiler(rootPath, { clientFile: CLIENT_FILE });

  return async function (req: Request, res: Response, next: NextFunction) {
    const i = req.path.indexOf('.');
    let extname = i < 0 ? '.html' : req.path.substring(i).toLowerCase();
    if (extname !== '.html' && extname !== '.js') {
      return next();
    }
    let pathname = i < 0 ? req.path : req.path.substring(0, i).toLowerCase();
    if (i < 0) {
      const fullPath = path.join(rootPath, pathname);
      const stat = await fs.promises.stat(fullPath);
      if (stat.isDirectory()) {
        // if has no suffix and it's a directory,
        // it means the index.html inside
        pathname = path.join(pathname, 'index');
      }
    }
    if (extname === '.html') {
      const page = await compiler.compile(pathname + extname);
      if (page.errors.length) {
        res.header('Content-Type', 'text/plain;charset=UTF-8');
        res.send(page.errors.map(error => error.msg).join('\n'));
        return;
      } else {
        pages.set(pathname, page);
        if (config.ssr) {
          try {
            //TODO; optimize js code swapping
            const window = new Window();
            const name = path.basename(pathname);
            const html = page.markup!.replace(
                '<script src="/pagelogic-rt.js"></script>',
                `<script id="pl-ssr-script-1">${runtimeJs}</script>`
              ).replace(
                `<script src="${name}.js"></script>`,
                `<script id="pl-ssr-script-2">${page.code!}</script>`
              );
            const doc = window.document;
            doc.write(html);
            const out = doc.documentElement.outerHTML;
            const i1 = out.indexOf('<script id="pl-ssr-script-1">');
            const i2 = out.indexOf('</script>', i1);
            const i3 = out.indexOf('<script id="pl-ssr-script-2">', i2);
            const i4 = out.indexOf('</script>', i3);
            const i5 = i4 + '</script>'.length;
            const p = [];
            p.push(out.substring(0, i1));
            p.push('<script src="/pagelogic-rt.js"></script>\n');
            p.push(`<script src="${name}.js"></script>`);
            p.push(out.substring(i5));
            res.header('Content-Type', 'text/html;charset=UTF-8');
            res.send(`<!DOCTYPE html>\n${p.join('')}`);
            return;
          } catch (error: any) {
            res.header('Content-Type', 'text/plain;charset=UTF-8');
            res.send(`${error}`);
            return;
          }
        }
        res.header('Content-Type', 'text/html;charset=UTF-8');
        res.send(`<!DOCTYPE html>\n${page.markup}`);
        return;
      }
    } else if (extname === '.js') {
      const page = pages.get(pathname);
      if (page) {
        res.header('Content-Type', 'text/javascript;charset=UTF-8');
        res.send(page.code);
        return;
      }
    }
    next();
  }
}
