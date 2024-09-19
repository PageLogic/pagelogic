import { Element } from '../html/dom';
import { Glob } from '../page/glob';
import { Scope } from '../page/scope';
import { Value } from '../page/value';
import { ClientScope } from './client-scope';
import { ClientValue } from './client-value';

export class ClientGlob extends Glob {

  override init() {
    //TODO
  }

  override newScope(id: number, e: Element): Scope {
    return new ClientScope(id, e);
  }

  override newValue(): Value {
    return new ClientValue();
  }
}
