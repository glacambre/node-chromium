'use strict';

const path = require('path');

module.exports = {
    BIN_OUT_PATH: path.join(__dirname, 'lib', 'chromium'),
    ARCHIVE_DOWNLOAD_ATTEMPTS_COUNT: 5,
    CHROMIUM_VERSION: '72.0.3586.2'
};
