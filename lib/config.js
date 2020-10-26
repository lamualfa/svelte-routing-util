const deepmerge = require('deepmerge');
const { relative, resolve, join } = require('path');
const { pathExistsSync } = require('fs-extra');

module.exports.resolve = (configFileName = 'svelte-routing.config.js') => {
  const defaultConfig = require(join('../', configFileName));

  return deepmerge(
    defaultConfig,
    pathExistsSync(resolve(configFileName))
      ? require(relative(__dirname, configFileName))
      : {}
  );
};
