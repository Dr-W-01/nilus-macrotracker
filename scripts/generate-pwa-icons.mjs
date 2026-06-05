/**
 * Rasterize icon SVGs to PNGs for iOS/Android PWA install.
 * Run: node scripts/generate-pwa-icons.mjs
 */
import { readFile, writeFile, mkdir } from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import sharp from 'sharp'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const root = path.join(__dirname, '..')
const publicDir = path.join(root, 'public')
const iconsDir = path.join(publicDir, 'icons')

const STANDARD_SIZES = [72, 96, 128, 144, 152, 192, 384, 512]
const MASKABLE_SIZES = [192, 512]

async function rasterize(svgPath, size, outPath) {
  const svg = await readFile(svgPath)
  await sharp(svg, { density: Math.max(144, Math.ceil((size / 512) * 288)) })
    .resize(size, size, { fit: 'contain', background: '#000000' })
    .png()
    .toFile(outPath)
}

async function main() {
  await mkdir(iconsDir, { recursive: true })

  const source = path.join(publicDir, 'icon-source.svg')
  const maskableSource = path.join(publicDir, 'icon-maskable-source.svg')

  for (const size of STANDARD_SIZES) {
    const out = path.join(iconsDir, `icon-${size}.png`)
    await rasterize(source, size, out)
    console.log('wrote', path.relative(root, out))
  }

  for (const size of MASKABLE_SIZES) {
    const out = path.join(iconsDir, `maskable-${size}.png`)
    await rasterize(maskableSource, size, out)
    console.log('wrote', path.relative(root, out))
  }

  await rasterize(source, 180, path.join(publicDir, 'apple-touch-icon.png'))
  console.log('wrote public/apple-touch-icon.png')

  await rasterize(source, 1024, path.join(publicDir, 'icon-1024.png'))
  console.log('wrote public/icon-1024.png')

  const centeredSvg = await readFile(source, 'utf8')
  await writeFile(path.join(publicDir, 'icons.svg'), centeredSvg)
  console.log('updated public/icons.svg')
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})