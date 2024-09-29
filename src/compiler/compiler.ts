import { generate } from 'escodegen';
import * as dom from '../html/dom';
import { PageError, Source } from '../html/parser';
import { ServerGlobal } from '../server/server-global';
import { CompilerPage } from './compiler-page';
import { Preprocessor } from '../html/preprocessor';
import { PageProps } from '../page/props';

export function compile(src: Source): CompilerPage {
  const glob = new ServerGlobal(src.doc, { root: [{ dom: 0 }]} );
  const page = new CompilerPage(glob);
  if (page.errors.length) {
    return page;
  }
  try {
    glob.js = generate(page.ast);
    glob.props = eval(`(${glob.js})`);
  } catch (err) {
    page.errors.push(new PageError(
      'error', `compiler internal error: ${err}`, src.doc.loc
    ));
  }
  return page;
}

export interface CompilerProps {
  cache?: boolean;
}

export interface CompiledPage {
  errors: PageError[];
  doc?: dom.Document;
  props?: PageProps;
}

export class Compiler {
  preprocessor: Preprocessor;
  props: CompilerProps;

  constructor(docroot: string, props: CompilerProps) {
    this.preprocessor = new Preprocessor(docroot);
    this.props = props;
  }

  async compile(fname: string): Promise<CompiledPage> {
    const source = await this.preprocessor.load(fname);
    const comp = compile(source);
    return {
      errors: comp.errors,
      doc: comp.glob.doc,
      props: comp.glob.props
    };
  }
}
