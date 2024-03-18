import { Context, Props, RefFunction, Scope, Value, ValueFunction } from './core';

export interface BootScope {
  id: number;
  values: { [key: string]: BootValue };
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

  newValue(
    scope: Scope,
    fn: ValueFunction,
    refs?: RefFunction[]
  ): Value;
}

export interface BootRuntime {
  context: Context;
  root: Scope;
}

export function boot(desc: BootScope, factory: BootFactory): BootRuntime {
  const context = factory.newContext();

  function scan(desc: BootScope, p: Scope | null): Scope {
    const props: Props = {};
    const ret = factory.newScope(context, props, p, null, desc.isolate || false);
    (Reflect.ownKeys(desc.values) as string[]).forEach(key => {
      const d = desc.values[key];
      const v = factory.newValue(ret, d.fn, d.refs);
      ret.$object[key] = v;
      props[key] = v;
    });
    desc.children?.forEach(child => {
      scan(child, ret);
    });
    return ret;
  }

  const root = scan(desc, null);
  context.refresh(root);
  return { context, root };
}
