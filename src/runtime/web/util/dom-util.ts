
export const ELEMENT_NODE = 1;
export const ATTRIBUTE_NODE = 2;
export const TEXT_NODE = 3;
export const COMMENT_NODE = 8;
export const DOCUMENT_NODE = 9;
const LITERAL_TAGS: any = { PRE: true, SCRIPT: true };

export function normalizeDom(doc: Document) {
  doc.documentElement.normalize();
  function f(e: Element) {
    for (let n of e.childNodes) {
      if (n.nodeType === TEXT_NODE) {
        n.nodeValue = (n.nodeValue || '').replace(/\n\s+/g, '\n');
        n.nodeValue = n.nodeValue.replace(/[ ]{2,}/g, ' ');
      } else if (n.nodeType === ELEMENT_NODE) {
        if (!LITERAL_TAGS[(n as Element).tagName]) {
          f(n as Element);
        }
      }
    }
  }
  f(doc.documentElement);
}
