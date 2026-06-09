// Tính dateRange theo timezone Việt Nam (Asia/Ho_Chi_Minh, GMT+7, không DST).
// Mọi mốc trả về là Date UTC tương ứng với 00:00 giờ VN của ngày tương ứng.
// Lý do: server prod (Vercel) chạy UTC, nếu dùng new Date(y, m, d) sẽ ra 00:00 UTC =
// 07:00 VN → bộ lọc "Today" lệch 7h.

const VN_OFFSET_MS = 7 * 60 * 60 * 1000

// Trả về Date là 00:00 giờ VN của "hôm nay (theo VN)" — biểu diễn dưới dạng UTC instant.
function vnStartOfToday(now: Date = new Date()): Date {
  const shifted = new Date(now.getTime() + VN_OFFSET_MS)
  const utcMidnightOfVnDay = Date.UTC(shifted.getUTCFullYear(), shifted.getUTCMonth(), shifted.getUTCDate())
  return new Date(utcMidnightOfVnDay - VN_OFFSET_MS)
}

const DAY_MS = 24 * 60 * 60 * 1000

function addDays(d: Date, n: number): Date {
  return new Date(d.getTime() + n * DAY_MS)
}

// VN không có DST → tính tháng bằng cách shift sang VN rồi clamp.
function vnStartOfMonth(now: Date, monthOffset: number): Date {
  const shifted = new Date(now.getTime() + VN_OFFSET_MS)
  const y = shifted.getUTCFullYear()
  const m = shifted.getUTCMonth() + monthOffset
  return new Date(Date.UTC(y, m, 1) - VN_OFFSET_MS)
}

export type DateRange = { start: Date; end: Date } | null

export function getDateRange(
  timeRange: string,
  startDate?: string | null,
  endDate?: string | null,
): DateRange {
  const now = new Date()
  const today = vnStartOfToday(now)

  switch (timeRange) {
    case "today":
      return { start: today, end: addDays(today, 1) }
    case "yesterday":
      return { start: addDays(today, -1), end: today }
    case "this_week": {
      // Tuần bắt đầu Chủ Nhật, theo lịch VN.
      const shifted = new Date(today.getTime() + VN_OFFSET_MS)
      const dow = shifted.getUTCDay() // 0 = CN
      return { start: addDays(today, -dow), end: new Date() }
    }
    case "last_week": {
      const shifted = new Date(today.getTime() + VN_OFFSET_MS)
      const dow = shifted.getUTCDay()
      const start = addDays(today, -dow - 7)
      return { start, end: addDays(start, 7) }
    }
    case "this_month":
      return { start: vnStartOfMonth(now, 0), end: new Date() }
    case "last_month":
      return { start: vnStartOfMonth(now, -1), end: vnStartOfMonth(now, 0) }
    case "custom":
      if (startDate && endDate) {
        return { start: new Date(startDate), end: new Date(endDate) }
      }
      return null
    case "all_time":
    default:
      return null
  }
}
