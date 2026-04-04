const path = require('path');
const fs = require('fs');

const BUBBLEWRAP_CORE = 'C:/Users/franc/.nvm/versions/node/v22.14.0/bin/node_modules/@bubblewrap/cli/node_modules/@bubblewrap/core';
const { TwaManifest, TwaGenerator, JdkHelper, AndroidSdkTools, Config, ConsoleLog } = require(BUBBLEWRAP_CORE);

const OUTPUT_DIR = path.resolve(__dirname);
const MANIFEST_URL = 'https://essence-qc-19129.web.app/manifest.webmanifest';
const JDK_PATH = 'C:\\Users\\franc\\.bubblewrap\\jdk\\jdk-17.0.11+9';
const ANDROID_SDK_PATH = 'C:\\Users\\franc\\.bubblewrap\\android_sdk';

async function main() {
  const log = new ConsoleLog('init');
  const config = new Config(JDK_PATH, ANDROID_SDK_PATH);

  console.log('Fetching web manifest from:', MANIFEST_URL);
  const twaManifest = await TwaManifest.fromWebManifest(MANIFEST_URL);

  twaManifest.packageId = 'com.tailedcommunity.essenceqc';
  twaManifest.appVersionName = '2.0.0';
  twaManifest.appVersionCode = 1;
  twaManifest.signingKey = { path: './android.keystore', alias: 'essenceqc' };

  const validationError = twaManifest.validate();
  if (validationError) {
    console.error('Manifest validation error:', validationError);
    process.exit(1);
  }
  console.log('TWA Manifest validated successfully');
  console.log('Package:', twaManifest.packageId, '| Name:', twaManifest.name);
  console.log('Host:', twaManifest.host, '| Start:', twaManifest.startUrl);

  const twaManifestPath = path.join(OUTPUT_DIR, 'twa-manifest.json');
  await twaManifest.saveToFile(twaManifestPath);
  console.log('Saved twa-manifest.json');

  console.log('\nSetting up build tools...');
  const jdkHelper = new JdkHelper(process, config);
  // AndroidSdkTools.create expects (process, config, jdkHelper, log)
  const androidSdkTools = await AndroidSdkTools.create(process, config, jdkHelper, log);

  console.log('Installing Android SDK components...');
  await androidSdkTools.installBuildTools();

  console.log('\nGenerating TWA project...');
  const twaGenerator = new TwaGenerator();
  await twaGenerator.createTwaProject(OUTPUT_DIR, twaManifest, log);
  console.log('\nTWA project generated successfully in:', OUTPUT_DIR);
}

main().catch(err => {
  console.error('Error:', err.message || err);
  console.error(err.stack);
  process.exit(1);
});
