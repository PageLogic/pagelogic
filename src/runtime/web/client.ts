import { WebContext } from "./context";
import { WebScope, WebScopeProps } from "./scope";

(window as any).pagelogic = {
  init: function(props: WebScopeProps) {
    new WebContext(window, window.document, {})
      .load(props)
      .refresh();
  }
}
