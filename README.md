# next-translate

`next-translate` 是一个面向 Next.js 博客/内容站点的 Posts 自动多语言生成插件。

## MVP 边界

- 只处理 `/posts` 目录下的 `.md/.mdx`
- 不处理 UI 文案（按钮、导航、组件内部字符串）
- 不生成 `/en/...` 多语言前缀路由
- 同一篇文章在所有语言共享同一个 URL（例如 `/blog/hello-world`）

## 安装

```bash
npm install next-translate
```

## 5 分钟接入

### 1) 配置 `next.config.js`

```js
const { withPostsI18n } = require('next-translate');

module.exports = withPostsI18n(
  {
    reactStrictMode: true,
  },
  {
    sourceLocale: 'zh',
    targetLocales: ['en', 'ja'],
    postsDir: 'posts',
    cacheDir: '.next-translate-cache',
    fallbackLocale: 'zh',
    provider: {
      async translate({ text, from, to }) {
        // 这里接入你的翻译服务（OpenAI/DeepL/其他）
        // 必须返回字符串
        return `[${to}] ${text}`;
      },
    },
  },
);
```

### 2) App Router 页面读取（同 URL）

```js
import { getAllPostSlugs, loadManifest, getLocaleFromRequest, getTranslatedPost } from 'next-translate';
import { headers, cookies } from 'next/headers';

export async function generateStaticParams() {
  const manifest = loadManifest({ cacheDir: '.next-translate-cache' });
  return getAllPostSlugs(manifest).map((slug) => ({ slug }));
}

export default async function Page({ params }) {
  const manifest = loadManifest({ cacheDir: '.next-translate-cache' });
  const locale = getLocaleFromRequest({
    headers: headers(),
    cookieLocale: cookies().get('locale')?.value,
    supportedLocales: [manifest.meta.sourceLocale, ...manifest.meta.targetLocales],
    fallbackLocale: manifest.meta.fallbackLocale,
  });

  const post = getTranslatedPost({
    slug: params.slug,
    locale,
    manifest,
    fallbackLocale: manifest.meta.fallbackLocale,
  });

  if (!post) return <div>Not found</div>;

  return (
    <article>
      <h1>{post.frontmatter.title}</h1>
      <pre>{post.content}</pre>
    </article>
  );
}
```

## API

### `withPostsI18n(nextConfig, pluginOptions)`

在 Next.js webpack 阶段自动生成翻译 manifest。

### `generatePostsManifest(options)`

手动生成翻译结果与 manifest。

### `loadManifest(options)`

读取构建产物 `manifest.json`。

### `getTranslatedPost({ slug, locale, manifest, fallbackLocale })`

按 locale 取文章；若无对应语言，自动回退。

### `getLocaleFromRequest({ headers, cookieLocale, supportedLocales, fallbackLocale })`

按 `cookie locale > Accept-Language > fallback` 解析用户语言。

## 配置项

- `sourceLocale`: 源语言（默认 `en`）
- `targetLocales`: 目标语言数组（默认 `[]`）
- `postsDir`: Post 目录（默认 `posts`）
- `cacheDir`: 翻译缓存目录（默认 `.next-translate-cache`）
- `provider`: 翻译服务适配器，需实现 `translate()`
- `fallbackLocale`: 回退语言（默认 `sourceLocale`）
- `frontmatterFields`: 需要翻译的 frontmatter 字段，默认 `title/description/excerpt`
- `dryRun`: 只模拟流程，不写 manifest/cache
- `failOnError`: 翻译失败时是否中断
- `onError`: `continue | throw`

## 构建与缓存

- 扫描 `/posts` 下 `.md/.mdx`
- 解析 frontmatter + body
- 按 `source hash + locale` 做增量缓存
- 产出统一 `manifest.json`

## Markdown / MDX 保护规则

默认不翻译这些片段：

- fenced code block
- inline code
- Markdown links/images
- `{expression}`
- MDX JSX 节点（大写组件）

## 可观测性

`generatePostsManifest` 会返回：

- `totalPosts`
- `cacheHits`
- `translated`
- `failed`

翻译失败会输出日志，可通过 `failOnError` / `onError` 控制行为。

## 从手工多目录迁移

从：

- `/posts/hello.md`
- `/posts/en/hello.md`
- `/posts/ja/hello.md`

迁移到：

- 只保留一份源文件：`/posts/hello.md`
- 其余语言由插件构建时自动生成到缓存/manifest
- 页面路径保持不变：`/blog/hello`

## 测试

```bash
npm test
```
