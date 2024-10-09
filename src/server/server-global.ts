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
  }

  override getElement(dom: number): ServerElement {
    return (this.doc as ServerDocument).domIdElements[dom];
  }

  override cloneTemplateImpl(template: ServerElement): ServerElement {
    return (template.childNodes[0] as ServerElement).clone(
      template.ownerDocument,
      null
    );
  }
}
