import { Descriptor, boot } from './boot';

export interface Runtime {
  boot: (doc: Document, descr: Descriptor, cleanup: boolean) => void;
}

declare interface Window {
  pagelogic: Runtime;
}

(window as unknown as Window).pagelogic = {
  boot
};
