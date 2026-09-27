const { generatePostsManifest } = require('./build');
const { withPostsI18n } = require('./next');
const {
  parseAcceptLanguage,
  resolveLocale,
  loadManifest,
  getTranslatedPost,
  getAllPostSlugs,
  getLocaleFromRequest,
  loadTranslatedPostBySlug,
} = require('./runtime');
const { translateProtectedMarkdown } = require('./markdown');

module.exports = {
  generatePostsManifest,
  withPostsI18n,
  parseAcceptLanguage,
  resolveLocale,
  loadManifest,
  getTranslatedPost,
  getAllPostSlugs,
  getLocaleFromRequest,
  loadTranslatedPostBySlug,
  translateProtectedMarkdown,
};
