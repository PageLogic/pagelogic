import { Element } from '../html/dom';
import { Glob } from '../page/glob';
import { Page } from '../page/page';
import { ValueProps } from '../page/props';
import { Scope } from '../page/scope';
import { Value } from '../page/value';
import { ServerScope } from './server-scope';
import { ServerValue } from './server-value';

export class ServerGlob extends Glob {

  override init() {
    //TODO
  }

  override getElement(dom: number): Element {
    return this.doc.domIdElements[dom];
  }
}
