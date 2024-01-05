import fs from 'fs';
import path from "path";
import { DST_CLIENT_CODE, SRC_CLIENT_CODE } from '../consts';
import { GLOBAL_NAME } from '../runtime/web/context';
import { CodeTranspiler } from './transpiler';

export const HTML_MARKER = '<!-- pagelogic-generated -->';
export const JS_MARKER = '/* pagelogic-generated */';

export async function compiler(
  errors: string[],
  srcDir: string,
  dstDir: string,
  globalAlias?: string
): Promise<boolean> {
  const srcPath = path.normalize(path.join(process.cwd(), srcDir));
  const dstPath = path.normalize(path.join(process.cwd(), dstDir));
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
  if (globalAlias && !/^\w+$/.test(globalAlias)) {
    errors.push(`invalid global alias "${globalAlias}"`);
    return false;
  }
  //
  // copy client code
  //
  const s = await fs.promises.readFile(path.join(__dirname, '..', SRC_CLIENT_CODE), { encoding: 'utf8' });
  await fs.promises.writeFile(path.join(dstPath, DST_CLIENT_CODE), s, { encoding: 'utf8' });
  //
  // compile pages
  //
  const transpiler = new CodeTranspiler(srcPath, { addSourceMap: true, clientFile: DST_CLIENT_CODE });
  const files = await transpiler.list('.html');
  const generated = new Set<string>();
  let ok = true;
  for (let fname of files) {
    const page = await transpiler.compile(fname);
    if (page.errors.length) {
      ok = false;
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
      console.log('');
      continue;
    }
    const srcFilePath = path.join(srcPath, fname);
    const dstFilePath = path.join(dstPath, fname);
    // if (dstFilePath === srcFilePath) {
    //   errors.push(`cannot overwrite ${path.join(srcDir, fname)}\n`);
    //   continue;
    // }
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
  return ok;
}
