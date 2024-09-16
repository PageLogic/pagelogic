import * as es from 'estree';
import { SourceLocation } from '../../html/dom';

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
