#!/usr/bin/env bun
import sharp from "sharp";

export async function convertSvgToPng(inputFileUrl: URL, sizes: number[]) {
  for (const size of sizes) {
    const filename = `icon-${size}.png`;
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
