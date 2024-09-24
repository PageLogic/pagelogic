import { Element } from '../html/dom';
import { Global } from '../page/global';

export class ClientGlobal extends Global {

  override init() {
    //TODO
  }

  override getElement(_: number): Element {
    //TODO
    return this.doc.documentElement!;
  }
}
