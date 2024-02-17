/* eslint-env browser */
async function loadChunk() {
    // eslint-disable-next-line global-require
    return require(/* webpackMode: "lazy" */ './chunk');
}

onmessage = async (event) => {
    const { returnTrue } = await loadChunk();

    const workerResult = event.data;

    workerResult.onmessage = returnTrue();

    postMessage(workerResult);
};
