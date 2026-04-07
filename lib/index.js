import { createReadStream, createWriteStream } from "node:fs";
import { join, resolve } from "node:path";
import fs from "fs-extra";
import { SVGIcons2SVGFontStream } from "svgicons2svgfont";
import svg2ttf from "svg2ttf";
import ttf2woff from "ttf2woff";
import ttf2woff2 from "ttf2woff2";
import ttf2eot from "ttf2eot";
import ejs from "ejs";

/**
 * Generate iconfont from SVG files
 * @param {Object} options - Configuration options
 * @param {string} options.input - SVG input directory
 * @param {string} options.output - Output directory
 * @param {string} options.packageRoot - Package root directory (for template files)
 * @returns {Promise<void>}
 */
export async function generateIconfont(options) {
  const { input, output, packageRoot } = options;

  const inputPath = resolve(input);
  const outputDir = resolve(output);

  if (!(await fs.pathExists(inputPath))) {
    throw new Error(`Input directory not found: ${inputPath}`);
  }

  await fs.ensureDir(outputDir);

  const svgFiles = fs
    .readdirSync(inputPath, "utf-8")
    .filter((file) => file.toLowerCase().endsWith(".svg"));

  if (svgFiles.length === 0) {
    throw new Error(`No SVG files found in: ${inputPath}`);
  }

  const DIST_TTF = join(outputDir, "iconfont.ttf");
  const DIST_WOFF = join(outputDir, "iconfont.woff");
  const DIST_WOFF2 = join(outputDir, "iconfont.woff2");
  const DIST_EOT = join(outputDir, "iconfont.eot");

  console.log("Starting icon font generation...");

  const { icons, svgContent } = await generateSVGFont(
    inputPath,
    outputDir,
    svgFiles,
  );
  console.log(`Generated font with ${icons.length} icons`);

  await generateIconTTF(svgContent, DIST_TTF);
  await generateIconWoff(DIST_TTF, DIST_WOFF);
  await generateIconWoff2(DIST_TTF, DIST_WOFF2);
  await generateIconEot(DIST_TTF, DIST_EOT);
  await generatePage(icons, outputDir, packageRoot);
  await generateCSS(icons, outputDir);

  console.log("Icon font generation completed!");
  console.log(`Output directory: ${outputDir}`);
}

async function generateSVGFont(inputPath, outputDir, svgFiles) {
  let startUnicode = 0xea01;
  const icons = [];

  for (const file of svgFiles) {
    const iconName = file.replace(/\.svg$/i, "");
    const iconStream = createReadStream(join(inputPath, file));
    iconStream.metadata = {
      unicode: [String.fromCharCode(startUnicode)],
      name: iconName,
    };
    icons.push({
      file,
      iconName,
      stream: iconStream,
    });
    startUnicode++;
  }

  const svgFontPath = join(outputDir, "iconfont.svg");

  return new Promise((resolve, reject) => {
    const fontStream = new SVGIcons2SVGFontStream({
      fontName: "iconfont",
      fontHeight: 1024,
      metadata: "Iconfont",
      normalize: true,
    });

    const svgWriteStream = createWriteStream(svgFontPath);

    fontStream.pipe(svgWriteStream);

    for (const icon of icons) {
      fontStream.write(icon.stream);
    }

    fontStream.on("error", (error) => {
      console.error("Error in font stream:", error);
      reject(error);
    });

    svgWriteStream.on("error", (error) => {
      console.error("Error writing SVG font:", error);
      reject(error);
    });

    svgWriteStream.on("finish", () => {
      fs.readFile(svgFontPath, "utf-8")
        .then((svgContent) => resolve({ icons, svgContent }))
        .catch(reject);
    });

    fontStream.end();
  });
}

async function generateIconTTF(svgContent, outputPath) {
  const ttf = svg2ttf(svgContent, {});
  await fs.writeFile(outputPath, Buffer.from(ttf.buffer));
  console.log("TTF file created successfully");
}

async function generateIconWoff(ttfPath, outputPath) {
  const ttfBuffer = await fs.readFile(ttfPath);
  const woff = ttf2woff(ttfBuffer);
  await fs.writeFile(outputPath, Buffer.from(woff.buffer));
  console.log("WOFF file created successfully");
}

async function generateIconWoff2(ttfPath, outputPath) {
  const ttfBuffer = await fs.readFile(ttfPath);
  const woff2 = ttf2woff2(ttfBuffer);
  await fs.writeFile(outputPath, Buffer.from(woff2.buffer));
  console.log("WOFF2 file created successfully");
}

async function generateIconEot(ttfPath, outputPath) {
  const ttfBuffer = await fs.readFile(ttfPath);
  const eot = ttf2eot(ttfBuffer);
  await fs.writeFile(outputPath, Buffer.from(eot.buffer));
  console.log("EOT file created successfully");
}

async function generatePage(icons, outputDir, packageRoot) {
  const iconData = icons.map((icon) => {
    const unicodeChar = icon.stream.metadata.unicode[0];
    return {
      name: icon.iconName,
      unicode: `&#${unicodeChar.charCodeAt(0)};`,
      char: unicodeChar,
    };
  });

  const templatePath = join(packageRoot, "template/index.ejs");
  const outputPath = join(outputDir, "index.html");
  const template = await fs.readFile(templatePath, "utf-8");
  const html = ejs.render(template, { icons: iconData });
  await fs.outputFile(outputPath, html);
  console.log("HTML preview created successfully");
}

async function generateCSS(icons, outputDir) {
  const iconData = icons.map((icon) => {
    const unicodeChar = icon.stream.metadata.unicode[0];
    const unicodeHex = unicodeChar.charCodeAt(0).toString(16);
    return {
      name: icon.iconName,
      hex: unicodeHex,
    };
  });

  const timestamp = Date.now();

  const cssContent = `@font-face {
  font-family: "iconfont";
  src: url("./iconfont.woff?v=${timestamp}") format("woff"),
       url("./iconfont.woff2?v=${timestamp}") format("woff2"),
       url("./iconfont.ttf?v=${timestamp}") format("truetype"),
       url("./iconfont.eot?v=${timestamp}") format("embedded-opentype");
  font-weight: normal;
  font-style: normal;
  font-display: block;
}

[class^="icon-"],
[class*=" icon-"] {
  font-family: "iconfont" !important;
  font-style: normal;
  font-weight: normal;
  font-variant: normal;
  text-transform: none;
  line-height: 1;
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
}

`;
  const iconRules = iconData
    .map(
      (icon) => `.icon-${icon.name}:before {
  content: "\\${icon.hex}";
}
`,
    )
    .join("");

  const cssPath = join(outputDir, "iconfont.css");
  await fs.writeFile(cssPath, cssContent + iconRules);
  console.log("CSS file created successfully");
}
