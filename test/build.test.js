const fs = require('fs/promises');
const os = require('os');
const path = require('path');
const test = require('node:test');
const assert = require('node:assert/strict');
const { generatePostsManifest } = require('../src/build');

test('generatePostsManifest caches translation by source hash + locale', async () => {
  const rootDir = await fs.mkdtemp(path.join(os.tmpdir(), 'next-translate-'));
  const postsDir = path.join(rootDir, 'posts');
  await fs.mkdir(postsDir, { recursive: true });
  await fs.writeFile(path.join(postsDir, 'hello.md'), '---\ntitle: Hello\n---\n\nHi world', 'utf8');

  let callCount = 0;
  const provider = {
    async translate({ text, to }) {
      callCount += 1;
      return `[${to}] ${text}`;
    },
  };

  const first = await generatePostsManifest({
    rootDir,
    sourceLocale: 'en',
    targetLocales: ['zh'],
    provider,
  });

  const second = await generatePostsManifest({
    rootDir,
    sourceLocale: 'en',
    targetLocales: ['zh'],
    provider,
  });

  assert.equal(first.stats.cacheHits, 0);
  assert.ok(callCount > 0);
  assert.equal(second.stats.cacheHits, 1);
});
