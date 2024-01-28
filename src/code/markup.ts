import { Node } from "acorn";
import { JSXOpeningElement, walker } from "./walker";

const VOID_ELEMENTS = new Set([
  'AREA', 'BASE', 'BR', 'COL', 'EMBED', 'HR', 'IMG', 'INPUT',
  'LINK', 'META', 'PARAM', 'SOURCE', 'TRACK', 'WBR',
  // obsolete
  'COMMAND', 'KEYGEN', 'MENUITEM'
]);

export interface GetMarkupProps {
  addDocType?: boolean;
  bodyEndScriptURLs?: string[];
}

export function getMarkup(root: Node, props?: GetMarkupProps): string {
  const sb = new Array<string>();
  props ||= {};
  props.addDocType && sb.push('<!DOCTYPE html>\n');
  walker.simple(root, {
    // @ts-ignore
    JSXOpeningElement(node: JSXOpeningElement, _) {
      if (node.name.type === 'JSXIdentifier' ||
          node.name.type === 'JSXNamespacedName') {
        sb.push('<');
        let tagName;
        if (node.name.type === 'JSXIdentifier') {
          // sb.push(node.name.name.toString());
          tagName = node.name.name.toString();
        } else {
          // sb.push(node.name.namespace.name);
          // sb.push(':');
          // sb.push(node.name.name.name);
          tagName = node.name.namespace.name +
              ':' + node.name.name.name;
        }
        sb.push(tagName);
        for (let attr of node.attributes) {
          if (attr.type === 'JSXAttribute' &&
              attr.value?.type === 'Literal') {
            sb.push(' ');
            sb.push(attr.name.name.toString());
            sb.push('="');
            // https://stackoverflow.com/a/9189067
            sb.push(escape(attr.value.value as string, '&<"'));
            sb.push('"');
          }
        }
        // sb.push(node.selfClosing ? '/>' : '>');
        if (node.selfClosing) {
          if (VOID_ELEMENTS.has(tagName.toUpperCase())) {
            sb.push('>');
          } else {
            sb.push('></');
            sb.push(tagName);
            sb.push('>');
          }
        } else {
          sb.push('>');
        }
      }
    },
    // @ts-ignore
    JSXText(node, _) {
      sb.push(unescape(node.value));
    },
    // @ts-ignore
    JSXClosingElement(node, _) {
      if (node.name.type === 'JSXIdentifier' ||
          node.name.type === 'JSXNamespacedName') {
        const tagName = node.name.name.toString();
        if (props?.bodyEndScriptURLs && tagName.toLowerCase() === 'body') {
          for (let url of props.bodyEndScriptURLs) {
            sb.push('<script src="');
            sb.push(url)
            sb.push('"></script>\n');
          }
        }
        sb.push('</');
        sb.push(tagName);
        sb.push('>');
      }
    },
  });
  // if (sb.length > 0 && !sb[sb.length - 1].endsWith('\n')) {
  //   sb.push('\n');
  // }
  return sb.join('');
}

function escape(text: string, chars = ""): string {
  let r = text;
  if (chars.indexOf("&") >= 0) r = r.split("&").join("&amp;");
  if (chars.indexOf('<') >= 0) r = r.split("<").join("&lt;");
  if (chars.indexOf('>') >= 0) r = r.split(">").join("&gt;");
  if (chars.indexOf('{') >= 0) r = r.split("{").join("&lbrace;");
  if (chars.indexOf('}') >= 0) r = r.split("}").join("&rbrace;");
  if (chars.indexOf('"') >= 0) r = r.split('"').join("&quot;");
  if (chars.indexOf("'") >= 0) r = r.split("'").join("&apos;");
  if (chars.indexOf(" ") >= 0) r = r.split(" ").join("&nbsp;");
  if (chars.indexOf("\n") >= 0) r = r.split("\n").join("&#xA;");
  if (chars.indexOf("\r") >= 0) r = r.split("\r").join("&#xD;");
  return r;
}

function unescape(text: string): string {
  let r = text;
  r = r.split("&lbrace;").join("{");
  r = r.split("&rbrace;").join("}");
  // if (chars.indexOf('<') >= 0) r = r.split("<").join("&lt;");
  // if (chars.indexOf('>') >= 0) r = r.split(">").join("&gt;");
  // if (chars.indexOf('{') >= 0) r = r.split("<").join("&lcub;");
  // if (chars.indexOf('}') >= 0) r = r.split(">").join("&rcub;");
  // if (chars.indexOf('"') >= 0) r = r.split('"').join("&quot;");
  // if (chars.indexOf("'") >= 0) r = r.split("'").join("&apos;");
  // if (chars.indexOf(" ") >= 0) r = r.split(" ").join("&nbsp;");
  // if (chars.indexOf("\n") >= 0) r = r.split("\n").join("&#xA;");
  // if (chars.indexOf("\r") >= 0) r = r.split("\r").join("&#xD;");
  return r;
}
