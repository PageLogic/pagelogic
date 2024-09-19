import { Document } from '../html/dom';
import { PageProps } from './props';
import { Scope } from './scope';

export abstract class Glob extends Scope {
  props?: PageProps;

  constructor(doc: Document, props?: PageProps) {
    super(-1, doc);
    this.props = props;
    this.init();
  }

  get doc(): Document {
    return this.e as Document;
  }

  abstract init(): void;
}
