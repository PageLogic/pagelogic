import { Context, Props, RefFunction, Scope, Value, ValueFunction } from './core';

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

  newValue(fn: ValueFunction, refs?: RefFunction[]): Value;
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
      props[key] = typeof d === 'string' ? d : factory.newValue(d.fn, d.refs);
    });
    const ret = factory.newScope(context, props, p, null, desc.isolate || false);
    desc.children?.forEach(child => {
      scan(child, ret);
    });
    return ret;
  }

  const root = scan(desc, null);
  context.refresh(root);
  return { context, root };
}
