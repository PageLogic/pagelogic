import { Element } from '../../html/dom';
import { Global } from '../global';
import { ScopeType } from '../props';
import { Scope } from '../scope';

export class ForeachScope extends Scope {

  constructor(id: number, e: Element, global?: Global, _?: ScopeType) {
    super(id, e, global, 'foreach');
  }

}
