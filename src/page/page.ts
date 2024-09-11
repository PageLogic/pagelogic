import { Glob } from './glob';
import { Scope } from './scope';

export const SRC_LOGIC_ATTR_PREFIX = ':';

export abstract class Page {
  glob: Glob;
  root!: Scope;
  nextScopeId = 0;

  constructor(glob: Glob) {
    this.glob = glob;
    this.init();
  }

  abstract init(): void;
}
