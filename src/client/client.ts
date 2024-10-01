import * as dom from '../html/dom';
import { CLIENT_PROPS_SCRIPT_GLOBAL } from '../page/consts';
import { PageProps } from '../page/props';
import { RuntimePage } from '../runtime/runtime-page';
import { ClientGlobal } from './client-global';

// @ts-ignore
const props = window[CLIENT_PROPS_SCRIPT_GLOBAL] as PageProps;
const glob = new ClientGlobal(document as unknown as dom.Document, props);
const page = new RuntimePage(glob);
// @ts-expect-error add global var
window.pagelogic = page.root.obj;
