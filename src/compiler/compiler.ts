import { generate } from 'escodegen';
import { PageError, Source } from '../html/parser';
import { ServerGlob } from '../server/server-glob';
import { CompilerPage } from './compiler-page';

export function compile(src: Source): CompilerPage {
  const glob = new ServerGlob(src.doc, { root: [{ dom: 0 }]} );
  const page = new CompilerPage(glob);
  try {
    const js = generate(page.ast);
    glob.props = eval(`(${js})`);
  } catch (err) {
    page.errors.push(new PageError(
      'error', `internal error: ${err}`, src.doc.loc
    ));
  }
  return page;
}
