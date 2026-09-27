const test = require('node:test');
const assert = require('node:assert/strict');
const { parseAcceptLanguage, resolveLocale, getTranslatedPost } = require('../src/runtime');

test('parseAcceptLanguage resolves highest q locale', () => {
  const parsed = parseAcceptLanguage('ja;q=0.7, zh-CN;q=0.9, en;q=0.8', ['en', 'zh', 'ja']);
  assert.deepEqual(parsed, ['zh', 'en', 'ja']);
});

test('resolveLocale prefers cookie over header', () => {
  const locale = resolveLocale({
    cookieLocale: 'ja',
    acceptLanguage: 'zh;q=1',
    supportedLocales: ['en', 'zh', 'ja'],
    fallbackLocale: 'en',
  });

  assert.equal(locale, 'ja');
});

test('getTranslatedPost falls back when locale missing', () => {
  const manifest = {
    meta: { sourceLocale: 'en' },
    posts: {
      hello: {
        locales: {
          en: { content: 'Hello' },
          zh: { content: '你好' },
        },
      },
    },
  };

  const post = getTranslatedPost({ slug: 'hello', locale: 'ja', manifest, fallbackLocale: 'zh' });
  assert.deepEqual(post, { content: '你好' });
});
