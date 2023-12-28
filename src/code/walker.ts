import walk from 'acorn-walk';
require('acorn-jsx-walk').extend(walk.base);
export const walker = walk;
