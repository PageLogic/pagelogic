import { Node } from "acorn";
import { walker } from "../../src/code/walker";

export function removeAstLocations(ast: Node) {
  // https://www.npmjs.com/package/acorn-walk
  walker.full(ast, node => {
    // @ts-ignore
    delete node.start;
    // @ts-ignore
    delete node.end;
    delete node.loc;
  });
}
