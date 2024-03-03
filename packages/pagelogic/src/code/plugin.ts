import { Directive } from './loader';

export abstract class Plugin {

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  async handleDirective(directive: Directive, index: number): Promise<boolean> {
    return false;
  }

}
