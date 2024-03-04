import * as types from './types';

export abstract class Plugin {

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  async didLoad(source: types.Source) {}

}
