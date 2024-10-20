/* eslint-env browser */

// eslint-disable-next-line import/no-webpack-loader-syntax, import/no-unresolved
import Worker from '!../../../src?filename=test.worker.js!./my-worker-name.js';

const worker = new Worker();

let result;

worker.onmessage = (event) => {
    if (!result) {
        result = document.createElement('div');
        result.setAttribute('id', 'result');

        document.body.append(result);
    }

    result.innerText = JSON.stringify(event.data);
};

const button = document.getElementById('button');

button.addEventListener('click', () => {
    worker.postMessage({
        postMessage: true
    });
});
