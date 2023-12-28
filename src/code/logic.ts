import { CodeSource } from "./types";
import { JSXElement, JSXOpeningElement, walker } from "./walker";

export class CodeLogic {
  source: CodeSource;
  addLocation: boolean;
  root?: CodeScope;

  constructor(source: CodeSource, addLocation = true) {
    this.source = source;
    this.addLocation = addLocation;
    let count = 0;
    const that = this;
    walker.ancestor(this.source.ast!, {
      // @ts-ignore
      JSXOpeningElement(node, _, anchestors) {
        if (that.needsScope(node)) {

        }
      },
    });
  }

  needsScope(node: JSXOpeningElement): boolean {
    return false;
  }

  // load(): this {
  //   let count = 0;
  //   walker.simple(this.source.ast!, {
  //     // @ts-ignore
  //     JSXOpeningElement(node, _) {
  //     },
  //   });
  //   return this;
  // }
}

export class CodeScope {
//   id: number;
//   name?: string;
//   isolate?: boolean;
//   children: CodeScope[];
//   values: { [key: string]: CodeValue };
//   node: Node;

//   constructor(id: number, name: string | undefined)
}
