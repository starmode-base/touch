#!/usr/bin/env bun
import path from "path";
import sharp from "sharp";

export async function convertSvgToPng(inputFileUrl: URL, sizes: number[]) {
  const baseName = path.basename(
    inputFileUrl.pathname,
    path.extname(inputFileUrl.pathname),
  );

  for (const size of sizes) {
    const filename = `${baseName}-${size}.png`;
    const outputUrl = new URL(filename, inputFileUrl);

    await sharp(inputFileUrl.pathname)
      .resize(size, size)
      .png()
      .toFile(outputUrl.pathname);

    console.log(`Created ${filename}`);
  }
}

const sizes = [16, 32, 48, 64, 128, 256, 512];
await convertSvgToPng(new URL("../public/icon.svg", import.meta.url), sizes);
await convertSvgToPng(
  new URL("../public/icon-gray.svg", import.meta.url),
  sizes,
);
