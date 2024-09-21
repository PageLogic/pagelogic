import { Element } from '../html/dom';
import { Glob } from '../page/glob';

export class ClientGlob extends Glob {

  override init() {
    //TODO
  }

  override getElement(_: number): Element {
    //TODO
    return this.doc.documentElement!;
  }
}
