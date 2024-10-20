export default (id, stats) => {
    const { modules } = stats.toJson({
        source: true
    });
    const module = modules.find((m) => m.name.endsWith(id));

    return module.source;
};
