import { Element } from '../../html/dom';
import { RT_FOREACH_ITEM_VALUE } from '../consts';
import { Global } from '../global';
import { Page } from '../page';
import { ScopeType } from '../props';
import { Scope } from '../scope';

export class ForeachScope extends Scope {

  constructor(id: number, e: Element, global?: Global, _?: ScopeType) {
    super(id, e, global, 'foreach');
  }

  override makeObj(page: Page): this {
    this.values[RT_FOREACH_ITEM_VALUE].cb = (s, v) => {
      //FIXME
      return v;
    };
    return super.makeObj(page);
  }

  unlinkValues(recur = true) {
    super.unlinkValues(false);
  }

  linkValues(recur = true) {
    super.linkValues(false);
  }

  updateValues(recur = true) {
    super.updateValues(false);
  }
}
