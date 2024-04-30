
export const LOGIC_VALUE_PREFIX = '';
export const ATTR_VALUE_PREFIX = 'attr$';
export const TEXT_VALUE_PREFIX = 'text$';
export const SCOPE_PARENT_KEY = '$parent';
export const SCOPE_NAME_KEY = '$name';
export const SCOPE_VALUE_KEY = '$value';

export interface Context {
  cycle: number;
  root: Scope;
}

export interface Scope {
  id: string;
  values: { [key: string]: Value | string };
  name?: string;
  isolate?: boolean;
  parent?: Scope;
  children?: Scope[];
}

export interface Value {
  fn: ValueFunction;
  refs?: RefFunction[];
}

export type ValueFunction = (this: Scope) => unknown;
export type RefFunction = (this: Scope) => Value | undefined;
