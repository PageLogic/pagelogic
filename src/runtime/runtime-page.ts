import { Element } from '../html/dom';
import { Page } from '../page/page';
import { Scope } from '../page/scope';

//TODO: add values to parent scope for named scopes, if they don't conflict
export class RuntimePage extends Page {

  override init() {
    const load = (e: Element, p: Scope) => {
      //TODO
      return p;
    };
    this.root = load(this.glob.doc.documentElement!, this.glob);
  }
}
