
export function normalizeText(s?: string): string | undefined {
  return s?.split(/\n\s+/).join('\n').split(/\s{2,}/).join(' ');
}

export function normalizeSpace(s?: string): string | undefined {
  return s?.split(/\s+/).join(' ');
}

export class Stack<T> extends Array<T> {

  constructor(a?: T[]) {
    super();
    a && this.push(...a);
  }

  peek(): T | undefined {
    if (this.length < 1) {
      return undefined;
    }
    return this[this.length - 1];
  }
}
