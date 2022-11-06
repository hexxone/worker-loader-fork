import parseQuery from "./parseQuery";

export default function getOptions(loaderContext) {
	const { query } = loaderContext;
	// eslint-disable-next-line no-underscore-dangle
	const webpack5Query = loaderContext._module.resourceResolveData.query || "";

	// eslint-disable-next-line no-console
	console.log("Custom getOptions query ", query, webpack5Query);

	if (typeof query === "string" && query !== "") {
		return parseQuery(query);
	}

	if (typeof webpack5Query === "string" && webpack5Query !== "") {
		return parseQuery(webpack5Query);
	}

	if (!query || typeof query !== "object") {
		// Not object-like queries are not supported.
		return {};
	}

	return query;
}
