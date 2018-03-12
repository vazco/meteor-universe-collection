/*
 * Quite hacky solution but works for now
 * Require strings must be statically analyzed, so no loops or conditional checks are possible
 * Indents on error messages are on purpose this way to look better in the console
 */

const supportedVersions = {
    simpleSchema: '1.4.2'
};

let simpleSchemaVersion;
try {
    console.log('\n\n MY CODE IS RUNNING \n\n');
    simpleSchemaVersion = require('simpl-schema/package.json').version;
} catch (e) {
    throw new Error(
        `[universe-collection] simpl-schema must be installed.
                      You can do it with command:
                      npm i -D simpl-schema@${supportedVersions.simpleSchema}
    `);
}

if (!simpleSchemaVersion.startsWith(supportedVersions.simpleSchema)) {
    throw new Error(
        `[universe-collection] Installed simpl-schema version (${simpleSchemaVersion}) is not supported at the moment.
                      You can install compatible version with:
                      npm i -D simpl-schema@${supportedVersions.simpleSchema}
    `);
}
