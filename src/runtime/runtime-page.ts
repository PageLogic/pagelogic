import { Element } from '../html/dom';
import { Page } from '../page/page';
import { Scope } from '../page/scope';

export class RuntimePage extends Page {

  override init() {
    const load = (e: Element, p: Scope) => {
      //TODO
      return p;
    };
    this.root = load(this.glob.doc.documentElement!, this.glob);
  }
}
