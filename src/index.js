import path from "path";

import { validate } from "schema-utils";

import NodeTargetPlugin from "webpack/lib/node/NodeTargetPlugin";
import SingleEntryPlugin from "webpack/lib/SingleEntryPlugin";
import WebWorkerTemplatePlugin from "webpack/lib/webworker/WebWorkerTemplatePlugin";
import ExternalsPlugin from "webpack/lib/ExternalsPlugin";

// wasm Plugins
import FetchCompileWasmPlugin from "webpack/lib/web/FetchCompileWasmPlugin";
import FetchCompileAsyncWasmPlugin from "webpack/lib/web/FetchCompileAsyncWasmPlugin";

import schema from "./options.json";

import {
	workerGenerator,
	sourceMappingURLRegex,
	sourceURLWebpackRegex,
	getExternalsType,
} from "./utils";

import getOptions from "./getOptions";

const useWebpack5 = require("webpack/package.json").version.startsWith("5.");

if (!useWebpack5) {
	throw new Error("Please upgrade to webpack 5, or use the non-forked plugin.");
}

export default function loader() {}

export function pitch(request) {
	this.cacheable(false);

	const options = getOptions(this);

	validate(schema, options, {
		name: "Worker Loader",
		baseDataPath: "options",
	});

	const workerContext = {};
	const compilerOptions = this._compiler.options || {};

	const filename = options.filename
		? options.filename
		: compilerOptions.output.filename;

	const chunkFilename = options.chunkFilename
		? options.chunkFilename
		: compilerOptions.output.chunkFilename;

	const publicPath = options.publicPath
		? options.publicPath
		: compilerOptions.output.publicPath;

	workerContext.options = {
		filename,
		chunkFilename,
		publicPath,
		globalObject: "self",
	};

	workerContext.compiler = this._compilation.createChildCompiler(
		`worker-loader ${request}`,
		workerContext.options
	);

	new WebWorkerTemplatePlugin().apply(workerContext.compiler);

	if (this.target !== "webworker" && this.target !== "web") {
		new NodeTargetPlugin().apply(workerContext.compiler);
	}

	if (FetchCompileWasmPlugin) {
		new FetchCompileWasmPlugin({
			mangleImports: compilerOptions.optimization.mangleWasmImports,
		}).apply(workerContext.compiler);
	}

	if (FetchCompileAsyncWasmPlugin) {
		new FetchCompileAsyncWasmPlugin().apply(workerContext.compiler);
	}

	if (compilerOptions.externals) {
		new ExternalsPlugin(
			getExternalsType(compilerOptions),
			compilerOptions.externals
		).apply(workerContext.compiler);
	}

	new SingleEntryPlugin(
		this.context,
		`!!${request}`,
		path.parse(this.resourcePath).name
	).apply(workerContext.compiler);

	workerContext.request = request;

	const cb = this.async();

	if (
		!(
			workerContext.compiler.cache &&
			typeof workerContext.compiler.cache.get === "function"
		)
	)
		// eslint-disable-next-line no-console
		console.error("ERROR COMPILE", workerContext.compiler);

	runAsChild(this, workerContext, options, cb);
}

export function runAsChild(loaderContext, workerContext, options, callback) {
	workerContext.compiler.runAsChild((error, entries, compilation) => {
		if (error) {
			return callback(error);
		}

		if (entries[0]) {
			const [workerFilename] = [...entries[0].files];
			const cache = workerContext.compiler.getCache("worker-loader");
			const cacheIdent = workerFilename;
			const cacheETag = cache.getLazyHashedEtag(
				compilation.assets[workerFilename]
			);

			return cache.get(cacheIdent, cacheETag, (getCacheError, content) => {
				if (getCacheError) {
					return callback(getCacheError);
				}

				if (options.inline === "no-fallback") {
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

				if (options.inline === "no-fallback") {
					// Remove `/* sourceMappingURL=url */` comment
					workerSource = workerSource.replace(sourceMappingURLRegex, "");

					// Remove `//# sourceURL=webpack-internal` comment
					workerSource = workerSource.replace(sourceURLWebpackRegex, "");
				}

				const workerCode = workerGenerator(
					loaderContext,
					workerFilename,
					workerSource,
					options
				);
				const workerCodeBuffer = Buffer.from(workerCode);

				return cache.store(
					cacheIdent,
					cacheETag,
					workerCodeBuffer,
					(storeCacheError) => {
						if (storeCacheError) {
							return callback(storeCacheError);
						}

						return callback(null, workerCodeBuffer);
					}
				);
			});
		}

		return callback(
			new Error(
				`Failed to compile web worker "${workerContext.request}" request`
			)
		);
	});
}
