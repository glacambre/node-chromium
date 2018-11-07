'use strict';

import test from 'ava';

const fs = require('fs');
const rimraf = require('rimraf');

const utils = require('../utils');
const config = require('../config');

test.before(async () => {
    // Deleting output folder
    const outPath = config.BIN_OUT_PATH;
    console.log(`Deleting output folder: [${outPath}]`);
    console.log('Creating operationSystemRevisions file');

    if (fs.existsSync(outPath)) {
        rimraf.sync(outPath);
    }

    await require('../write-revisions');
});

test('Before Install Process', t => {
    const binPath = utils.getOsChromiumBinPath();
    t.false(fs.existsSync(binPath), `Chromium binary is found in: [${binPath}]`);
});

test('Chromium Install', async t => {
    await (require('../install')).then(() => {
        const binPath = utils.getOsChromiumBinPath();
        t.true(fs.existsSync(binPath), `Chromium binary is not found in: [${binPath}]`);
    });
});
