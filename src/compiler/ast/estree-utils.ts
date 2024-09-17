import * as es from 'estree';
import { SourceLocation } from '../../html/dom';

//TODO: when qualifier.ts switches to acorn-walk, here there should be
//only a function to recursively add estree locations to acorn nodes,
//in order to provide escodegen with the expected location information

export function esLoc(ref: es.Node) {
  const ret = {
    loc: ref.loc,
    range: ref.range,
  };
  return ret;
}

export function esIdentifier(key: string, ref: es.Node): es.Identifier {
  return {
    type: 'Identifier',
    name: key,
    ...esLoc(ref),
  };
}
