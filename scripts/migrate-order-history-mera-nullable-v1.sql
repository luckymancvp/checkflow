-- Cho phép order_history ghi nhận status change của đơn Mera.
-- Mera item không có row trong bảng `orders` local nên order_id phải nullable + bỏ FK.
-- Định danh đơn Mera dùng item_id (= Mera item_key) + google_sheet_id='__mera__'.

ALTER TABLE order_history DROP CONSTRAINT IF EXISTS order_history_order_id_fkey;
ALTER TABLE order_history ALTER COLUMN order_id DROP NOT NULL;
