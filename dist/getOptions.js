"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.default = getOptions;
var _parseQuery = _interopRequireDefault(require("./parseQuery"));
function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }
function getOptions(loaderContext) {
  const {
    query
  } = loaderContext;
  // eslint-disable-next-line no-underscore-dangle
  const webpack5Query = loaderContext._module.resourceResolveData.query || '';

  // eslint-disable-next-line no-console
  console.log('Custom getOptions query ', query, webpack5Query);
  if (typeof query === 'string' && query !== '') {
    return (0, _parseQuery.default)(query);
  }
  if (typeof webpack5Query === 'string' && webpack5Query !== '') {
    return (0, _parseQuery.default)(webpack5Query);
  }
  if (!query || typeof query !== 'object') {
    // Not object-like queries are not supported.
    return {};
  }
  return query;
}
