import * as es from 'estree';

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

export function getProperty(
  o: es.ObjectExpression,
  name: string
): es.Node | null {
  for (const i in o.properties) {
    const p = o.properties[i] as es.Property;
    const id = p.key as es.Identifier;
    if (id.name === name) {
      return p.value;
    }
  }
  return null;
}

export function getPropertyName(e: es.MemberExpression): string | undefined {
  const p = e.property;
  if (p.type === 'Identifier') {
    return p.name;
  }
  if (p.type === 'Literal' && typeof p.value === 'string') {
    return p.value;
  }
  return undefined;
}
