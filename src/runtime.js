const fs = require('fs');
const path = require('path');
const { normalizeOptions } = require('./config');

function parseAcceptLanguage(headerValue, supportedLocales) {
  if (!headerValue) {
    return [];
  }

  return headerValue
    .split(',')
    .map((entry) => {
      const [lang, qValue] = entry.trim().split(';');
      const normalizedLang = lang.toLowerCase();
      const q = qValue && qValue.startsWith('q=') ? Number(qValue.slice(2)) : 1;
      return {
        lang: normalizedLang,
        q: Number.isFinite(q) ? q : 0,
      };
    })
    .sort((a, b) => b.q - a.q)
    .map((item) => item.lang)
    .filter((lang) => {
      if (supportedLocales.includes(lang)) {
        return true;
      }
      const base = lang.split('-')[0];
      return supportedLocales.includes(base);
    })
    .map((lang) => {
      if (supportedLocales.includes(lang)) {
        return lang;
      }
      return lang.split('-')[0];
    });
}

function resolveLocale({ acceptLanguage, cookieLocale, supportedLocales, fallbackLocale }) {
  if (cookieLocale && supportedLocales.includes(cookieLocale)) {
    return cookieLocale;
  }

  const rankedLocales = parseAcceptLanguage(acceptLanguage, supportedLocales);
  if (rankedLocales.length > 0) {
    return rankedLocales[0];
  }

  if (supportedLocales.includes(fallbackLocale)) {
    return fallbackLocale;
  }

  return supportedLocales[0];
}

function loadManifest(options = {}) {
  const normalized = normalizeOptions(options);
  const manifestPath = path.resolve(normalized.rootDir, normalized.cacheDir, 'manifest.json');
  if (!fs.existsSync(manifestPath)) {
    throw new Error(`next-translate: manifest not found at ${manifestPath}. Please run generatePostsManifest first.`);
  }

  return JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
}

function getTranslatedPost({ slug, locale, manifest, fallbackLocale }) {
  const post = manifest.posts[slug];
  if (!post) {
    return null;
  }

  return (
    post.locales[locale]
    || post.locales[fallbackLocale]
    || post.locales[manifest.meta.sourceLocale]
    || null
  );
}

function getAllPostSlugs(manifest) {
  return Object.keys(manifest.posts);
}

function getLocaleFromRequest({ headers, cookieLocale, supportedLocales, fallbackLocale }) {
  const acceptLanguage = headers?.get
    ? headers.get('accept-language')
    : headers?.['accept-language'];

  return resolveLocale({
    acceptLanguage,
    cookieLocale,
    supportedLocales,
    fallbackLocale,
  });
}

function loadTranslatedPostBySlug({ slug, headers, cookieLocale, options = {} }) {
  const normalized = normalizeOptions(options);
  const manifest = loadManifest(normalized);
  const locale = getLocaleFromRequest({
    headers,
    cookieLocale,
    supportedLocales: normalized.locales,
    fallbackLocale: normalized.fallbackLocale,
  });

  const post = getTranslatedPost({
    slug,
    locale,
    manifest,
    fallbackLocale: normalized.fallbackLocale,
  });

  return {
    locale,
    slug,
    post,
  };
}

module.exports = {
  parseAcceptLanguage,
  resolveLocale,
  loadManifest,
  getTranslatedPost,
  getAllPostSlugs,
  getLocaleFromRequest,
  loadTranslatedPostBySlug,
};
