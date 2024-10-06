import { Value } from './value';

export interface PageProps {
  root: ScopeProps[];
}

export type ScopeType = 'foreach';

export interface ScopeProps {
  dom: number;
  type?: ScopeType;
  name?: string;
  isolated?: boolean; // only present if true
  children?: ScopeProps[];
  values?: { [key: string]: ValueProps };
}

export interface ValueProps {
  exp: ValueExp;
  deps?: ValueDep[];
}

export type ValueExp = (this: unknown) => unknown;
export type ValueDep = (this: unknown) => Value;
