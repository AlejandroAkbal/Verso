const { withDangerousMod } = require('@expo/config-plugins');
const fs = require('fs');
const path = require('path');

const READIUM_PODSPEC_SOURCE = "source 'https://github.com/readium/podspecs'";

function patchPodfile(contents) {
  let podfile = contents;

  if (!podfile.includes('readium/podspecs')) {
    podfile = `${READIUM_PODSPEC_SOURCE}\n${podfile}`;
  }

  if (!podfile.includes('readium_pods.rb')) {
    podfile = podfile.replace(
      /^/,
      `require_relative '../node_modules/react-native-readium/scripts/readium_pods'\nrequire_relative '../scripts/readium_post_install'\n\n`,
    );
  }

  if (!/\breadium_pods\b/.test(podfile.replace(/require_relative.*readium_pods.*\n/, ''))) {
    podfile = podfile.replace(/use_expo_modules!\n/, "use_expo_modules!\n\n  readium_pods\n");
  }

  if (!podfile.includes('verso_readium_post_install(installer)')) {
    podfile = podfile.replace(
      /react_native_post_install\(\s*installer,[\s\S]*?\)\n/,
      (match) => `${match}    verso_readium_post_install(installer)\n`,
    );
  }

  return podfile;
}

function patchAndroidBuildGradle(contents) {
  let gradle = contents;

  if (!gradle.includes('coreLibraryDesugaringEnabled')) {
    gradle = gradle.replace(
      /compileOptions\s*\{/,
      `compileOptions {
        coreLibraryDesugaringEnabled true`,
    );
  }

  if (!gradle.includes('desugar_jdk_libs')) {
    gradle = gradle.replace(
      /dependencies\s*\{/,
      `dependencies {
    coreLibraryDesugaring 'com.android.tools:desugar_jdk_libs:2.1.2'`,
    );
  }

  return gradle;
}

function withReadium(config) {
  config = withDangerousMod(config, [
    'ios',
    async (cfg) => {
      const podfilePath = path.join(cfg.modRequest.platformProjectRoot, 'Podfile');
      if (fs.existsSync(podfilePath)) {
        const contents = fs.readFileSync(podfilePath, 'utf8');
        fs.writeFileSync(podfilePath, patchPodfile(contents));
      }
      return cfg;
    },
  ]);

  config = withDangerousMod(config, [
    'android',
    async (cfg) => {
      const buildGradlePath = path.join(
        cfg.modRequest.platformProjectRoot,
        'app',
        'build.gradle',
      );
      if (fs.existsSync(buildGradlePath)) {
        const contents = fs.readFileSync(buildGradlePath, 'utf8');
        fs.writeFileSync(buildGradlePath, patchAndroidBuildGradle(contents));
      }
      return cfg;
    },
  ]);

  return config;
}

module.exports = withReadium;
