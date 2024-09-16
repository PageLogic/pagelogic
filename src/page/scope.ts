import { Element } from '../html/dom';
import { Value } from './value';

export const DOM_ID_ATTR = 'data-lid';

export class Scope {
  p?: Scope;
  id: number;
  e: Element;
  name?: string;
  values: { [key: string]: Value };
  children: Scope[];

  constructor(id: number, e: Element) {
    this.id = id;
    this.e = e;
    this.values = {};
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
