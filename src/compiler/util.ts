
export class Stack<T> extends Array<T> {

  peek(i = -1): T | undefined {
    if (i < 0) {
      i += this.length;
    }
    return i >= 0 && i < this.length ? this[i] : undefined;
  }

}
