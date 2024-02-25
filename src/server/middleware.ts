import { NextFunction, Request, Response } from 'express';
import { Window } from 'happy-dom';
import { CodeTranspiler, Page } from '../code/transpiler';
import fs from "fs";
import path from "path";
import { DST_CLIENT_CODE, SRC_CLIENT_CODE } from '../consts';
import { WebContext } from '../runtime/web/context';
import { ScopeProps } from '../runtime/core/scope';
import { PageMap } from './pagemap';

// https://expressjs.com/en/guide/writing-middleware.html
// https://typescript.tv/hands-on/how-to-type-express-js-middleware/

export interface PageLogicConfig {
  rootPath?: string;
  ssr?: boolean;
  // virtualFiles?: Array<VirtualFile>;
}

const pages = new Map<string, Page>();
let runtimeJs = '';

try {
  runtimeJs = fs.readFileSync(
    path.join(__dirname, `../${SRC_CLIENT_CODE}`),
    { encoding: 'utf8' }
  );
} catch (error: any) {
  // console.log('runtimeJs', error);
  // tempdebug
  try {
    runtimeJs = fs.readFileSync(
      path.join(__dirname, `../../dist/${SRC_CLIENT_CODE}`),
      { encoding: 'utf8' }
    );
  } catch (ignored: any) {
    console.log('runtimeJs', error);
  }
}
// add initial pseudo-page for runtime js delivery
pages.set('/pagelogic-rt', {
  fname: DST_CLIENT_CODE,
  errors: [],
  files: [],
  code: runtimeJs,
});

export function pageLogic(config: PageLogicConfig) {
  const rootPath = config.rootPath || process.cwd();
  const pageMap = new PageMap(rootPath);
  const transpiler = new CodeTranspiler(rootPath, { clientFile: DST_CLIENT_CODE });

  return async function (req: Request, res: Response, next: NextFunction) {
    const i = req.path.indexOf('.');
    const extname = i < 0 ? '.html' : req.path.substring(i).toLowerCase();
    if (extname !== '.html' && extname !== '.js') {
      return next();
    }
    let pathname = i < 0 ? req.path : req.path.substring(0, i).toLowerCase();
    if (i < 0) {
      try {
        const item = await pageMap.getItem(pathname);
        if (item && pageMap.isDirectory(item)) {
          // if has no suffix and it's a directory,
          // it means the index.html inside
          pathname = path.join(pathname, 'index');
        }
      } catch (ignored: any) {}
    }
    if (extname === '.html') {
      const page = await transpiler.compile(pathname + extname);
      if (page.errors.length) {
        res.header('Content-Type', 'text/plain;charset=UTF-8');
        res.send(page.errors.map(error => error.msg).join('\n'));
        return;
      } else {
        pages.set(pathname, page);
        if (config.ssr) {
          try {
            // https://github.com/capricorn86/happy-dom/wiki/Settings#changing-settings
            const window = new Window({
              settings: {
                disableJavaScriptFileLoading: true,
                disableJavaScriptEvaluation: false,
                disableCSSFileLoading: true,
                enableFileSystemHttpRequests: false
              }
            });
            const doc = window.document;
            doc.write(page.markup!);
            window.eval(runtimeJs);
            window.eval(page.code!);
            const out = doc.documentElement.outerHTML;
            res.header('Content-Type', 'text/html;charset=UTF-8');
            res.send(`<!DOCTYPE html>\n${out}`);
            return;
          } catch (error: any) {
            //TODO: error status
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
