
export class StringBuf {
  parts: string[];

  constructor() {
    this.parts = [];
  }

  add(s: string) {
    this.parts.push(s);
  }

  toString() {
    return this.parts.join('');
  }
}

export function regexMap(
  re: RegExp, s: string, cb: (match: RegExpExecArray) => string
): string {
  const _re = re.flags.indexOf('g') >= 0 ? re : new RegExp(re, 'g' + re.flags);
  const sb = new StringBuf()
  let i = 0;
  for (let match; match = _re.exec(s); i = match.index + match[0].length) {
    match.index > i && sb.add(s.substring(i, match.index));
    sb.add(cb(match));
  }
  s.length > i && sb.add(s.substring(i));
  return sb.toString();
}

export function camelToHyphen(s: string) {
  return regexMap(/([0-9a-z][A-Z])/g, s, match =>
    s.charAt(match.index) + '-' + s.charAt(match.index + 1).toLowerCase()
  );
}

export function peek(a: any[]): any {
  return (a.length > 0 ? a[a.length - 1] : undefined);
}
