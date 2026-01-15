import { createReadStream, createWriteStream } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import fs from "fs-extra";
import { SVGIcons2SVGFontStream } from "svgicons2svgfont";
import svg2ttf from "svg2ttf";
import ttf2woff from "ttf2woff";
import ttf2woff2 from "ttf2woff2";
import ttf2eot from "ttf2eot";
import ejs from "ejs";

const __dirname = dirname(fileURLToPath(import.meta.url));

const DIST_TTF = resolve(process.cwd(), "./dist/iconfont.ttf");
const DIST_WOFF = resolve(process.cwd(), "./dist/iconfont.woff");
const DIST_WOFF2 = resolve(process.cwd(), "./dist/iconfont.woff2");
const DIST_EOT = resolve(process.cwd(), "./dist/iconfont.eot");

async function generateIconfont() {
  const distDir = resolve(process.cwd(), "./dist");
  await fs.ensureDir(distDir);

  const svgPath = resolve(process.cwd(), "./svg/");
  const svgFiles = fs.readdirSync(svgPath, "utf-8");

  let startUnicode = 0xea01;
  const icons = [];

  for (const file of svgFiles) {
    const iconName = file.replace(/\.svg$/i, "");
    const iconStream = createReadStream(join(svgPath, file));
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

  const svgFontPath = resolve(distDir, "iconfont.svg");

  return new Promise((resolve, reject) => {
    const fontStream = new SVGIcons2SVGFontStream({
      fontName: "iconfont",
      fontHeight: 1024,
      metadata: "TOM",
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

async function generateIconTTF(svgContent) {
  const ttf = svg2ttf(svgContent, {});
  await fs.writeFile(DIST_TTF, Buffer.from(ttf.buffer));
  console.log("TTF file created successfully");
  return ttf;
}

async function generateIconWoff() {
  const ttfBuffer = await fs.readFile(DIST_TTF);
  const woff = ttf2woff(ttfBuffer);
  await fs.writeFile(DIST_WOFF, Buffer.from(woff.buffer));
  console.log("WOFF file created successfully");
}

async function generateIconWoff2() {
  const ttfBuffer = await fs.readFile(DIST_TTF);
  const woff2 = ttf2woff2(ttfBuffer);
  await fs.writeFile(DIST_WOFF2, Buffer.from(woff2.buffer));
  console.log("WOFF2 file created successfully");
}

async function generateIconEot() {
  const ttfBuffer = await fs.readFile(DIST_TTF);
  const eot = ttf2eot(ttfBuffer);
  await fs.writeFile(DIST_EOT, Buffer.from(eot.buffer));
  console.log("EOT file created successfully");
}

async function generatePage(icons) {
  const iconData = icons.map((icon) => {
    const unicodeChar = icon.stream.metadata.unicode[0];
    return {
      name: icon.iconName,
      unicode: `&#${unicodeChar.charCodeAt(0)};`,
      char: unicodeChar,
    };
  });

  const templatePath = join(__dirname, "/template/index.ejs");
  const outputPath = join(__dirname, "/dist/index.html");
  const template = await fs.readFile(templatePath, "utf-8");
  const html = ejs.render(template, { icons: iconData });
  await fs.outputFile(outputPath, html);
  console.log("HTML preview created successfully");
}

async function generateCSS(icons) {
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
`
    )
    .join("");

  const cssPath = join(__dirname, "/dist/iconfont.css");
  await fs.writeFile(cssPath, cssContent + iconRules);
  console.log("CSS file created successfully");
}

async function main() {
  try {
    console.log("Starting icon font generation...");

    const { icons, svgContent } = await generateIconfont();
    console.log(`Generated font with ${icons.length} icons`);

    await generateIconTTF(svgContent);
    await generateIconWoff();
    await generateIconWoff2();
    await generateIconEot();
    await generatePage(icons);
    await generateCSS(icons);

    console.log("Icon font generation completed!");
  } catch (error) {
    console.error("Error during icon font generation:", error);
    process.exit(1);
  }
}

main();
