import { generate } from "escodegen";
import { generator } from "../logic/generator";
import { load } from "../logic/loader";
import { qualify } from "../logic/qualifier";
import { resolve } from "../logic/resolver";
import { Preprocessor } from "../source/preprocessor";
import { PageError } from "../source/parser";

export interface Page {
  fname: string;
  errors: PageError[];
  files: string[];
  markup: string;
  code?: string;
}

export interface CompilerProps {
  addDocType?: boolean;
  addSourceMap?: boolean;
  clientFile?: string;
}

export class Compiler {
  preprocessor: Preprocessor;
  props: CompilerProps;

  constructor(docroot: string, props: CompilerProps) {
    this.preprocessor = new Preprocessor(docroot);
    this.props = props;
  }

  async compile(fname: string): Promise<Page> {
    const source = await this.preprocessor.load(fname);
    const logic = resolve(qualify(load(source, null)));
    const ret: Page = {
      fname,
      errors: logic.errors,
      files: [fname, ...(logic.imports ? logic.imports.map(i => i.fname) : [])],
      markup: source.doc.toString(),
      code: (logic.errors.length ? undefined : generate(generator(logic)))
    };
    return ret;
  }

}
