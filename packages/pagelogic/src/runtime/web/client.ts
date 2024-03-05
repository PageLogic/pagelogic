/* eslint-disable @typescript-eslint/no-explicit-any */
import { GLOBAL_NAME, WebContext } from './context';
import { WebScopeProps } from './scope';

(window as any)[GLOBAL_NAME] = {
  init: (props: WebScopeProps) => {
    const ctx = new WebContext(window, window.document, {})
      .load(props)
      .refresh();
    (window as any)[GLOBAL_NAME] = ctx.root?.proxy;
  }
};
