
export interface ConfigProps {
  rootPath: string;
}

export class Config {
  rootPath: string;

  constructor(props: ConfigProps) {
    this.rootPath = props.rootPath;
  }
}
