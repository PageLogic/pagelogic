import { NextFunction, Request, Response } from 'express';
import fs from 'fs';
import path from 'path';
import { Compiler } from '../compiler/compiler';
import { PageError } from '../html/parser';
import { CLIENT_CODE_REQ, CLIENT_CODE_SRC } from '../page/consts';
import { RuntimePage } from '../runtime/runtime-page';
import { PageLogicLogger } from '../utils/logger';
import { ServerGlobal } from './server-global';
import { ServerDocument } from '../html/server-dom';

export interface PageLogicConfig {
  docroot?: string;
  ssr?: boolean;
  csr?: boolean;
  logger?: PageLogicLogger;
  // virtualFiles?: Array<VirtualFile>;
}

let js: string | undefined;

export function pageLogic(config: PageLogicConfig) {
  const docroot = config.docroot || process.cwd();
  const compiler = new Compiler(docroot, {
    csr: config.csr,
    logger: config.logger,
    watch: true
  });

  return async function(req: Request, res: Response, next: NextFunction) {
    const i = req.path.lastIndexOf('.');
    const extname = i < 0 ? '.html' : req.path.substring(i).toLowerCase();

    if (!js) {
      js = await getRuntimeCode();
    }

    // handle non-page requests
    if (req.path === CLIENT_CODE_REQ) {
      res.header('Content-Type', 'text/javascript;charset=UTF-8');
      res.send(js);
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
        const fullPath = path.join(docroot, pathname);
        const stat = await fs.promises.stat(fullPath);
        if (stat.isDirectory()) {
          pathname = path.join(pathname, 'index');
        }
      } catch (ignored) { /* nop */ }
    }

    const comp = await compiler.get(pathname + '.html');
    if (comp.errors.length) {
      return serveErrorPage(comp.errors, res);
    }

    let doc = comp.doc!;
    if (config.ssr) {
      doc = doc.clone(null, null) as ServerDocument;
      const global = new ServerGlobal(doc, comp.props!);
      new RuntimePage(global);
    }

    const html = doc.toString();
    res.header('Content-Type', 'text/html;charset=UTF-8');
    res.send('<!DOCTYPE html>' + html);
  };
}

function serveErrorPage(errors: PageError[], res: Response) {
  const p = new Array<string>();
  p.push(`<!DOCTYPE html><html><head>
    <title>Page Error</title>
    <meta name="color-scheme" content="light dark"/>
    </head><body><ul>`);
  errors.forEach(err => {
    const l = err.loc;
    p.push(`<li>${err.msg}`);
    l && p.push(` - ${l.source} `);
    l && p.push(`[${l.start.line}, ${l.start.column + 1}]`);
    p.push('</li>');
  });
  p.push('</ul></body></html>');
  res.header('Content-Type', 'text/html;charset=UTF-8');
  // res.sendStatus(500);
  res.send(p.join(''));
}

async function getRuntimeCode(): Promise<string> {
  let js = '';
  try {
    js = fs.readFileSync(
      path.join(__dirname, CLIENT_CODE_SRC),
      { encoding: 'utf8' }
    );
  } catch (error) {
    if (process.env.NODE_ENV === 'test') {
      try {
        js = fs.readFileSync(
          path.join(__dirname, `../../dist/server/${CLIENT_CODE_SRC}`),
          { encoding: 'utf8' }
        );
      } catch (ignored) {
        console.log('runtimeJs', error);
      }
    } else {
      console.log('runtimeJs', error);
    }
  }
  return js;
}
