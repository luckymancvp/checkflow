// Audit độ chính xác dữ liệu cho page Checker & Need Repair.
// Chạy: node scripts/audit-data-accuracy.mjs
import { createClient } from "@supabase/supabase-js"
import { readFileSync } from "node:fs"

// Load .env.local thủ công (project dùng Next, không cần dotenv runtime).
try {
  const env = readFileSync(".env.local", "utf8")
  for (const line of env.split(/\r?\n/)) {
    const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/)
    if (m && !process.env[m[1]]) process.env[m[1]] = m[2].replace(/^["']|["']$/g, "")
  }
} catch {}

const url = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL
const key = process.env.SUPABASE_SERVICE_ROLE_KEY
if (!url || !key) {
  console.error("Missing SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY")
  process.exit(1)
}
const sb = createClient(url, key, { auth: { persistSession: false } })

const MERA = "__mera__"
const sep = (t) => console.log("\n" + "=".repeat(8) + " " + t + " " + "=".repeat(8))

async function fetchAll(table, builder) {
  const PAGE = 1000
  let from = 0
  const out = []
  for (;;) {
    const { data, error } = await builder(sb.from(table)).range(from, from + PAGE - 1)
    if (error) throw error
    out.push(...(data ?? []))
    if (!data || data.length < PAGE) break
    from += PAGE
  }
  return out
}

// 1) Status NEED_REPAIR underscore còn sót trong order_history?
sep("1. Status check trong order_history")
{
  const { data, error } = await sb
    .from("order_history")
    .select("status", { count: "exact", head: false })
    .eq("status", "NEED_REPAIR")
    .limit(5)
  if (error) console.error(error)
  else console.log("  NEED_REPAIR (underscore) rows (max 5 mẫu):", data?.length ?? 0, data)

  const { count: cSpace } = await sb
    .from("order_history")
    .select("*", { count: "exact", head: true })
    .eq("status", "NEED REPAIR")
  const { count: cUnder } = await sb
    .from("order_history")
    .select("*", { count: "exact", head: true })
    .eq("status", "NEED_REPAIR")
  console.log(`  count "NEED REPAIR" = ${cSpace} | "NEED_REPAIR" = ${cUnder}`)
}

// 2) Status NEED_REPAIR underscore trong orders?
sep("2. Status check trong orders")
{
  const { count: cSpace } = await sb.from("orders").select("*", { count: "exact", head: true }).eq("status", "NEED REPAIR")
  const { count: cUnder } = await sb.from("orders").select("*", { count: "exact", head: true }).eq("status", "NEED_REPAIR")
  console.log(`  count "NEED REPAIR" = ${cSpace} | "NEED_REPAIR" = ${cUnder}`)
}

// 3) Distinct status values trong order_history (để phát hiện biến thể lạ)
sep("3. Phân bố status trong order_history (top 20)")
{
  const rows = await fetchAll("order_history", (q) => q.select("status"))
  const map = new Map()
  for (const r of rows) map.set(r.status, (map.get(r.status) || 0) + 1)
  console.log("  total rows:", rows.length)
  console.log("  distinct status:", [...map.entries()].sort((a, b) => b[1] - a[1]).slice(0, 20))
}

// 4) Item_id collision giữa Sheet và Mera
sep("4. item_id collision giữa Sheet & Mera (order_history NEED REPAIR)")
{
  const rows = await fetchAll("order_history", (q) =>
    q.select("item_id, google_sheet_id").eq("status", "NEED REPAIR"),
  )
  const meraIds = new Set()
  const sheetIds = new Set()
  for (const r of rows) {
    if (!r.item_id) continue
    if (r.google_sheet_id === MERA) meraIds.add(r.item_id)
    else sheetIds.add(r.item_id)
  }
  const collisions = [...meraIds].filter((id) => sheetIds.has(id))
  console.log(`  mera distinct item_id: ${meraIds.size}, sheet distinct item_id: ${sheetIds.size}`)
  console.log(`  collisions (cùng item_id tồn tại ở cả 2 source): ${collisions.length}`)
  if (collisions.length) console.log("  ví dụ:", collisions.slice(0, 10))
}

// 5) Repair_rate > 100% — designer có (đơn cần sửa) > (tổng đơn xử lý) trong cùng all_time
sep("5. Phát hiện designer có nguy cơ repair_rate > 100% (all_time)")
{
  const repairRows = await fetchAll("order_history", (q) =>
    q.select("item_id, google_sheet_id, designer").eq("status", "NEED REPAIR"),
  )
  const ordersRows = await fetchAll("orders", (q) => q.select("item_id, google_sheet_id, designer"))

  const repairByDesigner = new Map()
  for (const r of repairRows) {
    const d = r.designer || "Unassigned"
    const key = `${r.item_id}::${r.google_sheet_id}`
    if (!repairByDesigner.has(d)) repairByDesigner.set(d, new Set())
    repairByDesigner.get(d).add(key)
  }
  const ordersByDesigner = new Map()
  for (const r of ordersRows) {
    const d = r.designer || "Unassigned"
    const key = `${r.item_id}::${r.google_sheet_id}`
    if (!ordersByDesigner.has(d)) ordersByDesigner.set(d, new Set())
    ordersByDesigner.get(d).add(key)
  }

  const offenders = []
  for (const [d, set] of repairByDesigner) {
    const denom = ordersByDesigner.get(d)?.size ?? 0
    const num = set.size
    const rate = denom > 0 ? (num / denom) * 100 : null
    if (rate === null || rate > 100) offenders.push({ designer: d, repair_orders: num, total_orders: denom, rate })
  }
  offenders.sort((a, b) => (b.repair_orders || 0) - (a.repair_orders || 0))
  console.log(`  ${offenders.length} designer có repair_rate > 100% hoặc denom=0:`)
  for (const o of offenders.slice(0, 15)) console.log(`    ${o.designer}: ${o.repair_orders}/${o.total_orders} = ${o.rate?.toFixed(1) ?? "null"}%`)
}

// 6) Designer name mismatch (cùng người, chữ hoa/thường/khoảng trắng khác nhau)
sep("6. Designer name có khả năng trùng (normalize trim+lowercase)")
{
  const { data } = await sb.from("orders").select("designer")
  const groups = new Map()
  for (const r of data ?? []) {
    if (!r.designer) continue
    const norm = r.designer.trim().toLowerCase()
    if (!groups.has(norm)) groups.set(norm, new Set())
    groups.get(norm).add(r.designer)
  }
  const dupes = [...groups.entries()].filter(([, s]) => s.size > 1)
  console.log(`  ${dupes.length} nhóm có >1 biến thể tên:`)
  for (const [k, set] of dupes.slice(0, 20)) console.log(`    ${k} → ${[...set].join(" | ")}`)
}

// 7) Server timezone offset
sep("7. Server timezone (Node process)")
console.log(`  process.env.TZ=${process.env.TZ ?? "(unset)"}`)
console.log(`  new Date().toString() = ${new Date().toString()}`)
console.log(`  Intl tz = ${Intl.DateTimeFormat().resolvedOptions().timeZone}`)
console.log(`  offset minutes = ${new Date().getTimezoneOffset()}`)

console.log("\nDone.")
