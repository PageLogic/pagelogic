import { Element } from '../../html/dom';
import { RT_FOREACH_ITEM_VALUE } from '../consts';
import { Global } from '../global';
import { Page } from '../page';
import { ScopeProps } from '../props';
import { Scope } from '../scope';

export class ForeachScope extends Scope {
  clones: Scope[];

  constructor(props: ScopeProps, e: Element, global?: Global) {
    super({ ...props, type: 'foreach' }, e, global);
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
        this.updateClone(this.clones[ci], vv[di]);
      } else {
        // create new clone
        this.addClone(vv[di]);
      }
    }
    // remove excess clones
    while (this.clones.length > length) {
      this.removeClone(this.clones.length - 1);
    }
  }

  addClone(data: unknown) {
    //TODO
  }

  updateClone(clone: Scope, data: unknown) {
    clone.obj[RT_FOREACH_ITEM_VALUE] = data;
  }

  removeClone(i: number) {
    const clone = this.clones.splice(i, 1)[0];
    // clone.unlink()
    //TODO
  }
}
