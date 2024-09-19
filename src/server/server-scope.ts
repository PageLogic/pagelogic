import { Element } from '../html/dom';
import { Scope } from '../page/scope';

export class ServerScope extends Scope {

  constructor(id: number, e: Element) {
    super(id, e);
  }

}
