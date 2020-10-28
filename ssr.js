const static = require('serve-static');
const { resolve, join, relative } = require('path');
const { pathExistsSync, readFileSync } = require('fs-extra');
const { resolve: resolveConfig } = require('./lib/config');

const {
  csrBuildFileName,
  ssrBuildFileName,
  csrBuildDir,
  ssrBuildDir,
  css,
} = resolveConfig();

const isProduction = process.env.NODE_ENV === 'production';

const cachesHtml = {};

function getScript(path) {
  const script = require(path);
  return script.default || script;
}

module.exports = function init({
  templatePath,
  ssrAppPath,
  publicUrl,
  templateKeys,
  cacheHtml,
} = {}) {
  templatePath = resolve(templatePath || join(__dirname, 'template.html'));
  ssrAppPath = relative(
    __dirname,
    ssrAppPath || join(ssrBuildDir, ssrBuildFileName)
  );
  publicUrl = publicUrl || '/';
  templateKeys = templateKeys || {
    styles: /{{styles}}/g,
    publicUrl: /{{publicUrl}}/g,
    content: /{{content}}/g,
    scripts: /{{scripts}}/g,
  };
  cacheHtml = cacheHtml === undefined ? true : cacheHtml;

  if (!pathExistsSync(templatePath))
    throw new Error(`Cannot find HTML file with path "${templatePath}".`);
  else if (!pathExistsSync(resolve(__dirname, ssrAppPath)))
    throw new Error(`Cannot find JS file with path "${ssrAppPath}".`);

  let template = readFileSync(templatePath, 'utf-8');
  let script = getScript(ssrAppPath);
  const serveStatic = static(resolve(csrBuildDir));
  const styleTags = `<link rel="stylesheet" href="${publicUrl}${css.buildFileName}" />`;
  const scriptTags = `<script src="${publicUrl}${csrBuildFileName}"></script>`;

  return {
    serveBuildDir: (req, res, next) => serveStatic(req, res, next),
    renderToString: function ({ url }) {
      // Reload static assets
      if (!isProduction) {
        template = readFileSync(templatePath, 'utf-8');
        script = getScript(ssrAppPath);
      }

      let html = cachesHtml[url];
      if (!cacheHtml || !html) {
        html = template
          .replace(templateKeys.publicUrl, publicUrl)
          .replace(templateKeys.styles, styleTags)
          .replace(templateKeys.scripts, scriptTags)
          .replace(templateKeys.content, script.render({ url }).html);

        if (cacheHtml) cachesHtml[url] = html;
      }

      return html;
    },
  };
};
