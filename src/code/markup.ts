import { Program } from "acorn";
import walk from 'acorn-walk';

require('acorn-jsx-walk').extend(walk.base);

// https://babeljs.io/docs/babel-traverse
export function getMarkup(ast: Program): string {
  const sb = new Array<string>();
  walk.simple(ast, {
    // @ts-ignore
    JSXOpeningElement(node, _) {
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
            sb.push(escape(attr.value.value, '"'));
            sb.push('"');
          }
        }
        sb.push(node.selfClosing ? '/>' : '>');
      }
    },
    // @ts-ignore
    JSXClosingElement(node, _) {
      if (node.name.type === 'JSXIdentifier' ||
          node.name.type === 'JSXNamespacedName') {
        sb.push('</');
        sb.push(node.name.name.toString());
        sb.push('>');
      }
    },
    // @ts-ignore
    JSXText(node, _) {
      sb.push(node.value);
    },
  });
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
