const static = require('serve-static');
const { resolve, join, relative } = require('path');
const { pathExistsSync, readFileSync } = require('fs-extra');
const { resolve: resolveConfig } = require('./lib/config');

const {
  csrBuildFileName,
  ssrBuildFileName,
  csrBuildDir,
  ssrBuildDir,
} = resolveConfig();

module.exports = function init({
  templatePath,
  ssrAppPath,
  publicUrl,
  templateKeys,
}) {
  templatePath = resolve(templatePath || __dirname, 'template.html');
  ssrAppPath = relative(
    __dirname,
    ssrAppPath || join(ssrBuildDir, ssrBuildFileName)
  );
  if (!templateKeys)
    templateKeys = {
      publicUrl: /{{publicUrl}}/g,
      content: /{{content}}/g,
      csrBuildFileName: /{{csrBuildFileName}}/g,
    };

  if (!pathExistsSync(templatePath))
    throw new Error(`Cannot find HTML file with path "${templatePath}".`);
  else if (!pathExistsSync(resolve(__dirname, ssrAppPath)))
    throw new Error(`Cannot find JS file with path "${ssrAppPath}".`);

  const template = readFileSync(templatePath, 'utf-8');
  const script = require(ssrAppPath);
  const serveStatic = static(resolve(csrBuildDir));

  return {
    serveBuildDir: (req, res, next) => serveStatic(req, res, next),
    renderToString: function ({ url }) {
      return template
        .replace(templateKeys.publicUrl, publicUrl)
        .replace(templateKeys.csrBuildFileName, csrBuildFileName)
        .replace(templateKeys.content, script.render({ url }).html);
    },
  };
};
