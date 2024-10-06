import { DIRECTIVE_TAG_PREFIX } from '../html/dom';

export const SRC_LOGIC_ATTR_PREFIX = ':';
export const SRC_SYS_ATTR_PREFIX = '::';
export const SRC_ATTR_NAME_REGEX = /^:{0,2}[a-zA-Z_][a-zA-Z0-9_$-]*$/;

export const SRC_NAME_ATTR = SRC_SYS_ATTR_PREFIX + 'name';
export const SRC_EVENT_ATTR_PREFIX = SRC_LOGIC_ATTR_PREFIX + 'on-';

export const RT_ATTR_VALUE_PREFIX = 'attr$';
export const RT_TEXT_VALUE_PREFIX = 't$';
export const RT_SYS_VALUE_PREFIX = '$';
export const RT_EVENT_VALUE_PREFIX = 'ev$';

export const RT_SCOPE_ID_KEY = '$id';
export const RT_SCOPE_NAME_KEY = '$name';
export const RT_SCOPE_DOM_KEY = '$dom';
export const RT_SCOPE_ISOLATED_KEY = '$isolated';
export const RT_SCOPE_PARENT_KEY = '$parent';
export const RT_SCOPE_CHILDREN_KEY = '$children';
export const RT_SCOPE_VALUE_KEY = '$value';

export const HTML_TEXT_MARKER1 = '-t';
export const HTML_TEXT_MARKER2 = '';

export const DOM_ID_ATTR = 'data-pl';

export const CLIENT_CODE_SRC = '../client.js';
export const CLIENT_CODE_REQ = '/.pagelogic.js';

export const CLIENT_PROPS_SCRIPT_ID = 'pl-props';
export const CLIENT_PROPS_SCRIPT_GLOBAL = '__pagelogicProps__';
export const CLIENT_CODE_SCRIPT_ID = 'pl-client';
export const CLIENT_GLOBAL = 'pagelogic';

export const SRC_FOREACH_TAG = DIRECTIVE_TAG_PREFIX + 'FOREACH';
export const SRC_FOREACH_ITEM_ATTR = SRC_LOGIC_ATTR_PREFIX + 'item';
export const RT_FOREACH_ITEM_VALUE = 'item';
