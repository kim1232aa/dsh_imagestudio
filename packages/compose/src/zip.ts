/**
 * 最小 ZIP 读写（切片包导出/还原用）。
 * 写出固定 store（不压缩）——PNG 本身已压缩，再压无收益；
 * 读入同时支持 store(0) 与 deflate(8)，能解开外来 zip。
 */

import { inflateRawSync } from 'node:zlib'

export interface ZipEntry {
  name: string
  data: Uint8Array
}

const CRC_TABLE = (() => {
  const table = new Uint32Array(256)
  for (let n = 0; n < 256; n++) {
    let c = n
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1
    table[n] = c >>> 0
  }
  return table
})()

export function crc32(buf: Uint8Array): number {
  let crc = 0xffffffff
  for (let i = 0; i < buf.length; i++) crc = CRC_TABLE[(crc ^ buf[i]) & 0xff] ^ (crc >>> 8)
  return (crc ^ 0xffffffff) >>> 0
}

export function writeZip(entries: ZipEntry[]): Uint8Array {
  const encoder = new TextEncoder()
  const parts: Uint8Array[] = []
  const central: Uint8Array[] = []
  let offset = 0
  for (const entry of entries) {
    const nameBytes = encoder.encode(entry.name)
    const crc = crc32(entry.data)
    const local = new Uint8Array(30 + nameBytes.length)
    const lv = new DataView(local.buffer)
    lv.setUint32(0, 0x04034b50, true)
    lv.setUint16(4, 20, true) // version needed
    lv.setUint16(6, 0x0800, true) // UTF-8 flag
    lv.setUint16(8, 0, true) // method: store
    lv.setUint16(14, crc, true)
    lv.setUint32(18, entry.data.length, true)
    lv.setUint32(22, entry.data.length, true)
    lv.setUint16(26, nameBytes.length, true)
    local.set(nameBytes, 30)
    parts.push(local, entry.data)

    const cen = new Uint8Array(46 + nameBytes.length)
    const cv = new DataView(cen.buffer)
    cv.setUint32(0, 0x02014b50, true)
    cv.setUint16(6, 20, true)
    cv.setUint16(8, 0x0800, true)
    cv.setUint16(10, 0, true)
    cv.setUint16(16, crc, true)
    cv.setUint32(20, entry.data.length, true)
    cv.setUint32(24, entry.data.length, true)
    cv.setUint16(28, nameBytes.length, true)
    cv.setUint32(42, offset, true)
    cen.set(nameBytes, 46)
    central.push(cen)
    offset += local.length + entry.data.length
  }
  const centralSize = central.reduce((sum, c) => sum + c.length, 0)
  const eocd = new Uint8Array(22)
  const ev = new DataView(eocd.buffer)
  ev.setUint32(0, 0x06054b50, true)
  ev.setUint16(8, entries.length, true)
  ev.setUint16(10, entries.length, true)
  ev.setUint32(12, centralSize, true)
  ev.setUint32(16, offset, true)
  const out = new Uint8Array(offset + centralSize + 22)
  let pos = 0
  for (const p of parts) { out.set(p, pos); pos += p.length }
  for (const c of central) { out.set(c, pos); pos += c.length }
  out.set(eocd, pos)
  return out
}

export function readZip(bytes: Uint8Array): ZipEntry[] {
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength)
  // EOCD 在尾部 22 字节起，最多带 64KB 注释，从后往前扫签名
  let eocd = -1
  for (let i = bytes.length - 22; i >= Math.max(0, bytes.length - 22 - 65536); i--) {
    if (view.getUint32(i, true) === 0x06054b50) { eocd = i; break }
  }
  if (eocd < 0) throw new Error('不是有效的 ZIP（找不到结尾目录）')
  const count = view.getUint16(eocd + 10, true)
  let pos = view.getUint32(eocd + 16, true)
  const decoder = new TextDecoder()
  const entries: ZipEntry[] = []
  for (let n = 0; n < count; n++) {
    if (view.getUint32(pos, true) !== 0x02014b50) throw new Error('ZIP 中央目录损坏')
    const method = view.getUint16(pos + 10, true)
    const compSize = view.getUint32(pos + 20, true)
    const nameLen = view.getUint16(pos + 28, true)
    const extraLen = view.getUint16(pos + 30, true)
    const commentLen = view.getUint16(pos + 32, true)
    const localOff = view.getUint32(pos + 42, true)
    const name = decoder.decode(bytes.subarray(pos + 46, pos + 46 + nameLen))
    // local header: 名字/扩展字段长度可能与中央目录不同，以 local 为准跳过
    const lNameLen = view.getUint16(localOff + 26, true)
    const lExtraLen = view.getUint16(localOff + 28, true)
    const dataStart = localOff + 30 + lNameLen + lExtraLen
    const raw = bytes.subarray(dataStart, dataStart + compSize)
    let data: Uint8Array
    if (method === 0) data = new Uint8Array(raw)
    else if (method === 8) data = new Uint8Array(inflateRawSync(Buffer.from(raw)))
    else throw new Error(`不支持的 ZIP 压缩方式 ${method}（${name}）`)
    entries.push({ name, data })
    pos += 46 + nameLen + extraLen + commentLen
  }
  return entries
}
