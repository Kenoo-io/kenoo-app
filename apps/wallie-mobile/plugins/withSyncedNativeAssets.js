const fs = require("fs");
const path = require("path");
const { withDangerousMod } = require("@expo/config-plugins");

const { syncIosAppIcons } = require("./sync-ios-app-icons");

/** Keep ios AppIcon (light/dark/tinted) + splash in sync with assets on every prebuild. */
function withSyncedNativeAssets(config) {
  return withDangerousMod(config, [
    "ios",
    async (config) => {
      const projectRoot = config.modRequest.projectRoot;
      const platformRoot = config.modRequest.platformProjectRoot;
      const projectName = config.modRequest.projectName;
      const iconSource = path.join(projectRoot, "assets", "icon.png");

      if (!fs.existsSync(iconSource)) {
        return config;
      }

      const xcassets = path.join(platformRoot, projectName, "Images.xcassets");

      syncIosAppIcons(
        projectRoot,
        path.join(xcassets, "AppIcon.appiconset"),
      );

      const splashDir = path.join(xcassets, "SplashScreenLogo.imageset");
      if (fs.existsSync(splashDir)) {
        for (const name of ["image.png", "image@2x.png", "image@3x.png"]) {
          fs.copyFileSync(iconSource, path.join(splashDir, name));
        }
      }

      return config;
    },
  ]);
}

module.exports = withSyncedNativeAssets;
