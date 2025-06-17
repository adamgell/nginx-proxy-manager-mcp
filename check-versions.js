#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

console.log('=== NGINX-PROXY-MANAGER-MCP VERSION CHECK ===\n');

// Get package.json info
const packageJson = JSON.parse(fs.readFileSync('package.json', 'utf-8'));
console.log(`Package: ${packageJson.name}@${packageJson.version}`);
console.log(`Node: ${process.version}`);
console.log(`NPM: ${process.env.npm_version || 'Run with npm to see version'}`);
console.log(`Platform: ${process.platform} ${process.arch}`);
console.log(`Date: ${new Date().toISOString()}\n`);

console.log('=== DIRECT DEPENDENCIES ===');
const deps = packageJson.dependencies;
for (const [name, version] in Object.entries(deps)) {
  // Get actual installed version
  try {
    const installedPath = path.join('node_modules', name, 'package.json');
    const installedPkg = JSON.parse(fs.readFileSync(installedPath, 'utf-8'));
    console.log(`${name}:`);
    console.log(`  Specified: ${version}`);
    console.log(`  Installed: ${installedPkg.version}`);
  } catch (e) {
    console.log(`${name}: ${version} (not found)`);
  }
}

console.log('\n=== KEY DEPENDENCY DETAILS ===');

// Check axios specifically
try {
  const axiosPath = path.join('node_modules', 'axios', 'package.json');
  const axiosPkg = JSON.parse(fs.readFileSync(axiosPath, 'utf-8'));
  console.log(`\nAxios ${axiosPkg.version}:`);
  console.log(`  Description: ${axiosPkg.description}`);
  console.log(`  Main: ${axiosPkg.main}`);
  
  // Check axios dependencies
  if (axiosPkg.dependencies) {
    console.log('  Dependencies:');
    for (const [dep, ver] of Object.entries(axiosPkg.dependencies)) {
      console.log(`    - ${dep}: ${ver}`);
    }
  }
} catch (e) {
  console.log('Axios details not available');
}

// Create a simple report for comparison
console.log('\n=== SIMPLE VERSION REPORT (for easy comparison) ===');
console.log(`node: ${process.version}`);
const installed = {};
for (const name of Object.keys(deps)) {
  try {
    const installedPath = path.join('node_modules', name, 'package.json');
    const installedPkg = JSON.parse(fs.readFileSync(installedPath, 'utf-8'));
    installed[name] = installedPkg.version;
  } catch (e) {
    installed[name] = 'not found';
  }
}
console.log(JSON.stringify(installed, null, 2));

console.log('\n=== INSTRUCTIONS FOR TESTING MACHINE ===');
console.log('1. Run this same script on your testing machine:');
console.log('   node check-versions.js');
console.log('2. Compare the "SIMPLE VERSION REPORT" sections');
console.log('3. Pay special attention to axios version differences');