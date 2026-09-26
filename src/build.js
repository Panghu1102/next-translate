const crypto = require('crypto');
const fs = require('fs/promises');
const path = require('path');
const matter = require('gray-matter');
const { normalizeOptions, assertProvider } = require('./config');
const { translateProtectedMarkdown } = require('./markdown');

const MARKDOWN_EXTENSIONS = new Set(['.md', '.mdx']);

async function listPostFiles(dir) {
  const entries = await fs.readdir(dir, { withFileTypes: true });
  const files = await Promise.all(entries.map(async (entry) => {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      return listPostFiles(fullPath);
    }
    if (MARKDOWN_EXTENSIONS.has(path.extname(entry.name).toLowerCase())) {
      return [fullPath];
    }
    return [];
  }));
  return files.flat();
}

function slugFromFile(postsDir, filePath) {
  return path.relative(postsDir, filePath).replace(/\\/g, '/').replace(/\.(md|mdx)$/i, '');
}

function hashFor(raw, locale) {
  return crypto.createHash('sha256').update(raw).update('\0').update(locale).digest('hex');
}

async function ensureDir(dir) {
  await fs.mkdir(dir, { recursive: true });
}

async function readJSON(filePath) {
  try {
    return JSON.parse(await fs.readFile(filePath, 'utf8'));
  } catch {
    return null;
  }
}

async function writeJSON(filePath, value) {
  await ensureDir(path.dirname(filePath));
  await fs.writeFile(filePath, JSON.stringify(value, null, 2), 'utf8');
}

async function translateFrontmatter(data, locale, options, filePath) {
  const nextData = { ...data };

  for (const field of options.frontmatterFields) {
    if (typeof nextData[field] !== 'string' || !nextData[field].trim()) {
      continue;
    }
    nextData[field] = await options.provider.translate({
      text: nextData[field],
      from: options.sourceLocale,
      to: locale,
      filePath,
      field,
    });
  }

  return nextData;
}

async function translatePost({ raw, parsed, locale, options, filePath }) {
  const translatedFrontmatter = await translateFrontmatter(parsed.data, locale, options, filePath);
  const translatedContent = await translateProtectedMarkdown(parsed.content, (text) => options.provider.translate({
    text,
    from: options.sourceLocale,
    to: locale,
    filePath,
    field: 'content',
  }));

  return {
    frontmatter: translatedFrontmatter,
    content: translatedContent,
    raw,
  };
}

async function generatePostsManifest(inputOptions = {}) {
  const options = normalizeOptions(inputOptions);
  assertProvider(options);

  const postsRoot = path.resolve(options.rootDir, options.postsDir);
  const cacheRoot = path.resolve(options.rootDir, options.cacheDir);
  const manifestPath = path.join(cacheRoot, 'manifest.json');

  const stats = {
    totalPosts: 0,
    cacheHits: 0,
    translated: 0,
    failed: 0,
  };

  const manifest = {
    meta: {
      generatedAt: new Date().toISOString(),
      sourceLocale: options.sourceLocale,
      targetLocales: options.targetLocales,
      fallbackLocale: options.fallbackLocale,
      stats,
    },
    posts: {},
  };

  const files = await listPostFiles(postsRoot);
  stats.totalPosts = files.length;

  for (const filePath of files) {
    const raw = await fs.readFile(filePath, 'utf8');
    const parsed = matter(raw);
    const slug = slugFromFile(postsRoot, filePath);
    const source = {
      frontmatter: parsed.data,
      content: parsed.content,
      raw,
    };

    manifest.posts[slug] = {
      slug,
      sourcePath: path.relative(options.rootDir, filePath).replace(/\\/g, '/'),
      locales: {
        [options.sourceLocale]: source,
      },
    };

    for (const locale of options.targetLocales) {
      const cacheKey = hashFor(raw, locale);
      const cacheFile = path.join(cacheRoot, `${cacheKey}.json`);

      if (!options.dryRun) {
        const cached = await readJSON(cacheFile);
        if (cached) {
          stats.cacheHits += 1;
          manifest.posts[slug].locales[locale] = cached;
          continue;
        }
      }

      try {
        if (options.dryRun) {
          manifest.posts[slug].locales[locale] = source;
          stats.translated += 1;
          continue;
        }

        const translated = await translatePost({ raw, parsed, locale, options, filePath });
        manifest.posts[slug].locales[locale] = translated;
        await writeJSON(cacheFile, translated);
        stats.translated += 1;
      } catch (error) {
        stats.failed += 1;
        console.error(`[next-translate] failed translating ${slug} to ${locale}:`, error.message);
        manifest.posts[slug].locales[locale] = source;
        if (options.failOnError || options.onError === 'throw') {
          throw error;
        }
      }
    }
  }

  if (!options.dryRun) {
    await writeJSON(manifestPath, manifest);
  }

  return {
    manifest,
    manifestPath,
    stats,
  };
}

module.exports = {
  MARKDOWN_EXTENSIONS,
  listPostFiles,
  slugFromFile,
  hashFor,
  generatePostsManifest,
};
