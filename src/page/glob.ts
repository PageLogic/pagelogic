import { Document, Element } from '../html/dom';
import { PageProps } from './props';
import { Scope } from './scope';
import { Value } from './value';

export abstract class Glob extends Scope {
  props: PageProps;

  constructor(doc: Document, props: PageProps) {
    super(-1, doc);
    this.props = props;
    this.init();
  }

  get doc(): Document {
    return this.e as Document;
  }

  abstract init(): void;
  abstract getElement(dom: number): Element;
  abstract newScope(id: number, e: Element): Scope;
  abstract newValue(): Value;
}
