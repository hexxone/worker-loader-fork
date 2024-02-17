/* eslint-env browser */
import Worker from './TypeDetection';

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
