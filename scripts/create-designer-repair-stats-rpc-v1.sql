-- =====================================================================
-- RPC: get_designer_repair_stats
-- Trả thống kê NEED REPAIR theo designer, dựa trên:
--   - Đơn CONFIRMED (đơn đã chốt) — đơn vị đo
--   - Designer = designer ĐẦU TIÊN trong order_history (snapshot sớm nhất)
--   - Filter time range theo lúc CONFIRMED gần nhất
--   - Normalize designer name (LOWER + BTRIM)
-- =====================================================================

CREATE OR REPLACE FUNCTION get_designer_repair_stats(
  p_time_from     timestamptz DEFAULT NULL,   -- NULL = all time
  p_time_to       timestamptz DEFAULT NULL,
  p_sheet_ids     text[]      DEFAULT NULL,   -- NULL/empty = tất cả sheet
  p_include_sheet boolean     DEFAULT TRUE,
  p_include_mera  boolean     DEFAULT TRUE
)
RETURNS TABLE(
  designer                text,    -- normalized lowercase
  designer_display        text,    -- representative display name
  confirmed_orders        bigint,  -- mẫu số
  orders_need_repair      bigint,  -- tử số (per-order, có ≥1 NEED REPAIR)
  orders_design_error     bigint,  -- per-order, có ≥1 design_error
  orders_customer_change  bigint,  -- per-order, có ≥1 customer_change
  need_repair_times       bigint,  -- tổng số LẦN mark NEED REPAIR trên đơn của designer
  design_error_times      bigint,  -- tổng số LẦN change_type=design_error
  customer_change_times   bigint   -- tổng số LẦN change_type=customer_change
)
LANGUAGE sql
STABLE
AS $$
  WITH
  -- Lọc theo source (Sheet / Mera) + sheetIds. Khi cả 2 đều tắt, trả rỗng.
  src AS (
    SELECT id, item_id, google_sheet_id, designer, status, change_type, created_at
    FROM order_history
    WHERE item_id IS NOT NULL
      AND (
        (p_include_sheet AND google_sheet_id <> '__mera__')
        OR (p_include_mera AND google_sheet_id = '__mera__')
      )
      AND (
        p_sheet_ids IS NULL
        OR cardinality(p_sheet_ids) = 0
        OR google_sheet_id = ANY(p_sheet_ids)
        OR (p_include_mera AND google_sheet_id = '__mera__')
      )
  ),
  -- Designer đầu tiên của mỗi đơn = row history sớm nhất có designer not-null.
  first_designer AS (
    SELECT DISTINCT ON (item_id, google_sheet_id)
      item_id,
      google_sheet_id,
      LOWER(BTRIM(designer)) AS designer_norm,
      designer               AS designer_display
    FROM src
    WHERE designer IS NOT NULL AND BTRIM(designer) <> ''
    ORDER BY item_id, google_sheet_id, created_at ASC, id ASC
  ),
  -- Mỗi đơn lấy lần CONFIRMED gần nhất làm "thời điểm chốt".
  last_confirmed AS (
    SELECT
      item_id,
      google_sheet_id,
      MAX(created_at) AS confirmed_at
    FROM src
    WHERE status = 'CONFIRMED'
    GROUP BY item_id, google_sheet_id
  ),
  -- Per-order flags & counts (all-time trên đơn đó, không filter date).
  order_flags AS (
    SELECT
      item_id,
      google_sheet_id,
      COUNT(*) FILTER (WHERE status = 'NEED REPAIR')                                     AS nr_times,
      COUNT(*) FILTER (WHERE status = 'NEED REPAIR' AND change_type = 'design_error')    AS de_times,
      COUNT(*) FILTER (WHERE status = 'NEED REPAIR' AND change_type = 'customer_change') AS cc_times,
      BOOL_OR(status = 'NEED REPAIR')                                                    AS has_nr,
      BOOL_OR(status = 'NEED REPAIR' AND change_type = 'design_error')                   AS has_de,
      BOOL_OR(status = 'NEED REPAIR' AND change_type = 'customer_change')                AS has_cc
    FROM src
    GROUP BY item_id, google_sheet_id
  ),
  -- Tập đơn được tính: đã CONFIRMED, trong khoảng thời gian filter, có designer xác định.
  scoped_orders AS (
    SELECT
      fd.designer_norm,
      fd.designer_display,
      of.nr_times, of.de_times, of.cc_times,
      of.has_nr, of.has_de, of.has_cc
    FROM last_confirmed lc
    JOIN first_designer fd USING (item_id, google_sheet_id)
    JOIN order_flags    of USING (item_id, google_sheet_id)
    WHERE (p_time_from IS NULL OR lc.confirmed_at >= p_time_from)
      AND (p_time_to   IS NULL OR lc.confirmed_at <  p_time_to)
  )
  SELECT
    designer_norm                                          AS designer,
    -- Display name: lấy biến thể xuất hiện nhiều nhất trong group (mode).
    (array_agg(designer_display ORDER BY designer_display))[1] AS designer_display,
    COUNT(*)                                               AS confirmed_orders,
    COUNT(*) FILTER (WHERE has_nr)                         AS orders_need_repair,
    COUNT(*) FILTER (WHERE has_de)                         AS orders_design_error,
    COUNT(*) FILTER (WHERE has_cc)                         AS orders_customer_change,
    SUM(nr_times)                                          AS need_repair_times,
    SUM(de_times)                                          AS design_error_times,
    SUM(cc_times)                                          AS customer_change_times
  FROM scoped_orders
  GROUP BY designer_norm
  ORDER BY confirmed_orders DESC;
$$;


-- =====================================================================
-- QUICK TEST — chạy thử để xem có ra số hợp lý.
-- =====================================================================
-- All time:
-- SELECT * FROM get_designer_repair_stats() LIMIT 20;

-- This week (theo VN):
-- SELECT * FROM get_designer_repair_stats(
--   date_trunc('week', NOW() AT TIME ZONE 'Asia/Ho_Chi_Minh') AT TIME ZONE 'Asia/Ho_Chi_Minh',
--   NOW()
-- ) LIMIT 20;

-- Chỉ Sheet:
-- SELECT * FROM get_designer_repair_stats(NULL, NULL, NULL, TRUE, FALSE) LIMIT 20;

-- Lọc sheet cụ thể:
-- SELECT * FROM get_designer_repair_stats(
--   NULL, NULL,
--   ARRAY['1V6xFDsHZ46_JfPCTyBkLfxp-8QyJBp3qirgiOZEj6cg']::text[],
--   TRUE, FALSE
-- );
