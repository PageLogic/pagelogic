import { Plugin } from './plugin';
import { Macros } from './plugins/macros';

export interface ConfigProps {
  rootPath: string;
  plugins?: Plugin[];
}

export class Config {
  rootPath: string;
  plugins: Plugin[];

  constructor(props: ConfigProps) {
    this.rootPath = props.rootPath;
    this.plugins = props.plugins?.slice() ?? [];
    this.plugins.push(new Macros());
  }
}
