import { Document, Element } from '../html/dom';
import { Global } from '../page/global';
import { PageProps } from '../page/props';

export class ServerGlobal extends Global {
  js?: string;

  constructor(doc: Document, props: PageProps) {
    super(doc, props);
  }

  override init() {
    //TODO
  }

  override getElement(dom: number): Element {
    return this.doc.domIdElements[dom];
  }
}
