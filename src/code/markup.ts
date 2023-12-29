import { Program } from "acorn";
import { JSXOpeningElement, walker } from "./walker";

export interface GetMarkupProps {
  addDocType?: boolean;
  bodyEndScriptURLs?: string[];
}

export function getMarkup(ast: Program, props?: GetMarkupProps): string {
  const sb = new Array<string>();
  props ||= {};
  props.addDocType && sb.push('<!DOCTYPE html>\n');
  walker.simple(ast, {
    // @ts-ignore
    JSXOpeningElement(node: JSXOpeningElement, _) {
      if (node.name.type === 'JSXIdentifier' ||
          node.name.type === 'JSXNamespacedName') {
        sb.push('<');
        if (node.name.type === 'JSXIdentifier') {
          sb.push(node.name.name.toString());
        } else {
          sb.push(node.name.namespace.name);
          sb.push(':');
          sb.push(node.name.name.name);
        }
        for (let attr of node.attributes) {
          if (attr.type === 'JSXAttribute' &&
              attr.value?.type === 'Literal') {
            sb.push(' ');
            sb.push(attr.name.name.toString());
            sb.push('="');
            sb.push(escape(attr.value.value as string, '"'));
            sb.push('"');
          }
        }
        sb.push(node.selfClosing ? '/>' : '>');
      }
    },
    // @ts-ignore
    JSXText(node, _) {
      sb.push(node.value);
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
  if (chars.indexOf('<') >= 0) r = r.split("<").join("&lt;");
  if (chars.indexOf('>') >= 0) r = r.split(">").join("&gt;");
  if (chars.indexOf('"') >= 0) r = r.split('"').join("&quot;");
  if (chars.indexOf("'") >= 0) r = r.split("'").join("&apos;");
  if (chars.indexOf(" ") >= 0) r = r.split(" ").join("&nbsp;");
  if (chars.indexOf("\n") >= 0) r = r.split("\n").join("&#xA;");
  if (chars.indexOf("\r") >= 0) r = r.split("\r").join("&#xD;");
  return r;
}
