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
import supportWebpack5 from "./supportWebpack5";

import { getExternalsType } from "./utils";
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

	supportWebpack5(this, workerContext, options, cb);
}
