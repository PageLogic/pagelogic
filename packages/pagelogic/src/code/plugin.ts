import { Include } from './loader';

export abstract class Plugin {

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  async handleDirective(directive: Include, index: number): Promise<boolean> {
    return false;
  }

}
