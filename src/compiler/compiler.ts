import { generate } from 'escodegen';
import * as dom from '../html/dom';
import { PageError, Source } from '../html/parser';
import { ServerGlob } from '../server/server-glob';
import { CompilerPage } from './compiler-page';
import { Preprocessor } from '../html/preprocessor';

export function compile(src: Source): CompilerPage {
  const glob = new ServerGlob(src.doc, { root: [{ dom: 0 }]} );
  const page = new CompilerPage(glob);
  if (page.errors.length) {
    return page;
  }
  try {
    glob.js = generate(page.ast);
    glob.props = eval(`(${glob.js})`);
  } catch (err) {
    page.errors.push(new PageError(
      'error', `internal error: ${err}`, src.doc.loc
    ));
  }
  return page;
}

export interface CompiledPage {
  fname: string;
  errors: PageError[];
  files: string[];
  doc?: dom.Document;
  code?: string;
}

export interface CompilerProps {
  clientFile?: string;
}

export class Compiler {
  preprocessor: Preprocessor;
  props: CompilerProps;

  constructor(docroot: string, props: CompilerProps) {
    this.preprocessor = new Preprocessor(docroot);
    this.props = props;
  }

  async compile(fname: string): Promise<CompiledPage> {
    const ret: CompiledPage = {
      fname, errors: [], files: []
    };
    const src = await this.preprocessor.load(fname);
    ret.doc = src.doc;
    ret.errors.push(...src.errors);
    ret.files.push(...src.files);
    if (ret.errors.length) {
      return ret;
    }
    const page = compile(src);
    ret.doc = page.glob.doc;
    ret.errors.push(...page.errors);
    if (ret.errors.length) {
      return ret;
    }

    return ret;
  }

}
