import { Element } from '../html/dom';

export const DOM_ID_ATTR = 'data-lid';

export class Scope {
  p?: Scope;
  e: Element;
  children: Scope[];

  constructor(e: Element) {
    this.e = e;
    this.children = [];
  }

  linkTo(p: Scope, ref?: Scope): this {
    let i = ref ? p.children.indexOf(ref) : -1;
    i = i < 0 ? p.children.length : i;
    p.children.splice(i, 0, this);
    !p.e.parent && this.e.linkTo(p.e, ref?.e);
    return this;
  }

  unlink(): this {
    this.e.unlink();
    const i = this.p ? this.p.children.indexOf(this) : -1;
    i >= 0 && this.p!.children.splice(i, 1);
    delete this.p;
    return this;
  }
}
