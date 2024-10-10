import * as dom from '../html/dom';
import * as k from '../page/consts';
import { Global } from '../page/global';

export class ClientGlobal extends Global {

  override init() {
    // nop
  }

  override cloneTemplateImpl(t: dom.Element): dom.Element {
    return (t as unknown as HTMLTemplateElement).content
      .cloneNode(true) as unknown as dom.Element;
  }
}
