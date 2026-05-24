ALTER TABLE "Inventory"
ADD CONSTRAINT "total_stock_non_negative"
CHECK ("totalStock" >= 0);

ALTER TABLE "Inventory"
ADD CONSTRAINT "reserved_stock_non_negative"
CHECK ("reservedStock" >= 0);

ALTER TABLE "Inventory"
ADD CONSTRAINT "reserved_less_than_total"
CHECK ("reservedStock" <= "totalStock");