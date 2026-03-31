ALTER TABLE sales_orders
    ADD COLUMN is_deleted BOOLEAN NOT NULL DEFAULT FALSE,
    ADD COLUMN deleted_at DATETIME NULL,
    ADD COLUMN deleted_by VARCHAR(100) NULL;

CREATE INDEX idx_sales_orders_is_deleted ON sales_orders (is_deleted);
