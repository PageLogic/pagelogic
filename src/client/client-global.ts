import * as dom from '../html/dom';
import * as k from '../page/consts';
import { Global } from '../page/global';

export class ClientGlobal extends Global {
  domIdElements!: dom.Element[];

  override init() {
    const doc = this.doc as unknown as Document;
    this.domIdElements = [];
    doc.querySelectorAll(`*[${k.DOM_ID_ATTR}]`).forEach(e => {
      const id = parseInt(e.getAttribute(k.DOM_ID_ATTR)!);
      this.domIdElements[id] = e as unknown as dom.Element;
    });
  }

  override getElement(dom: number): dom.Element {
    return this.domIdElements[dom];
  }
}
