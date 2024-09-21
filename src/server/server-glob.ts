import { Element } from '../html/dom';
import { Glob } from '../page/glob';

export class ServerGlob extends Glob {

  override init() {
    //TODO
  }

  override getElement(dom: number): Element {
    return this.doc.domIdElements[dom];
  }
}
