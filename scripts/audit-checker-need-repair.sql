-- =====================================================================
-- AUDIT độ chính xác dữ liệu cho page Checker & Need Repair.
-- Chạy từng block riêng trong Supabase SQL editor (mỗi block là 1 query).
-- =====================================================================


-- ---------------------------------------------------------------------
-- 1. Phân bố status trong order_history (phát hiện biến thể lạ, vd NEED_REPAIR underscore)
-- ---------------------------------------------------------------------
SELECT status, COUNT(*) AS rows
FROM order_history
GROUP BY status
ORDER BY rows DESC;


-- ---------------------------------------------------------------------
-- 2. Status NEED_REPAIR (underscore) còn sót không?
-- ---------------------------------------------------------------------
SELECT
  (SELECT COUNT(*) FROM order_history WHERE status = 'NEED REPAIR')   AS oh_space,
  (SELECT COUNT(*) FROM order_history WHERE status = 'NEED_REPAIR')   AS oh_underscore,
  (SELECT COUNT(*) FROM orders        WHERE status = 'NEED REPAIR')   AS orders_space,
  (SELECT COUNT(*) FROM orders        WHERE status = 'NEED_REPAIR')   AS orders_underscore;


-- ---------------------------------------------------------------------
-- 3. item_id collision giữa Sheet & Mera (trong các row NEED REPAIR)
--    > 0 nghĩa là cùng 1 item_id tồn tại ở cả 2 nguồn → distinct key cần
--      gồm google_sheet_id, không dùng item_id một mình.
-- ---------------------------------------------------------------------
WITH ids AS (
  SELECT DISTINCT
    item_id,
    CASE WHEN google_sheet_id = '__mera__' THEN 'mera' ELSE 'sheet' END AS src
  FROM order_history
  WHERE status = 'NEED REPAIR'
    AND item_id IS NOT NULL
)
SELECT item_id, COUNT(*) AS source_count
FROM ids
GROUP BY item_id
HAVING COUNT(*) > 1
ORDER BY item_id
LIMIT 50;


-- ---------------------------------------------------------------------
-- 4. Designer có repair_rate > 100% (all_time) — dấu hiệu mẫu số sai.
--    Sau khi mẫu số được fix (bỏ filter dateRange), kết quả này phản ánh
--    các designer có đơn cần sửa nhưng không có mặt trong `orders` (vd
--    designer mới gán sau khi sync).
-- ---------------------------------------------------------------------
WITH repair AS (
  SELECT
    COALESCE(designer, 'Unassigned') AS designer,
    COUNT(DISTINCT item_id || '::' || google_sheet_id) AS repair_orders
  FROM order_history
  WHERE status = 'NEED REPAIR'
    AND item_id IS NOT NULL
  GROUP BY 1
),
processed AS (
  SELECT
    COALESCE(designer, 'Unassigned') AS designer,
    COUNT(DISTINCT item_id || '::' || google_sheet_id) AS total_orders
  FROM orders
  WHERE item_id IS NOT NULL
  GROUP BY 1
)
SELECT
  r.designer,
  r.repair_orders,
  COALESCE(p.total_orders, 0) AS total_orders,
  CASE
    WHEN COALESCE(p.total_orders, 0) = 0 THEN NULL
    ELSE ROUND((r.repair_orders::numeric / p.total_orders) * 100, 1)
  END AS repair_rate_percent
FROM repair r
LEFT JOIN processed p USING (designer)
WHERE COALESCE(p.total_orders, 0) = 0
   OR r.repair_orders > p.total_orders
ORDER BY r.repair_orders DESC;


-- ---------------------------------------------------------------------
-- 5. Designer name có khả năng trùng do hoa/thường/khoảng trắng
--    (cùng tên normalize ra nhiều biến thể).
-- ---------------------------------------------------------------------
WITH norm AS (
  SELECT designer, LOWER(BTRIM(designer)) AS key
  FROM orders
  WHERE designer IS NOT NULL
)
SELECT key, COUNT(DISTINCT designer) AS variants, array_agg(DISTINCT designer) AS values
FROM norm
GROUP BY key
HAVING COUNT(DISTINCT designer) > 1
ORDER BY variants DESC
LIMIT 50;


-- ---------------------------------------------------------------------
-- 6. Kiểm tra timezone server (database)
-- ---------------------------------------------------------------------
SELECT
  current_setting('TIMEZONE') AS db_timezone,
  NOW()                       AS now_utc,
  NOW() AT TIME ZONE 'Asia/Ho_Chi_Minh' AS now_vn;


-- ---------------------------------------------------------------------
-- 7. So sánh "today" theo 2 cách tính boundary — để thấy lệch khi server UTC.
--    Nếu server prod là UTC, "today" kiểu local sẽ là 00:00 UTC =
--    07:00 VN → bộ lọc lệch 7h. Sau fix, ta dùng cách VN.
-- ---------------------------------------------------------------------
WITH today_local AS (
  SELECT
    date_trunc('day', NOW())                          AS start_local,
    date_trunc('day', NOW()) + INTERVAL '1 day'       AS end_local
),
today_vn AS (
  SELECT
    date_trunc('day', NOW() AT TIME ZONE 'Asia/Ho_Chi_Minh')
      AT TIME ZONE 'Asia/Ho_Chi_Minh'                                   AS start_vn,
    (date_trunc('day', NOW() AT TIME ZONE 'Asia/Ho_Chi_Minh') + INTERVAL '1 day')
      AT TIME ZONE 'Asia/Ho_Chi_Minh'                                   AS end_vn
)
SELECT
  l.start_local, l.end_local,
  v.start_vn,    v.end_vn,
  (SELECT COUNT(*) FROM order_history
    WHERE status = 'NEED REPAIR'
      AND created_at >= l.start_local AND created_at < l.end_local) AS need_repair_today_local,
  (SELECT COUNT(*) FROM order_history
    WHERE status = 'NEED REPAIR'
      AND created_at >= v.start_vn    AND created_at < v.end_vn   ) AS need_repair_today_vn
FROM today_local l, today_vn v;


-- ---------------------------------------------------------------------
-- 8. Spot check 1 designer cụ thể (đổi tên bên dưới) — so sánh mẫu số
--    cũ (orders filter theo dateRange this_week) vs mẫu số mới (all-time).
-- ---------------------------------------------------------------------
-- Thay '<DESIGNER_NAME>' bằng tên thực tế trước khi chạy.
WITH params AS (
  SELECT '<DESIGNER_NAME>'::text AS d,
         date_trunc('week', NOW() AT TIME ZONE 'Asia/Ho_Chi_Minh')
           AT TIME ZONE 'Asia/Ho_Chi_Minh' AS week_start,
         NOW() AS week_end
),
repair_week AS (
  SELECT COUNT(DISTINCT item_id || '::' || google_sheet_id) AS n
  FROM order_history, params
  WHERE status = 'NEED REPAIR'
    AND designer = params.d
    AND created_at >= params.week_start
    AND created_at <  params.week_end
),
orders_week AS (
  SELECT COUNT(DISTINCT item_id || '::' || google_sheet_id) AS n
  FROM orders, params
  WHERE designer = params.d
    AND created_at >= params.week_start
    AND created_at <  params.week_end
),
orders_all AS (
  SELECT COUNT(DISTINCT item_id || '::' || google_sheet_id) AS n
  FROM orders, params
  WHERE designer = params.d
)
SELECT
  (SELECT d FROM params)               AS designer,
  (SELECT n FROM repair_week)          AS repair_this_week,
  (SELECT n FROM orders_week)          AS orders_this_week_old_denom,
  (SELECT n FROM orders_all)           AS orders_alltime_new_denom,
  CASE WHEN (SELECT n FROM orders_week) > 0
       THEN ROUND(((SELECT n FROM repair_week)::numeric / (SELECT n FROM orders_week)) * 100, 1) END
         AS rate_old_percent,
  CASE WHEN (SELECT n FROM orders_all) > 0
       THEN ROUND(((SELECT n FROM repair_week)::numeric / (SELECT n FROM orders_all)) * 100, 1) END
         AS rate_new_percent;
