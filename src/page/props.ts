
export interface PageProps {
  root: ScopeProps[];
}

export interface ScopeProps {
  dom: number;
  name?: string;
  isolated?: boolean;
  children?: ScopeProps[];
  values?: { [key: string]: ValueProps };
}

export interface ValueProps {
  exp: ValueExp;
  deps?: ValueDep[];
}

export type ValueExp = (this: unknown) => unknown;
export type ValueDep = (this: unknown) => unknown;
