import path from 'path';

import del from 'del';

async function setup() {
    // eslint-disable-next-line no-undef
    await del(path.resolve(__dirname, `./test/outputs`));
}

// eslint-disable-next-line no-undef
module.exports = setup;
