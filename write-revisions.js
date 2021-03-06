'use strict';

const fs = require('fs');
const pathUtils = require('path');
const got = require('got');

const packageJson = require('./package.json');
const config = require('./config');
const utils = require('./utils');

const operationSystems = [
    {platform: 'linux', architecture: 'x64'},
    {platform: 'win32', architecture: 'x32'},
    {platform: 'win32', architecture: 'x64'},
    {platform: 'darwin'}
];
const revisionSearchUrl = 'https://omahaproxy.appspot.com/deps.json';
const operationSystemRevisionsPath = pathUtils.join(
    __dirname, 'operationSystemRevisions.json'
);

// Parses chromium version from package version, e.g.:
// 72.0.3586-2 -> 72.0.3586.2
// 72.0.3586-2-2 -> 72.0.3586.2
function parseChromiumVersion(packageVersion) {
    return packageVersion.split(/\.|-/, 4).join('.');
}

function checkArchiveExists(url) {
    return new Promise((resolve, reject) => {
        got.stream(url)
            .on('response', () => resolve(true))
            .on('error', error => {
                if (error.statusCode === 404) {
                    resolve(false);
                } else {
                    reject(error);
                }
            });
    });
}

function getBaseRevision(version) {
    return new Promise((resolve, reject) => {
        got(
            revisionSearchUrl,
            {
                query: {
                    version
                },
                json: true
            }
        )
        .then(response => {
            const baseRevision = response.body.chromium_base_position;
            console.log(`Base revision: ${baseRevision}`);
            resolve(baseRevision);
        })
        .catch(err => {
            console.log('An error occured while trying to get base revision by chromium version', err);
            reject(err);
        });
    });
}

function detectOperationSystemRevision(params) {
    const operationSystem = params.operationSystem;
    const platform = operationSystem.platform;
    const architecture = operationSystem.architecture;
    const revision = params.revision;
    const attemptNumber = params.attemptNumber;

    const logPrefix = `${platform} ${architecture || ''}`;

    console.log(`[${logPrefix}] Detect revision, attempt #${attemptNumber}`);

    return new Promise((resolve, reject) => {
        const urls = utils.getOsCdnUrls({
            revision,
            platform: operationSystem.platform,
            architecture: operationSystem.architecture
        });

        Promise.all(
            urls.map(url => checkArchiveExists(url))
        ).then(checkArchiveExistsResults => {
            const archiveExists = checkArchiveExistsResults.some(result => result);

            if (archiveExists) {
                console.log(`[${logPrefix}] found archive for revision #${revision}`);
                resolve(revision);
            } else if (attemptNumber < config.ARCHIVE_DOWNLOAD_ATTEMPTS_COUNT) {
                console.log(`[${logPrefix}] archive not found, will try again`);
                detectOperationSystemRevision({
                    operationSystem,
                    revision: Number(revision) - 1,
                    attemptNumber: attemptNumber + 1
                })
                .then(resolve)
                .catch(reject);
            } else {
                throw new Error(`[${logPrefix}] archive cannot be found`);
            }
        })
        .catch(err => reject(err));
    });
}

function getOperationSystemRevisions(baseRevision) {
    return new Promise((resolve, reject) => {
        Promise.all(
            operationSystems.map(operationSystem => {
                return detectOperationSystemRevision({
                    operationSystem,
                    revision: baseRevision,
                    attemptNumber: 0
                });
            })
        ).then(revisions => {
            const operationSystemRevisions = operationSystems.map(
                (operationSystem, index) => {
                    return {
                        platform: operationSystem.platform,
                        architecture: operationSystem.architecture,
                        revision: String(revisions[index])
                    };
                }
            );

            resolve(operationSystemRevisions);
        })
        .catch(err => reject(err));
    });
}

function writeOperationSystemRevisions(operationSystemRevisions) {
    return new Promise((resolve, reject) => {
        fs.writeFile(
            operationSystemRevisionsPath,
            JSON.stringify(operationSystemRevisions, null, 4),
            error => {
                if (error) {
                    reject(error);
                } else {
                    resolve();
                }
            }
        );
    });
}

module.exports = Promise.resolve(parseChromiumVersion(packageJson.version))
    .then(chromiumVersion => getBaseRevision(chromiumVersion))
    .then(baseRevision => getOperationSystemRevisions(baseRevision))
    .then(operationSystemRevisions => {
        return writeOperationSystemRevisions(operationSystemRevisions);
    })
    .then(() => console.log(`Revisions for operation systems wrote to ${operationSystemRevisionsPath}`))
    .catch(err => console.log(err.stack));
