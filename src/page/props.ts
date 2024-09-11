
export interface PageProps {
  root: ScopeProps;
}

export interface ScopeProps {
  dom: number;
  children?: ScopeProps[];
  values?: { [key: string]: ValueProps };
}

export interface ValueProps {
  exp: ValueExp;
  deps?: ValueDep[];
}

export type ValueExp = (this: unknown) => unknown;
export type ValueDep = () => unknown;
