
import { readFile } from "node:fs/promises"

const ADOBE_TRANSFORM = { 0: "none (CMYK/RGB thẳng)", 1: "YCbCr", 2: "YCCK" }

function parseJpeg(buf) {
  const out = { markers: [], icc: null, adobe: null, sof: null, exif: false }

  if (buf[0] !== 0xff || buf[1] !== 0xd8) {
    out.error = "Không phải JPEG (có thể là PNG/WebP/HEIC)"
    return out
  }

  let i = 2
  const iccChunks = []

  while (i < buf.length - 1) {
    if (buf[i] !== 0xff) { i++; continue }
    const marker = buf[i + 1]
    if (marker === 0xd8 || marker === 0x01 || (marker >= 0xd0 && marker <= 0xd7)) { i += 2; continue }
    if (marker === 0xda || marker === 0xd9) break // bắt đầu scan data

    const len = buf.readUInt16BE(i + 2)
    const seg = buf.subarray(i + 4, i + 2 + len)

    if (marker === 0xe1 && seg.subarray(0, 4).toString("ascii") === "Exif") out.exif = true

    if (marker === 0xe2 && seg.subarray(0, 11).toString("ascii") === "ICC_PROFILE") {
      iccChunks.push(seg.subarray(14))
    }

    if (marker === 0xee && seg.subarray(0, 5).toString("ascii") === "Adobe") {
      out.adobe = seg[seg.length - 1]
    }

    // SOF0/1/2/3/5..7/9..11/13..15 — trừ DHT(c4)/JPG(c8)/DAC(cc)
    if (marker >= 0xc0 && marker <= 0xcf && ![0xc4, 0xc8, 0xcc].includes(marker)) {
      out.sof = {
        progressive: marker === 0xc2 || marker === 0xc6 || marker === 0xca,
        height: seg.readUInt16BE(1),
        width: seg.readUInt16BE(3),
        components: seg[5],
      }
    }

    i += 2 + len
  }

  if (iccChunks.length) {
    const icc = Buffer.concat(iccChunks)
    out.icc = { size: icc.length, space: icc.subarray(16, 20).toString("ascii").trim(), desc: iccDesc(icc) }
  }

  return out
}

// Đọc tag 'desc' trong ICC profile để lấy tên profile (vd "Adobe RGB (1998)").
function iccDesc(icc) {
  try {
    const count = icc.readUInt32BE(128)
    for (let n = 0; n < count; n++) {
      const off = 132 + n * 12
      if (icc.subarray(off, off + 4).toString("ascii") !== "desc") continue
      const start = icc.readUInt32BE(off + 4)
      const size = icc.readUInt32BE(off + 8)
      const tag = icc.subarray(start, start + size)
      const type = tag.subarray(0, 4).toString("ascii")
      if (type === "desc") return tag.subarray(12, 12 + tag.readUInt32BE(8)).toString("ascii").replace(/\0+$/, "")
      if (type === "mluc") {
        // Chuỗi mluc là UTF-16 big-endian; swap16 để Node đọc được bằng utf16le.
        const len = tag.readUInt32BE(20)
        const at = tag.readUInt32BE(24)
        return Buffer.from(tag.subarray(at, at + len)).swap16().toString("utf16le").replace(/\0+$/, "")
      }
    }
  } catch {}
  return "(không đọc được tên)"
}

async function load(target) {
  if (/^https?:\/\//.test(target)) {
    const res = await fetch(target)
    if (!res.ok) throw new Error(`HTTP ${res.status} ${await res.text().catch(() => "")}`.slice(0, 200))
    return { buf: Buffer.from(await res.arrayBuffer()), type: res.headers.get("content-type") }
  }
  return { buf: await readFile(target), type: null }
}

// Với một link /api/drive-image/..., trả về cả hai biến thể để so sánh:
// bản preview (thumbnail Google sinh ra) và bản gốc (bytes nguyên trên Drive).
function variantsOf(target) {
  if (!/^https?:\/\//.test(target) || !target.includes("/api/drive-image/")) {
    return [{ label: target, url: target }]
  }

  const url = new URL(target)
  url.searchParams.delete("r")

  const preview = new URL(url)
  preview.searchParams.set("s", "1600")

  const full = new URL(url)
  full.searchParams.delete("s")

  return [
    { label: "BẢN GỐC trên Drive  (web hiển thị sau khi tải xong)", url: full.toString() },
    { label: "BẢN PREVIEW s=1600  (Google sinh ra, giống Drive hiển thị)", url: preview.toString() },
  ]
}

async function describe({ label, url }) {
  console.log("\n" + "=".repeat(70))
  console.log(label)
  console.log("=".repeat(70))
  try {
    const { buf, type } = await load(url)
    const info = parseJpeg(buf)
    console.log(`  kích thước file : ${(buf.length / 1024 / 1024).toFixed(2)} MB${type ? `  (${type})` : ""}`)
    if (info.error) return console.log(`  ${info.error}`)
    if (info.sof) {
      const cs = { 1: "Grayscale", 3: "RGB/YCbCr", 4: "CMYK/YCCK ❗" }[info.sof.components] ?? "?"
      console.log(`  kích thước ảnh  : ${info.sof.width} x ${info.sof.height}${info.sof.progressive ? " (progressive)" : " (baseline)"}`)
      console.log(`  số kênh màu     : ${info.sof.components} → ${cs}`)
    }
    console.log(`  Adobe APP14     : ${info.adobe === null ? "không có" : ADOBE_TRANSFORM[info.adobe] ?? info.adobe}`)
    console.log(`  ICC profile     : ${info.icc ? `CÓ — "${info.icc.desc}" (${info.icc.space}, ${info.icc.size} bytes)` : "KHÔNG CÓ"}`)
  } catch (error) {
    console.log(`  Lỗi: ${error.message}`)
  }
}

const targets = process.argv.slice(2)
if (!targets.length) {
  console.error("Cách dùng: node scripts/inspect-image-color.mjs <url|file>")
  process.exit(1)
}

for (const target of targets) {
  for (const variant of variantsOf(target)) await describe(variant)
}

console.log("\nHai bản khác nhau ở dòng 'số kênh màu' hoặc 'ICC profile' → đó chính là chỗ lệch màu.\n")
