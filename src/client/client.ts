import * as dom from '../html/dom';
import { CLIENT_DEFAULT_GLOBAL, CLIENT_PROPS_SCRIPT_GLOBAL } from '../page/consts';
import { PageProps } from '../page/props';
import { RuntimePage } from '../runtime/runtime-page';
import { ClientGlobal } from './client-global';

// @ts-expect-error get global var
const props = window[CLIENT_PROPS_SCRIPT_GLOBAL] as PageProps;
const page = new RuntimePage(
  page => new ClientGlobal(page, document as unknown as dom.Document, props)
);
// @ts-expect-error add global var
window[page.root.name ?? CLIENT_DEFAULT_GLOBAL] = page.root.obj;
