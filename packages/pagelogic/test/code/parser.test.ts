import { assert } from 'chai';
import fs from 'fs';
import path from 'path';
import { HtmlAttribute, HtmlElement, normalizeText } from '../../src/code/html';
import { parse, Source } from '../../src/code/parser';
import { Expression } from 'acorn';

const rootPath = path.join(__dirname, 'parser');

describe('code: parser', () => {
  fs.readdirSync(rootPath).forEach(file => {
    const filePath = path.join(rootPath, file);
    if (
      fs.statSync(filePath).isFile() &&
      file.endsWith('-in.html')
    ) {

      it(file, async () => {
        const text = await fs.promises.readFile(filePath);
        const source = parse(text.toString(), file);
        if (source.errors.length) {
          const fname = file.replace('-in.html', '-err.json');
          const pname = path.join(rootPath, fname);
          const aerrs = source.errors.map(e => e.msg);
          let eerrs = [];
          try {
            const etext = (await fs.promises.readFile(pname)).toString();
            eerrs = JSON.parse(etext);
            assert.deepEqual(aerrs, eerrs);
          } catch (e) {
            assert.deepEqual(aerrs, eerrs);
          }
        } else {
          const actualHTML = source.toString() + '\n';
          const pname = path.join(rootPath, file.replace('-in.', '-out.'));
          const expectedHTML = await fs.promises.readFile(pname, { encoding: 'utf8' });
          assert.equal(normalizeText(actualHTML), normalizeText(expectedHTML));
        }
      });

    }
  });

  it('linestarts (1)', () => {
    const s = new Source('');
    assert.deepEqual(s.linestarts, [0]);
  });

  it('linestarts (2)', () => {
    const s = new Source('foo\nbar');
    assert.deepEqual(s.linestarts, [0, 4]);
  });

  it('linestarts (3)', () => {
    const s = new Source('foo\nbar\n');
    assert.deepEqual(s.linestarts, [0, 4]);
  });

  it('linestarts (4)', () => {
    const s = new Source('foo\n\nbar\n');
    assert.deepEqual(s.linestarts, [0, 4, 5]);
  });

  it('pos() (1)', () => {
    const s = new Source('');
    assert.equal(s.lineCount, 1);
    assert.deepEqual(s.pos(0), { line: 1, column: 0 });
    assert.deepEqual(s.pos(1), { line: 1, column: 1 });
    assert.deepEqual(s.pos(100), { line: 1, column: 100 });
  });

  it('pos() (2)', () => {
    const s = new Source('foo\nbar');
    assert.equal(s.lineCount, 2);
    assert.deepEqual(s.pos(0), { line: 1, column: 0 });
    assert.deepEqual(s.pos(1), { line: 1, column: 1 });
    assert.deepEqual(s.pos(2), { line: 1, column: 2 });
    assert.deepEqual(s.pos(3), { line: 1, column: 3 });
    assert.deepEqual(s.pos(4), { line: 2, column: 0 });
    assert.deepEqual(s.pos(5), { line: 2, column: 1 });
    assert.deepEqual(s.pos(6), { line: 2, column: 2 });
    assert.deepEqual(s.pos(7), { line: 2, column: 3 });
    assert.deepEqual(s.pos(8), { line: 2, column: 4 });
  });

  it('pos() (3)', () => {
    const s = new Source('foo\nbar\n');
    assert.equal(s.lineCount, 2);
    assert.deepEqual(s.pos(0), { line: 1, column: 0 });
    assert.deepEqual(s.pos(1), { line: 1, column: 1 });
    assert.deepEqual(s.pos(2), { line: 1, column: 2 });
    assert.deepEqual(s.pos(3), { line: 1, column: 3 });
    assert.deepEqual(s.pos(4), { line: 2, column: 0 });
    assert.deepEqual(s.pos(5), { line: 2, column: 1 });
    assert.deepEqual(s.pos(6), { line: 2, column: 2 });
    assert.deepEqual(s.pos(7), { line: 2, column: 3 });
    assert.deepEqual(s.pos(8), { line: 2, column: 4 });
  });

  it('pos() (4)', () => {
    const s = new Source('foo\n\nbar\n');
    assert.equal(s.lineCount, 3);
    assert.deepEqual(s.pos(0), { line: 1, column: 0 });
    assert.deepEqual(s.pos(1), { line: 1, column: 1 });
    assert.deepEqual(s.pos(2), { line: 1, column: 2 });
    assert.deepEqual(s.pos(3), { line: 1, column: 3 });
    assert.deepEqual(s.pos(4), { line: 2, column: 0 });
    assert.deepEqual(s.pos(5), { line: 3, column: 0 });
    assert.deepEqual(s.pos(6), { line: 3, column: 1 });
    assert.deepEqual(s.pos(7), { line: 3, column: 2 });
    assert.deepEqual(s.pos(8), { line: 3, column: 3 });
    assert.deepEqual(s.pos(9), { line: 3, column: 4 });
    assert.deepEqual(s.pos(10), { line: 3, column: 5 });
  });

  it('loc() (1)', () => {
    const s = new Source(
      /*  0..25 */ '<html :title=${"sample"}>\n' +
      /* 26..41 */ '  <head></head>\n' +
      /* 42..50 */ '  <body>\n' +
      /* 51..63 */ '    ${title}\n' +
      /* 64..73 */ '  </body>\n' +
      /* 74..81 */ '</html>\n',
      'inline'
    );
    assert.deepEqual(s.pos(0), { line: 1, column: 0 });
    assert.deepEqual(s.pos(25), { line: 1, column: 25 });
    assert.deepEqual(s.pos(26), { line: 2, column: 0 });
    const doc = parse(s.s, 'inline');

    const root = doc.documentElement!;
    assert.equal(root.name, 'HTML');
    assert.deepEqual(root.loc, {
      source: 'inline',
      start: { line: 1, column: 0 },
      end: { line: 6, column: 7 },
    });

    const a1 = root.attributes[0] as HtmlAttribute;
    assert.equal(a1.name, ':title');
    assert.deepEqual(a1.loc, {
      source: 'inline',
      start: { line: 1, column: 6 },
      end: { line: 1, column: 24 },
    });
    assert.deepEqual(a1.valueLoc, {
      source: 'inline',
      start: { line: 1, column: 13 },
      end: { line: 1, column: 24 },
    });
    // const exp1 = a1.value as Expression;
    // assert.deepEqual(exp1.loc, {
    //   source: 'inline',
    //   start: { line: 1, column: 15 },
    //   end: { line: 1, column: 23 },
    // });

    const t1 = root.children[0]!;
    assert.equal(t1.type, 'text');
    assert.deepEqual(t1.loc, {
      source: 'inline',
      start: { line: 1, column: 25 },
      end: { line: 2, column: 2 },
    });

    const head: HtmlElement = root.children[1] as HtmlElement;
    assert.equal(head.name, 'HEAD');
    assert.deepEqual(head.loc, {
      source: 'inline',
      start: { line: 2, column: 2 },
      end: { line: 2, column: 15 },
    });

    //...
  });
});
