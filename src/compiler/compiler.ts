import { generate } from 'escodegen';
import * as dom from '../html/dom';
import { PageError, Source } from '../html/parser';
import { ServerGlobal } from '../server/server-global';
import { CompilerPage } from './compiler-page';
import { Preprocessor } from '../html/preprocessor';
import { PageProps } from '../page/props';
import { Observable } from './util';

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
  pages: Map<string, CompiledPage>;
  pending: Map<string, Observable<CompiledPage>>;

  constructor(docroot: string, props: CompilerProps) {
    this.preprocessor = new Preprocessor(docroot);
    this.props = props;
    this.pages = new Map();
    this.pending = new Map();
  }

  async get(fname: string): Promise<CompiledPage> {
    if (this.pages.has(fname)) {
      return this.pages.get(fname)!;
    }
    if (this.pending.has(fname)) {
      const observable = this.pending.get(fname)!;
      return new Promise<CompiledPage>(resolve => {
        observable.addObserver(page => resolve(page));
      });
    }
    const observable = new Observable<CompiledPage>();
    this.pending.set(fname, observable);
    const ret = await this.compile(fname);
    observable.notify(ret);
    this.pending.delete(fname);
    return ret;
  }

  protected async compile(fname: string): Promise<CompiledPage> {
    const source = await this.preprocessor.load(fname);
    if (source.errors.length) {
      return { errors: source.errors };
    }
    const comp = compile(source);
    return {
      errors: comp.errors,
      doc: comp.glob.doc,
      props: comp.glob.props
    };
  }
}

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
