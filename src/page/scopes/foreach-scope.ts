import { Element } from '../../html/dom';
import { RT_FOREACH_ITEM_VALUE } from '../consts';
import { Global } from '../global';
import { Page } from '../page';
import { ScopeType } from '../props';
import { Scope } from '../scope';

export class ForeachScope extends Scope {
  clones: Scope[];

  constructor(id: number, e: Element, global?: Global, _?: ScopeType) {
    super(id, e, global, 'foreach');
    this.clones = [];
    //TODO: recover existing clones from DOM
  }

  override linkTo(page: Page, p: Scope, ref?: Scope): this {
    super.linkTo(page, p, ref);
    //TODO: unlink clones
    return this;
  }

  override unlink(page: Page): this {
    //TODO: link clones
    return super.unlink(page);
  }

  // ===========================================================================
  // proxy object
  // ===========================================================================

  override makeObj(page: Page): this {
    this.values[RT_FOREACH_ITEM_VALUE].cb = (_, v) => {
      this.replicateFor(Array.isArray(v) ? v : []);
      return v;
    };
    return super.makeObj(page);
  }

  // ===========================================================================
  // refresh
  // ===========================================================================

  unlinkValues(_ = true) {
    super.unlinkValues(false);
  }

  linkValues(_ = true) {
    super.linkValues(false);
  }

  updateValues(_ = true) {
    super.updateValues(false);
  }

  // ===========================================================================
  // replication
  // ===========================================================================

  replicateFor(vv: unknown[]) {
    const offset = 0, length = vv.length;
    // add/update clones
    let ci = 0, di = offset;
    for (; di < (offset + length - 1); ci++, di++) {
      if (ci < this.clones.length) {
        // update existing clone
        this.clones[ci].obj[RT_FOREACH_ITEM_VALUE] = vv[di];
      } else {
        // create new clone
        //FIXME
      }
      // remove excess clones
      this.removeClones(length - 1);
    }
  }

  removeClones(maxCount: number) {
    if (this.clones) {
      while (this.clones.length > maxCount) {
        const clone = this.clones.pop()!;
        //FIXME
      }
    }
  }
}
