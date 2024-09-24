import { Document, Element } from '../html/dom';
import { Glob } from '../page/glob';
import { PageProps } from '../page/props';

export class ServerGlob extends Glob {
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
