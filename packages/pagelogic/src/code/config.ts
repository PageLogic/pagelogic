import { Plugin } from './plugin';
import { IncludesPlugin } from './plugins/includes';

export interface ConfigProps {
  rootPath: string;
  plugins?: Plugin[];
}

export class Config {
  rootPath: string;
  plugins: Plugin[];

  constructor(props: ConfigProps) {
    this.rootPath = props.rootPath;
    this.plugins = props.plugins ?? [];
    this.plugins.push(new IncludesPlugin());
  }
}
