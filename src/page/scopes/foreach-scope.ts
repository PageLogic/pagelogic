import { ELEMENT_NODE } from 'trillo/preprocessor/dom';
import { Element } from '../../html/dom';
import { DOM_ID_ATTR, RT_FOREACH_ITEM_VALUE } from '../consts';
import { Global } from '../global';
import { Page } from '../page';
import { ScopeProps } from '../props';
import { Scope } from '../scope';

export class ForeachScope extends Scope {
  clones!: Scope[];

  constructor(page: Page, props: ScopeProps, e: Element, global?: Global) {
    super(page, { ...props, type: 'foreach' }, e, global);
  }

  override linkTo(p: Scope, ref?: Scope): this {
    super.linkTo(p, ref);
    if (!this.clones) {
      this.clones = [];
      // recover existing clones from DOM
      if (this.props.children) {
        const clonesProps = this.props.children![0];
        const clonesID = `-${clonesProps.dom}`;
        const ee = this.e.parent?.childNodes.filter(n =>
          n.nodeType === ELEMENT_NODE &&
          (n as Element).getAttribute(DOM_ID_ATTR) === clonesID
        ) as Element[];
        ee.forEach(e => {
          const clone = this.page.load(clonesProps, p, e);
          this.clones.push(clone);
        });
      }
    }
    // link clones
    this.clones.forEach(clone => clone.linkTo(p, this));
    return this;
  }

  override unlink(): this {
    // unlink clones
    this.clones?.forEach(clone => clone.unlink());
    return super.unlink();
  }

  // ===========================================================================
  // proxy object
  // ===========================================================================

  override makeObj(): this {
    this.values[RT_FOREACH_ITEM_VALUE].cb = (_, v) => {
      this.replicateFor(Array.isArray(v) ? v : []);
      return v;
    };
    return super.makeObj();
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
    for (; di < (offset + length); ci++, di++) {
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
    const dom = this.global!.cloneTemplate(this.e);
    this.e.parent!.insertBefore(dom, this.e);
    const clone = this.page.load(this.props.children![0], this.parent!, dom);
    clone.obj[RT_FOREACH_ITEM_VALUE] = data;
    this.page.refresh(clone);
    this.clones.push(clone);
  }

  updateClone(clone: Scope, data: unknown) {
    clone.obj[RT_FOREACH_ITEM_VALUE] = data;
  }

  removeClone(i: number) {
    const clone = this.clones.splice(i, 1)[0];
    clone.unlink();
  }
}
