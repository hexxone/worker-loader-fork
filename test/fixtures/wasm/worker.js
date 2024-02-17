/* eslint-env browser */
onmessage = async (event) => {
    const workerResult = event.data;

    // eslint-disable-next-line global-require
    const wasm = await require('./add.wasm');

    workerResult.onmessage = wasm.add(10, 20);

    postMessage(workerResult);
};
