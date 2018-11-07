'use strict';

import test from 'ava';

const fs = require('fs');
const pathUtils = require('path');

const revisionsPath = pathUtils.resolve(
    __dirname, '../operationSystemRevisions.json'
);

test.before(t => {
    if (fs.existsSync(revisionsPath)) {
        fs.unlinkSync(revisionsPath);
    }

    t.pass();
});

test('write revisions', async t => {
    await (require('../write-revisions')).then(() => {
        t.true(fs.existsSync(revisionsPath), `Operation system revisions file is not exista`);
    });
});
