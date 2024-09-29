
export class Stack<T> extends Array<T> {

  peek(i = -1): T | undefined {
    if (i < 0) {
      i += this.length;
    }
    return i >= 0 && i < this.length ? this[i] : undefined;
  }

}

export type Observer<T> = (msg: T) => void;

export class Observable<T> {
  observers: Observer<T>[] = [];

  addObserver(o: Observer<T>): this {
    this.observers.push(o);
    return this;
  }

  notify(msg: T): this {
    this.observers.forEach(o => { try { o(msg); } catch (_) { /* nop */ } });
    return this;
  }

  clear(): this {
    this.observers.splice(0, this.observers.length);
    return this;
  }
}
