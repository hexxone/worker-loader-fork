/* eslint-env browser */
const fs = require('fs');

fs.readdir("./", (err, files) => {
    if(err) {
        postMessage(err);
    } else {
        postMessage(files);
    }
});
