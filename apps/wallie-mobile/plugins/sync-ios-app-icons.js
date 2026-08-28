const fs = require("fs");
const path = require("path");

const LIGHT_FILE = "App-Icon-1024x1024@1x.png";
const DARK_FILE = "App-Icon-dark-1024x1024@1x.png";
const TINTED_FILE = "App-Icon-tinted-1024x1024@1x.png";

function copyIfExists(source, target) {
  if (!fs.existsSync(source)) {
    return false;
  }
  fs.mkdirSync(path.dirname(target), { recursive: true });
  fs.copyFileSync(source, target);
  return true;
}

/**
 * Copies icon.png / icon-dark.png / icon-tinted.png into AppIcon.appiconset
 * and writes iOS 18 light / dark / tinted appearances. Missing optional
 * files are skipped so prebuild still works before those PNGs exist.
 */
function syncIosAppIcons(projectRoot, appIconsetDir) {
  if (!fs.existsSync(appIconsetDir)) {
    return { copied: [] };
  }

  const assets = path.join(projectRoot, "assets");
  const copied = [];
  const images = [];

  const lightSource = fs.existsSync(path.join(assets, "icon-light.png"))
    ? path.join(assets, "icon-light.png")
    : path.join(assets, "icon.png");
  if (copyIfExists(lightSource, path.join(appIconsetDir, LIGHT_FILE))) {
    copied.push(path.basename(lightSource));
    images.push({
      filename: LIGHT_FILE,
      idiom: "universal",
      platform: "ios",
      size: "1024x1024",
    });
  }

  const darkSource = path.join(assets, "icon-dark.png");
  if (copyIfExists(darkSource, path.join(appIconsetDir, DARK_FILE))) {
    copied.push("icon-dark.png");
    images.push({
      appearances: [{ appearance: "luminosity", value: "dark" }],
      filename: DARK_FILE,
      idiom: "universal",
      platform: "ios",
      size: "1024x1024",
    });
  }

  const tintedSource = path.join(assets, "icon-tinted.png");
  if (copyIfExists(tintedSource, path.join(appIconsetDir, TINTED_FILE))) {
    copied.push("icon-tinted.png");
    images.push({
      appearances: [{ appearance: "luminosity", value: "tinted" }],
      filename: TINTED_FILE,
      idiom: "universal",
      platform: "ios",
      size: "1024x1024",
    });
  }

  if (images.length > 0) {
    const contents = {
      images,
      info: { author: "xcode", version: 1 },
    };
    fs.writeFileSync(
      path.join(appIconsetDir, "Contents.json"),
      `${JSON.stringify(contents, null, 2)}\n`,
    );
  }

  return { copied };
}

module.exports = { syncIosAppIcons };
