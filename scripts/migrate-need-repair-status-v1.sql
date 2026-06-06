-- Migration: chuẩn hóa status "NEED_REPAIR" (gạch dưới) -> "NEED REPAIR" (dấu cách)
-- Chạy MỘT LẦN trên Supabase sau khi deploy code mới.
-- Kiểm tra trước khi chạy:
--   SELECT status, COUNT(*) FROM orders GROUP BY status;
--   SELECT status, COUNT(*) FROM order_history GROUP BY status;

BEGIN;

UPDATE orders
SET status = 'NEED REPAIR'
WHERE status = 'NEED_REPAIR';

UPDATE order_history
SET status = 'NEED REPAIR'
WHERE status = 'NEED_REPAIR';

-- Verify: hai query dưới phải trả 0 row.
-- SELECT COUNT(*) FROM orders        WHERE status = 'NEED_REPAIR';
-- SELECT COUNT(*) FROM order_history WHERE status = 'NEED_REPAIR';

COMMIT;
