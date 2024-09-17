
export class Stack<T> extends Array<T> {

  peek(i = -1): T | undefined {
    if (i < 0) {
      i += this.length;
    }
    return i >= 0 && i < this.length ? this[i] : undefined;
  }

}

export class Path extends Array<string> {

  startsWith(start: string[]): boolean {
    if (this.length < start.length) {
      return false;
    }
    for (const i in start) {
      if (this[i] !== start[i]) {
        return false;
      }
    }
    return true;
  }

}
