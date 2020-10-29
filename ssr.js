const static = require('serve-static');
const { resolve, join, relative } = require('path');
const { pathExistsSync, readFileSync, existsSync } = require('fs-extra');
const { resolve: resolveConfig } = require('./lib/config');

const {
  csrBuildFileName,
  ssrBuildFileName,
  csrBuildDir,
  ssrBuildDir,
  css,
} = resolveConfig();

const cachesHtml = {};

function getScript(path) {
  const script = require(path);
  return script.default || script;
}

module.exports = function init({
  dev,
  templatePath,
  ssrAppPath,
  publicUrl,
  templateKeys,
  cacheHtml,
  buildTimeout,
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
  // The default of buildTimeout is 5 Minutes
  buildTimeout = buildTimeout === undefined ? 300000 : buildTimeout;

  if (!pathExistsSync(templatePath))
    throw new Error(`Cannot find HTML file with path "${templatePath}".`);
  else if (!pathExistsSync(resolve(__dirname, ssrAppPath)))
    throw new Error(`Cannot find JS file with path "${ssrAppPath}".`);

  let timeoutExceeded;
  let template;
  let script;
  const serveStatic = static(resolve(csrBuildDir));
  const styleTags = `<link rel="stylesheet" href="${publicUrl}${css.buildFileName}" />`;
  const scriptTags = `<script src="${publicUrl}${csrBuildFileName}"></script>`;

  return {
    serveBuildDir: (req, res, next) => serveStatic(req, res, next),
    renderToString: function ({ url }) {
      // Reload static assets
      if (dev === undefined || dev || !template || !script) {
        if (!existsSync(ssrAppPath)) {
          if (timeoutExceeded) {
            return res
              .status(500)
              .send(`Can't find SSR Script in "${ssrAppPath}".`);
          }

          setTimeout(() => {
            timeoutExceeded = true;
          }, buildTimeout);
          return res.send('Still building. Please refresh back later.');
        }

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
