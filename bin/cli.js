#!/usr/bin/env node

import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { readFileSync } from "node:fs";
import { generateIconfont } from "../lib/index.js";

const __dirname = dirname(fileURLToPath(import.meta.url));

const PACKAGE_ROOT = resolve(__dirname, "..");

function parseArgs(args) {
  const options = {
    input: "./svg",
    output: "./dist",
    showHelp: false,
    showVersion: false,
  };

  for (let i = 0; i < args.length; i++) {
    const arg = args[i];

    if (arg === "-i" || arg === "--input") {
      options.input = args[++i];
    } else if (arg === "-o" || arg === "--output") {
      options.output = args[++i];
    } else if (arg === "-h" || arg === "--help") {
      options.showHelp = true;
    } else if (arg === "-v" || arg === "--version") {
      options.showVersion = true;
    }
  }

  return options;
}

function printHelp() {
  console.log(`
Usage: iconfont-generator [options]

Options:
  -i, --input    SVG input directory (default: ./svg)
  -o, --output   Output directory (default: ./dist)
  -h, --help     Display this help message
  -v, --version  Display version number

Examples:
  iconfont-generator
  iconfont-generator -i ./icons -o ./fonts
  npx iconfont-generator
`);
}

function printVersion() {
  const pkgPath = resolve(__dirname, "..", "package.json");
  const pkg = JSON.parse(readFileSync(pkgPath, "utf-8"));
  console.log(`iconfont-generator v${pkg.version}`);
}

async function main() {
  const args = process.argv.slice(2);
  const options = parseArgs(args);

  if (options.showVersion) {
    printVersion();
    process.exit(0);
  }

  if (options.showHelp) {
    printHelp();
    process.exit(0);
  }

  const inputPath = resolve(process.cwd(), options.input);
  const outputPath = resolve(process.cwd(), options.output);

  try {
    await generateIconfont({
      input: inputPath,
      output: outputPath,
      packageRoot: PACKAGE_ROOT,
    });
  } catch (error) {
    console.error("Error:", error.message);
    process.exit(1);
  }
}

main();
