import { Document } from '../html/dom';
import { Scope } from './scope';

export abstract class Glob extends Scope {

  constructor(doc: Document) {
    super(doc);
    this.init();
  }

  get doc(): Document {
    return this.e as Document;
  }

  abstract init(): void;
}
