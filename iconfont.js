import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { generateIconfont } from "./lib/index.js";

const __dirname = dirname(fileURLToPath(import.meta.url));

/**
 * CLI entry point for direct execution
 * Usage: node ./iconfont.js
 */
async function main() {
  const options = {
    input: resolve(process.cwd(), "./svg"),
    output: resolve(process.cwd(), "./dist"),
    packageRoot: __dirname,
  };

  await generateIconfont(options);
}

main().catch((error) => {
  console.error("Error during icon font generation:", error);
  process.exit(1);
});
