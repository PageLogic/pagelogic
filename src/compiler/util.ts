
export class Stack<T> extends Array<T> {

  peek(i = -1): T | undefined {
    if (i < 0) {
      i += this.length;
    }
    return i >= 0 && i < this.length ? this[i] : undefined;
  }

}

export class Path extends Array<string> {

  startsWith(other: string[]): boolean {
    const len = Math.min(this.length, other.length);
    for (let i = 0; i < len; i++) {
      if (this[i] !== other[i]) {
        return false;
      }
    }
    return true;
  }

}
