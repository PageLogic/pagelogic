import fs from 'fs';
import path from 'path';
import { NextFunction, Request, Response } from 'express';
import { CLIENT_CODE_REQ, CLIENT_CODE_SRC } from './consts';
import { Compiler } from '../compiler/compiler';
import { PageError } from '../html/parser';

export interface PageLogicConfig {
  rootPath?: string;
  ssr?: boolean;
  // virtualFiles?: Array<VirtualFile>;
}

let runtimeJs = '';

try {
  runtimeJs = fs.readFileSync(
    path.join(__dirname, CLIENT_CODE_SRC),
    { encoding: 'utf8' }
  );
} catch (error) {
  // console.log('runtimeJs', error);
  // tempdebug
  try {
    runtimeJs = fs.readFileSync(
      path.join(__dirname, `../${CLIENT_CODE_SRC}`),
      { encoding: 'utf8' }
    );
  } catch (ignored) {
    console.log('runtimeJs', error);
  }
}

export function pageLogic(config: PageLogicConfig) {
  const rootPath = config.rootPath || process.cwd();
  const compiler = new Compiler(rootPath, {});

  return async function (req: Request, res: Response, next: NextFunction) {
    const i = req.path.lastIndexOf('.');
    const extname = i < 0 ? '.html' : req.path.substring(i).toLowerCase();

    // handle non-page requests
    if (req.path === CLIENT_CODE_REQ) {
      res.header('Content-Type', 'text/javascript;charset=UTF-8');
      res.send(runtimeJs);
      return;
    }
    if (req.path.startsWith('/.') || extname === '.htm') {
      res.sendStatus(404);
      return;
    }
    if (extname !== '.html') {
      return next();
    }

    // if path is a dir, access <dir>/index.html
    let pathname = i < 0 ? req.path : req.path.substring(0, i).toLowerCase();
    if (i < 0) {
      try {
        const fullPath = path.join(rootPath, pathname);
        const stat = await fs.promises.stat(fullPath);
        if (stat.isDirectory()) {
          pathname = path.join(pathname, 'index');
        }
      } catch (ignored) { /* nop */ }
    }

    const compiledPage = await compiler.compile(pathname + '.html');
    console.log(compiledPage.fname);//tempdebug
    if (compiledPage.errors.length) {
      return serveErrorPage(compiledPage.errors, res);
    }
    res.header('Content-Type', 'text/html;charset=UTF-8');
    res.send(compiledPage.doc!.toString());
  };
}

//TODO
function serveErrorPage(errors: PageError[], res: Response) {
  const p = new Array<string>();
  p.push(`<!DOCTYPE html>
    <html>
    <head>
      <meta name="color-scheme" content="light dark"/>
    </head>
    <body>
    <ul>`);
  errors.forEach(err => {
    const l = err.loc;
    p.push(`<li>${err.msg}`);
    l && p.push(` - ${l.source}`);
    p.push(`</li>`);
  });
  p.push(`</ul>
    </body>
    </html>`);
  res.header('Content-Type', 'text/html;charset=UTF-8');
  res.send(p.join(''));
}
