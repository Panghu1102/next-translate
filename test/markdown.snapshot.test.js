const test = require('node:test');
const assert = require('node:assert/strict');
const { translateProtectedMarkdown } = require('../src/markdown');

test('translateProtectedMarkdown keeps code/link/image/jsx/expressions untouched', async () => {
  const input = [
    '# Title',
    '',
    'Paragraph with `inlineCode` and [link](https://example.com).',
    '![img](https://img.com/a.png)',
    '',
    '```js',
    'console.log("hello")',
    '```',
    '',
    '<Demo prop="x">JSX Text</Demo>',
    '',
    'Value: {value}',
  ].join('\n');

  const output = await translateProtectedMarkdown(input, async (text) => `[[T]]${text}[[/T]]`);

  assert.equal(
    output,
    [
      '[[T]]# Title',
      '',
      'Paragraph with `inlineCode` and [link](https://example.com).',
      '![img](https://img.com/a.png)',
      '',
      '```js',
      'console.log("hello")',
      '```',
      '',
      '<Demo prop="x">JSX Text</Demo>',
      '',
      'Value: {value}[[/T]]',
    ].join('\n'),
  );
});
