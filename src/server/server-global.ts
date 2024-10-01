import { Document } from '../html/dom';
import { ServerDocument, ServerElement } from '../html/server-dom';
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

  override getElement(dom: number): ServerElement {
    return (this.doc as ServerDocument).domIdElements[dom];
  }
}
