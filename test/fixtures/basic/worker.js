/* eslint-env browser */
onmessage = (event) => {
    const workerResult = event.data;

    workerResult.onmessage = true;

    postMessage(workerResult);
};
