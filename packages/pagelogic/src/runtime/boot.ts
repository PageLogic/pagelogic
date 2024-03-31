import { Context, Props, RefFunction, Scope, Value, ValueFunction } from './core';

export const LOGIC_ATTR_RE = /^[:$]/;
export const LOGIC_VALUE_RE = /^:?(\$?[^:]+)$/;
export const DOM_ID_ATTR = 'data-pagelogic';

export const SCOPE_NAME_ATTR = '$name';
export const SCOPE_NAME_KEY = '$name';
export const SCOPE_PARENT_KEY = '$parent';
export const ATTR_VALUE_PREFIX = 'attr$';

export const DATA_KEY = '$data';
export const LISTFOR_KEY = '$listFor';
export const NESTFOR_KEY = '$nestFor';
export const NESTIN_KEY = '$nestIn';

export interface BootScope {
  id: number;
  values: { [key: string]: BootValue | string };
  name?: string;
  isolate?: boolean;
  parent?: BootScope;
  children?: BootScope[];
}

export interface BootValue {
  fn: ValueFunction;
  refs?: RefFunction[];
}

export interface BootFactory {
  newContext(): Context;

  newScope(
    ctx: Context, props: Props,
    parent: Scope | null, proto: object | null,
    isolate: boolean
  ): Scope;

  newValue(key: string, fn: ValueFunction, refs?: RefFunction[]): Value;

  setValueScope(key: string, value: Value, scope: Scope): void;
}

export interface BootRuntime {
  context: Context;
  root: Scope;
}

export function boot(desc: BootScope, factory: BootFactory): BootRuntime {
  const context = factory.newContext();

  function scan(desc: BootScope, p: Scope | null): Scope {
    const props: Props = {};
    (Reflect.ownKeys(desc.values) as string[]).forEach(key => {
      const d = desc.values[key];
      props[key] = typeof d === 'string' ? d : factory.newValue(key, d.fn, d.refs);
    });
    const ret = factory.newScope(context, props, p, null, desc.isolate || false);
    for (const k of Reflect.ownKeys(ret.$object) as string[]) {
      const v = ret.$object[k];
      if (v instanceof Value) {
        factory.setValueScope(k, v, ret);
      }
    }
    desc.children?.forEach(child => {
      scan(child, ret);
    });
    return ret;
  }

  const root = scan(desc, null);
  context.refresh(root);
  return { context, root };
}
