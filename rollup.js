const svelte = require('rollup-plugin-svelte');
const { default: nodeResolve } = require('@rollup/plugin-node-resolve');
const commonjs = require('@rollup/plugin-commonjs');
const livereload = require('rollup-plugin-livereload');
const css = require('rollup-plugin-css-only');
const deepmerge = require('deepmerge');
const { terser } = require('rollup-plugin-terser');
const { join } = require('path');

const { resolve: resolveConfig } = require('./lib/config');

const {
  csrBuildFileName,
  ssrBuildFileName,
  ssrBuildDir,
  csrBuildDir,
  srcDir,
  scriptFileName,
  svelteFileName,
  css: cssOptions,
} = resolveConfig();

const isDev = Boolean(process.env.ROLLUP_WATCH);

module.exports = function resolveConfig({
  sveltePluginConfig = {},
  resolvePlugins,
  resolveBrowserPlugins,
  resolveServerPlugins,
  browserOptions,
  serverOptions,
} = {}) {
  let browserPlugins = [
    cssOptions &&
      cssOptions.useCss &&
      css({
        output: join(csrBuildDir, cssOptions.buildFileName),
      }),
    svelte({
      hydratable: true,
      css: (css) => {
        css.write(join(csrBuildDir, cssOptions.buildFileName));
      },
      ...sveltePluginConfig,
    }),
    nodeResolve({
      preferBuiltins: true,
    }),
    commonjs({
      requireReturnsDefault: 'auto',
    }),
    isDev &&
      livereload({
        watch: join(csrBuildDir, csrBuildFileName),
        delay: 200,
      }),
    !isDev && terser(),
  ];
  let serverPlugins = [
    cssOptions &&
      cssOptions.useCss &&
      css({
        output: join(csrBuildDir, cssOptions.buildFileName),
      }),
    svelte({
      generate: 'ssr',
      ...sveltePluginConfig,
    }),
    nodeResolve({
      preferBuiltins: true,
    }),
    commonjs({
      requireReturnsDefault: 'auto',
    }),
    !isDev && terser(),
  ];

  if (resolveBrowserPlugins)
    browserPlugins = resolveBrowserPlugins(resolvePlugins(browserPlugins));

  if (resolveServerPlugins)
    serverPlugins = resolveServerPlugins(resolvePlugins(serverPlugins));

  return [
    // Browser bundle
    deepmerge(
      {
        input: join(srcDir, scriptFileName),
        output: {
          sourcemap: true,
          format: 'iife',
          name: 'app',
          file: join(csrBuildDir, csrBuildFileName),
          exports: 'named',
        },
        plugins: browserPlugins,
      },
      browserOptions || {}
    ),
    // Server bundle
    deepmerge(
      {
        input: join(srcDir, svelteFileName),
        output: {
          sourcemap: false,
          format: 'cjs',
          name: 'app',
          file: join(ssrBuildDir, ssrBuildFileName),
          exports: 'named',
        },
        plugins: serverPlugins,
      },
      serverOptions || {}
    ),
  ];
};
