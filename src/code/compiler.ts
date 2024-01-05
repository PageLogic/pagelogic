import fs from 'fs';
import path from "path";
import { DST_CLIENT_CODE, SRC_CLIENT_CODE } from '../consts';
import { GLOBAL_NAME } from '../runtime/web/context';
import { CodeTranspiler, Page } from './transpiler';

export const HTML_MARKER = '<!-- pagelogic-generated -->';
export const JS_MARKER = '/* pagelogic-generated */';

export interface CompilerOptions {
  globalAlias?: string;
}

/**
 *
 * @param srcDir
 * @param dstDir
 * @param options
 * @param errors
 * @returns
 */
export async function compiler(
  srcDir: string,
  dstDir: string,
  options: CompilerOptions,
  errors: string[]
): Promise<boolean> {
  const srcPath = path.normalize(path.join(process.cwd(), srcDir));
  const dstPath = path.normalize(path.join(process.cwd(), dstDir));
  // check arguments
  if (!checkArguments(srcPath, dstPath, options, errors)) {
    return false;
  }
  // copy client code
  const src = path.join(__dirname, '..', SRC_CLIENT_CODE);
  const dst = path.join(dstPath, DST_CLIENT_CODE);
  const txt = await fs.promises.readFile(src, { encoding: 'utf8' });
  await fs.promises.writeFile(dst, txt, { encoding: 'utf8' });
  // compile pages
  var { ok, generated } = await compilePages(
    srcPath, srcDir, dstPath, options, errors
  );
  // remove obsolete artifacts
  ok && await cleanup(dstPath, generated);
  return ok;
}

/**
 *
 * @param srcPath
 * @param dstPath
 * @param options
 * @param errors
 * @returns
 */
function checkArguments(
  srcPath: string,
  dstPath: string,
  options: CompilerOptions,
  errors: string[]
) {
  if (!fs.statSync(srcPath).isDirectory()) {
    errors.push(`${srcPath} is not a directory`);
    return false;
  }
  if (!fs.statSync(dstPath).isDirectory()) {
    errors.push(`${dstPath} is not a directory`);
    return false;
  }
  if (dstPath === srcPath) {
    errors.push(`<src-dir> and <dst-dir> cannot be the same`);
    return false;
  }
  if (options.globalAlias && !/^\w+$/.test(options.globalAlias)) {
    errors.push(`invalid global alias "${options.globalAlias}"`);
    return false;
  }
  return true;
}

/**
 *
 * @param srcPath
 * @param srcDir
 * @param dstPath
 * @param options
 * @param errors
 * @returns
 */
async function compilePages(
  srcPath: string, srcDir: string, dstPath: string,
  options: CompilerOptions, errors: string[]
) {
  const transpiler = new CodeTranspiler(srcPath, {
    addSourceMap: true,
    clientFile: DST_CLIENT_CODE
  });
  const files = await transpiler.list('.html');
  const generated = new Set<string>();
  let ok = true;
  for (let fname of files) {
    const page = await transpiler.compile(fname);
    if (page.errors.length) {
      ok = false;
      generateErrors(page, srcDir, fname, errors);
      // console.log('');
      continue;
    }
    const srcFilePath = path.join(srcPath, fname);
    const dstFilePath = path.join(dstPath, fname);
    // if (dstFilePath === srcFilePath) {
    //   errors.push(`cannot overwrite ${path.join(srcDir, fname)}\n`);
    //   continue;
    // }
    await generatePage(page, dstFilePath, generated, options);
  }
  return { ok, generated };
}

/**
 *
 * @param page
 * @param srcDir
 * @param fname
 * @param errors
 */
function generateErrors(
  page: Page, srcDir: string, fname: string, errors: string[]
) {
  for (let e of page.errors) {
    if (e.from?.loc?.source) {
      const loc = e.from.loc;
      errors.push(
        `${path.join(srcDir, loc.source!)}` +
        `[${loc.start.line},${loc.start.column + 1}] ` +
        e.msg
      );
    } else {
      errors.push(`${path.join(srcDir, fname)} ` + e.msg);
    }
  }
}

/**
 *
 * @param page
 * @param dstFilePath
 * @param generated
 * @param options
 */
async function generatePage(
  page: Page, dstFilePath: string, generated: Set<string>,
  options: CompilerOptions
) {
  const html = HTML_MARKER + '\n' + page.markup;
  await fs.promises.mkdir(path.dirname(dstFilePath), { recursive: true });
  await fs.promises.writeFile(dstFilePath, html, { encoding: 'utf8' });
  generated.add(dstFilePath);
  const suffix = path.extname(dstFilePath);
  const length = dstFilePath.length - suffix.length;
  const jsFilePath = dstFilePath.substring(0, length) + '.js';
  let code = JS_MARKER + '\n' + page.code!;
  if (options.globalAlias && options.globalAlias !== GLOBAL_NAME) {
    code += `\nwindow.${options.globalAlias} = window.${GLOBAL_NAME}`;
  }
  await fs.promises.writeFile(jsFilePath, code + '\n', { encoding: 'utf8' });
  generated.add(jsFilePath);
  if (page.sourceMap) {
    const p = jsFilePath + '.map';
    await fs.promises.writeFile(p, page.sourceMap, { encoding: 'utf8' });
    generated.add(p);
  }
}

/**
 *
 * @param dir
 * @param generated
 */
async function cleanup(dir: string, generated: Set<string>) {
  const ff = await fs.promises.readdir(dir);
  for (let file of ff) {
    const fname = path.join(dir, file);
    if (fname.endsWith('.map')) {
      continue;
    }
    const stat = await fs.promises.stat(fname);
    if (stat.isDirectory()) {
      await cleanup(fname, generated);
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
