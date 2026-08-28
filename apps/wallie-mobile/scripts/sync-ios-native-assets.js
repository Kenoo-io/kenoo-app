#!/usr/bin/env node
/**
 * Copies app icons + splash into the generated ios/ Images.xcassets.
 * expo run:ios does NOT refresh these when only the PNG changes — this script does.
 */
const fs = require("fs");
const path = require("path");

const { syncIosAppIcons } = require("../plugins/sync-ios-app-icons");

const appRoot = path.resolve(__dirname, "..");
const iconSource = path.join(appRoot, "assets", "icon.png");
const iosRoot = path.join(appRoot, "ios");

function findXcodeProjectDir() {
  if (!fs.existsSync(iosRoot)) {
    return null;
  }

  const entries = fs.readdirSync(iosRoot, { withFileTypes: true });
  for (const entry of entries) {
    if (!entry.isDirectory() || entry.name === "Pods" || entry.name.startsWith(".")) {
      continue;
    }

    const xcassets = path.join(iosRoot, entry.name, "Images.xcassets");
    if (fs.existsSync(xcassets)) {
      return path.join(iosRoot, entry.name);
    }
  }

  return null;
}

function copyFile(source, target) {
  fs.mkdirSync(path.dirname(target), { recursive: true });
  fs.copyFileSync(source, target);
  console.log(`[sync-ios-native-assets] ${path.relative(appRoot, target)}`);
}

function main() {
  if (!fs.existsSync(iconSource)) {
    console.error("[sync-ios-native-assets] Missing assets/icon.png");
    process.exit(1);
  }

  const projectDir = findXcodeProjectDir();
  if (!projectDir) {
    console.warn(
      "[sync-ios-native-assets] No ios/ native project yet — run prebuild first.",
    );
    return;
  }

  const xcassets = path.join(projectDir, "Images.xcassets");
  const { copied } = syncIosAppIcons(
    appRoot,
    path.join(xcassets, "AppIcon.appiconset"),
  );
  for (const name of copied) {
    console.log(`[sync-ios-native-assets] AppIcon ← assets/${name}`);
  }

  const splashDir = path.join(xcassets, "SplashScreenLogo.imageset");
  for (const name of ["image.png", "image@2x.png", "image@3x.png"]) {
    const splashTarget = path.join(splashDir, name);
    if (fs.existsSync(splashDir)) {
      copyFile(iconSource, splashTarget);
    }
  }

  console.log("[sync-ios-native-assets] Done.");
}

main();
