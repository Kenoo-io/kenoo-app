const { getDefaultConfig } = require("expo/metro-config");
const path = require("node:path");

const projectRoot = __dirname;
const monorepoRoot = path.resolve(projectRoot, "../..");

const config = getDefaultConfig(projectRoot);

config.watchFolders = [monorepoRoot];
config.resolver.nodeModulesPaths = [
  path.resolve(projectRoot, "node_modules"),
  path.resolve(monorepoRoot, "node_modules"),
];

const hoistedModules = [
  "@supabase/supabase-js",
];
const localModules = [
  "react",
  "react-dom",
  "react-native",
  "react-native-web",
];
config.resolver.extraNodeModules = Object.fromEntries([
  ...hoistedModules.map((name) => [
    name,
    path.resolve(monorepoRoot, "node_modules", name),
  ]),
  ...localModules.map((name) => [
    name,
    path.resolve(projectRoot, "node_modules", name),
  ]),
]);

config.transformer.getTransformOptions = async () => ({
  transform: {
    inlineRequires: true,
  },
});

const optionalStub = path.resolve(projectRoot, "metro-stubs/empty.js");
const { resolve } = require("metro-resolver");
const defaultResolveRequest = config.resolver.resolveRequest;

function resolveFromProject(moduleName) {
  return require.resolve(moduleName, { paths: [projectRoot] });
}

config.resolver.resolveRequest = (context, moduleName, platform) => {
  if (moduleName === "@opentelemetry/api") {
    return { type: "sourceFile", filePath: optionalStub };
  }

  if (
    moduleName === "react" ||
    moduleName === "react-dom" ||
    moduleName.startsWith("react/") ||
    moduleName.startsWith("react-dom/")
  ) {
    return {
      type: "sourceFile",
      filePath: resolveFromProject(moduleName),
    };
  }

  if (defaultResolveRequest) {
    return defaultResolveRequest(context, moduleName, platform);
  }

  return resolve(context, moduleName, platform);
};

module.exports = config;
