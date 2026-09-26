const path = require('path');

function normalizeOptions(options = {}) {
  const sourceLocale = options.sourceLocale || 'en';
  const targetLocales = Array.isArray(options.targetLocales) ? options.targetLocales.filter(Boolean) : [];
  const locales = Array.from(new Set([sourceLocale, ...targetLocales]));

  return {
    sourceLocale,
    targetLocales,
    locales,
    postsDir: options.postsDir || 'posts',
    cacheDir: options.cacheDir || '.next-translate-cache',
    fallbackLocale: options.fallbackLocale || sourceLocale,
    rootDir: options.rootDir ? path.resolve(options.rootDir) : process.cwd(),
    provider: options.provider,
    dryRun: Boolean(options.dryRun),
    failOnError: Boolean(options.failOnError),
    onError: options.onError === 'throw' ? 'throw' : 'continue',
    frontmatterFields: Array.isArray(options.frontmatterFields) && options.frontmatterFields.length
      ? options.frontmatterFields
      : ['title', 'description', 'excerpt'],
  };
}

function assertProvider(options) {
  if (options.targetLocales.length && !options.provider) {
    throw new Error('next-translate: provider is required when targetLocales is not empty.');
  }
  if (options.provider && typeof options.provider.translate !== 'function') {
    throw new Error('next-translate: provider.translate must be a function.');
  }
}

module.exports = {
  normalizeOptions,
  assertProvider,
};
