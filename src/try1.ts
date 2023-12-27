import { Parser } from "acorn";
import jsx from "acorn-jsx";
import escodegen from "escodegen";

// const MyParser = Parser.extend(jsx({}));
const SourceParser = Parser.extend((p: any) => {
  // Workaround to make the JSX parser accept `:`-prefixed
  // tag and attribute names.
  const original = p.acorn.isIdentifierStart;
  p.acorn.isIdentifierStart = (ch: number) => {
    return /^[a-zA-Z_\:\$]$/.test(String.fromCharCode(ch));
  }
  const ret = jsx()(p);
  p.acorn.isIdentifierStart = original;
  return ret;
});
const program = SourceParser.parse(
  // `<html class="app" :x={y + 1}></html>`,
  `({ pippo: {} })`,
  { ecmaVersion: "latest", locations: true, sourceFile: 'literal' }
);
const js = escodegen.generate(program);
console.log(js);
const map = escodegen.generate(program, { sourceMap: 'literal.js' });
console.log(map);
