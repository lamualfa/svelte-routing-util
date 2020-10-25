import svelte from 'rollup-plugin-svelte';
import resolve from 'rollup-plugin-node-resolve';
import commonjs from 'rollup-plugin-commonjs';
import livereload from 'rollup-plugin-livereload';
import css from 'rollup-plugin-css-only';
import deepmerge from 'deepmerge';
import { terser } from 'rollup-plugin-terser';
import { resolve as resolvePath, join } from 'path';
import { pathExistsSync } from 'fs-extra';

import defaultConfig from '../svelte-routing.config';

const configPath = resolvePath('svelte-routing.config.js');
const {
  ssrBuildDir,
  csrBuildDir,
  srcDir,
  scriptFileName,
  svelteFileName,
  css: cssOptions,
} = deepmerge(
  defaultConfig,
  pathExistsSync(configPath) ? import(configPath) : {}
);

const isDev = Boolean(process.env.ROLLUP_WATCH);

export default [
  // Browser bundle
  {
    input: join(srcDir, scriptFileName),
    output: {
      sourcemap: true,
      format: 'iife',
      name: 'app',
      file: join(csrBuildDir, 'csr.js'),
    },
    plugins: [
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
      }),
      resolve(),
      commonjs(),
      // App.js will be built after bundle.js, so we only need to watch that.
      // By setting a small delay the Node server has a chance to restart before reloading.
      isDev &&
        livereload({
          watch: join(csrBuildDir, 'csr.js'),
          delay: 200,
        }),
      !isDev && terser(),
    ],
  },
  // Server bundle
  {
    input: join(srcDir, svelteFileName),
    output: {
      sourcemap: false,
      format: 'cjs',
      name: 'app',
      file: join(ssrBuildDir, 'ssr.js'),
    },
    plugins: [
      css({
        output: join(csrBuildDir, cssOptions.buildFileName),
      }),
      svelte({
        generate: 'ssr',
      }),
      resolve({
        preferBuiltins: true,
      }),
      commonjs(),
      !isDev && terser(),
    ],
  },
];
