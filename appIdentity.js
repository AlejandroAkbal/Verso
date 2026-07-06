/** Shared app identity — imported by app.config.ts (Node) and src/config/appIdentity.ts (app). */
/** @type {const} */
const appIdentity = {
  displayName: 'Reader',
  slug: 'opds-reader',
  scheme: 'opds-reader',
  bundleId: 'dev.akbal.opdsreader',
  androidPackage: 'dev.akbal.opdsreader',
  database: 'opds-reader.db',
  secureStorePasswordPrefix: 'opds-reader.server.password.',
  secureStoreKoreaderPasswordKey: 'opds-reader.koreader.password',
  koreaderDeviceIdStorageKey: 'opds-reader.koreader.device-id',
  backgroundDownloadTask: 'opds-reader-background-download',
  koreaderDefaultServerUrl: 'https://sync.koreader.rocks',
};

module.exports = { appIdentity };
