"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.default = loader;
exports.pitch = pitch;
exports.runAsChild = runAsChild;
var _path = _interopRequireDefault(require("path"));
var _schemaUtils = require("schema-utils");
var _NodeTargetPlugin = _interopRequireDefault(require("webpack/lib/node/NodeTargetPlugin"));
var _SingleEntryPlugin = _interopRequireDefault(require("webpack/lib/SingleEntryPlugin"));
var _WebWorkerTemplatePlugin = _interopRequireDefault(require("webpack/lib/webworker/WebWorkerTemplatePlugin"));
var _ExternalsPlugin = _interopRequireDefault(require("webpack/lib/ExternalsPlugin"));
var _FetchCompileWasmPlugin = _interopRequireDefault(require("webpack/lib/web/FetchCompileWasmPlugin"));
var _FetchCompileAsyncWasmPlugin = _interopRequireDefault(require("webpack/lib/web/FetchCompileAsyncWasmPlugin"));
var _options = _interopRequireDefault(require("./options.json"));
var _utils = require("./utils");
var _getOptions = _interopRequireDefault(require("./getOptions"));
function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }
// wasm Plugins

const useWebpack5 = require('webpack/package.json').version.startsWith('5.');
if (!useWebpack5) {
  throw new Error('Please upgrade to webpack 5, or use the non-forked plugin.');
}
function loader(compilation) {
  if (compilation) {
    console.info('Started worker-loader with compilation.');
  } else {
    console.warn('Started worker-loader WITHOUT compilation!');
  }
}
function pitch(request) {
  this.cacheable(false);
  const options = (0, _getOptions.default)(this);
  (0, _schemaUtils.validate)(_options.default, options, {
    name: 'Worker Loader',
    baseDataPath: 'options'
  });
  const workerContext = {};
  const compilerOptions = this._compiler.options || {};
  const filename = options.filename ? options.filename : compilerOptions.output.filename;
  const chunkFilename = options.chunkFilename ? options.chunkFilename : compilerOptions.output.chunkFilename;
  const publicPath = options.publicPath ? options.publicPath : compilerOptions.output.publicPath;
  workerContext.options = {
    filename,
    chunkFilename,
    publicPath,
    globalObject: 'self'
  };
  workerContext.compiler = this._compilation.createChildCompiler(`worker-loader ${request}`, workerContext.options);
  new _WebWorkerTemplatePlugin.default().apply(workerContext.compiler);
  if (this.target !== 'webworker' && this.target !== 'web') {
    new _NodeTargetPlugin.default().apply(workerContext.compiler);
  }
  if (_FetchCompileWasmPlugin.default) {
    new _FetchCompileWasmPlugin.default({
      mangleImports: compilerOptions.optimization.mangleWasmImports
    }).apply(workerContext.compiler);
  }
  if (_FetchCompileAsyncWasmPlugin.default) {
    new _FetchCompileAsyncWasmPlugin.default().apply(workerContext.compiler);
  }
  if (compilerOptions.externals) {
    new _ExternalsPlugin.default((0, _utils.getExternalsType)(compilerOptions), compilerOptions.externals).apply(workerContext.compiler);
  }
  new _SingleEntryPlugin.default(this.context, `!!${request}`, _path.default.parse(this.resourcePath).name).apply(workerContext.compiler);
  workerContext.request = request;
  const cb = this.async();
  if (!(workerContext.compiler.cache && typeof workerContext.compiler.cache.get === 'function'))
    // eslint-disable-next-line no-console
    {
      console.error('ERROR COMPILE', workerContext.compiler);
    }
  runAsChild(this, workerContext, options, cb);
}
function runAsChild(loaderContext, workerContext, options, callback) {
  workerContext.compiler.runAsChild((error, entries, compilation) => {
    if (error) {
      return callback(error);
    }
    if (entries[0]) {
      const [workerFilename] = [...entries[0].files];
      const cache = workerContext.compiler.getCache('worker-loader');
      const cacheIdent = workerFilename;
      const cacheETag = cache.getLazyHashedEtag(compilation.assets[workerFilename]);
      return cache.get(cacheIdent, cacheETag, (getCacheError, content) => {
        if (getCacheError) {
          return callback(getCacheError);
        }
        if (options.inline === 'no-fallback') {
          // eslint-disable-next-line no-underscore-dangle, no-param-reassign
          delete loaderContext._compilation.assets[workerFilename];

          // TODO improve this, we should store generated source maps files for file in `assetInfo`
          // eslint-disable-next-line no-underscore-dangle
          if (loaderContext._compilation.assets[`${workerFilename}.map`]) {
            // eslint-disable-next-line no-underscore-dangle, no-param-reassign
            delete loaderContext._compilation.assets[`${workerFilename}.map`];
          }
        }
        if (content) {
          return callback(null, content);
        }
        let workerSource = compilation.assets[workerFilename].source();
        if (options.inline === 'no-fallback') {
          // Remove `/* sourceMappingURL=url */` comment
          workerSource = workerSource.replace(_utils.sourceMappingURLRegex, '');

          // Remove `//# sourceURL=webpack-internal` comment
          workerSource = workerSource.replace(_utils.sourceURLWebpackRegex, '');
        }
        const workerCode = (0, _utils.workerGenerator)(loaderContext, workerFilename, workerSource, options);
        const workerCodeBuffer = Buffer.from(workerCode);
        return cache.store(cacheIdent, cacheETag, workerCodeBuffer, storeCacheError => {
          if (storeCacheError) {
            return callback(storeCacheError);
          }
          return callback(null, workerCodeBuffer);
        });
      });
    }
    return callback(new Error(`Failed to compile web worker "${workerContext.request}" request`));
  });
}