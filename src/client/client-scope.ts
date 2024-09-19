import { Element } from '../html/dom';
import { Scope } from '../page/scope';

export class ClientScope extends Scope {

  constructor(id: number, e: Element) {
    super(id, e);
  }

}
