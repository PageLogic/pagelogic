import { Global } from '../page/global';
import * as k from '../page/consts';
import * as dom from '../html/dom';

//TODO: it shouldn't import dom.ts
export class ClientGlobal extends Global {

  override init() {
    //TODO
  }

  // get doc(): Document {
  //   return this.e as unknown as Document;
  // }

  override getElement(dom: number): dom.Element {
    const doc = this.doc as unknown as Document;
    const ret = doc.querySelector(`*[${k.DOM_ID_ATTR}="${dom}"]`)!;
    return ret as unknown as dom.Element;
  }
}
