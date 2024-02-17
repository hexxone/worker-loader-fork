/* eslint-env browser */
// import foo from 'my-custom-module';

onmessage = (event) => {
    const workerResult = event.data;

    workerResult.onmessage = true;

    postMessage(workerResult);
};
