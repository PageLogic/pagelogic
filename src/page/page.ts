import { Glob } from './glob';
import { Scope } from './scope';

export const SRC_LOGIC_ATTR_PREFIX = ':';
export const SRC_SYSTEM_ATTR_PREFIX = '::';
export const SRC_ATTR_NAME_REGEX = /^:{0,2}[a-zA-Z_][a-zA-Z0-9_$\-]*$/;

export const SRC_NAME_ATTR = SRC_SYSTEM_ATTR_PREFIX + 'name';

export const RT_ATTR_VALUE_PREFIX = 'attr$';

export abstract class Page {
  glob: Glob;
  root!: Scope;

  constructor(glob: Glob) {
    this.glob = glob;
    this.init();
  }

  abstract init(): void;
}
