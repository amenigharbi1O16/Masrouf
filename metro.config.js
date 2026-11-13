const path = require('path');
const { getDefaultConfig } = require('expo/metro-config');

/** @type {import('expo/metro-config').MetroConfig} */
const config = getDefaultConfig(__dirname);

// 1. Autoriser Metro à résoudre et packager les fichiers .wasm et .pdf
if (!config.resolver.assetExts.includes('wasm')) {
  config.resolver.assetExts.push('wasm');
}
if (!config.resolver.assetExts.includes('pdf')) {
  config.resolver.assetExts.push('pdf');
}

// 2. Résolution explicite de secours pour @expo/log-box/LogBox
config.resolver.extraNodeModules = {
  ...config.resolver.extraNodeModules,
  '@expo/log-box/LogBox': path.resolve(__dirname, 'node_modules/@expo/log-box/build/LogBox.js'),
};

// 2. Ajouter les en-têtes Cross-Origin indispensables pour SharedArrayBuffer / wa-sqlite
config.server = config.server || {};
config.server.enhanceMiddleware = (middleware) => {
  return (req, res, next) => {
    res.setHeader('Cross-Origin-Embedder-Policy', 'credentialless');
    res.setHeader('Cross-Origin-Opener-Policy', 'same-origin');
    return middleware(req, res, next);
  };
};

module.exports = config;

