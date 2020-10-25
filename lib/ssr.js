const { resolve } = require('path');
const { pathExistsSync, readFileSync } = require('fs-extra');

module.export = function configure({
  templatePath,
  ssrScriptPath,
  publicUrl,
  templateKeys = {
    publicUrl: /{{publicUrl}}/g,
    content: /{{content}}/g,
  },
}) {
  templatePath = resolve(templatePath);
  ssrScriptPath = resolve(ssrScriptPath);

  if (!pathExistsSync(templatePath))
    throw new Error(`Cannot find HTML file with path "${templatePath}".`);
  else if (!pathExistsSync(ssrScriptPath))
    throw new Error(`Cannot find JS file with path "${ssrScriptPath}".`);

  const template = readFileSync(templatePath);
  const script = require(ssrScriptPath);

  return {
    renderToString: function ({ url }) {
      return template
        .replace(templateKeys.publicUrl, publicUrl)
        .replace(templateKeys.content, script.render({ url }).html);
    },
  };
};
