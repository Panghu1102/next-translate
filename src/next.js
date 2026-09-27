const { generatePostsManifest } = require('./build');

function withPostsI18n(nextConfig = {}, pluginOptions = {}) {
  let generated = false;

  return {
    ...nextConfig,
    async webpack(config, context) {
      if (!generated && context.isServer) {
        await generatePostsManifest({
          rootDir: context.dir,
          ...pluginOptions,
        });
        generated = true;
      }

      if (typeof nextConfig.webpack === 'function') {
        return nextConfig.webpack(config, context);
      }

      return config;
    },
  };
}

module.exports = {
  withPostsI18n,
};
