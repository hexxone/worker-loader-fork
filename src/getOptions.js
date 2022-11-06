'use strict';

const parseQuery = require('./parseQuery');

function getOptions(loaderContext) {
  const query = loaderContext.query;
  const webpack5Query = loaderContext?._module?.resourceResolveData?.query ?? null;

  // console.log("Have querx", loaderContext);

  if (typeof query === 'string' && query !== '') {
    return parseQuery(query);
  }

  if (typeof webpack5Query === 'string' && webpack5Query !== '') {
    return parseQuery(webpack5Query);
  }

  if (!query || typeof query !== 'object') {
    // Not object-like queries are not supported.
    return {};
  }

  return query;
}

module.exports = getOptions;
