import { Parser, Program } from "acorn";
import jsx from "acorn-jsx";

/**
 * Parses JSX-based page files accepting ':'-prefixed names for
 * tags and attributes. Produces JavaScript ASTs.
 */
export class CodeParser {
  parser: typeof Parser;

  constructor() {
    this.parser = Parser.extend((p: any) => {
      // workaround to make the JSX parser accept `:`-prefixed
      // tag and attribute names
      const original = p.acorn.isIdentifierStart;
      p.acorn.isIdentifierStart = (ch: number) => {
        return /^[a-zA-Z_\:\$]$/.test(String.fromCharCode(ch));
      }
      // jsx keeps a reference to p.acorn.isIdentifierStart
      // it finds at instantiation
      const ret = jsx()(p);
      // by restoring the original function the rest of Acorn
      // uses the correct version
      p.acorn.isIdentifierStart = original;
      return ret;
    });
  }

  parse(text: string, fname: string): Program {
    const program = this.parser.parse(text, {
      ecmaVersion: 6,
      sourceType: 'script',
      locations: true,
      sourceFile: fname
    });
    return program;
  }
}
