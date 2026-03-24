SET @drawing_exists := (
    SELECT COUNT(*)
    FROM information_schema.columns
    WHERE table_schema = DATABASE()
      AND table_name = 'order_lines'
      AND column_name = 'drawing_status'
);
SET @drawing_sql := IF(
    @drawing_exists = 0,
    'ALTER TABLE order_lines ADD COLUMN drawing_status VARCHAR(10) NOT NULL DEFAULT ''NA''',
    'SELECT 1'
);
PREPARE drawing_stmt FROM @drawing_sql;
EXECUTE drawing_stmt;
DEALLOCATE PREPARE drawing_stmt;

SET @test_sheet_exists := (
    SELECT COUNT(*)
    FROM information_schema.columns
    WHERE table_schema = DATABASE()
      AND table_name = 'order_lines'
      AND column_name = 'test_sheet_status'
);
SET @test_sheet_sql := IF(
    @test_sheet_exists = 0,
    'ALTER TABLE order_lines ADD COLUMN test_sheet_status VARCHAR(10) NOT NULL DEFAULT ''NA''',
    'SELECT 1'
);
PREPARE test_sheet_stmt FROM @test_sheet_sql;
EXECUTE test_sheet_stmt;
DEALLOCATE PREPARE test_sheet_stmt;

SET @tag_exists := (
    SELECT COUNT(*)
    FROM information_schema.columns
    WHERE table_schema = DATABASE()
      AND table_name = 'order_lines'
      AND column_name = 'tag_status'
);
SET @tag_sql := IF(
    @tag_exists = 0,
    'ALTER TABLE order_lines ADD COLUMN tag_status VARCHAR(10) NOT NULL DEFAULT ''NA''',
    'SELECT 1'
);
PREPARE tag_stmt FROM @tag_sql;
EXECUTE tag_stmt;
DEALLOCATE PREPARE tag_stmt;

SET @hmr_exists := (
    SELECT COUNT(*)
    FROM information_schema.columns
    WHERE table_schema = DATABASE()
      AND table_name = 'order_lines'
      AND column_name = 'hmr_status'
);
SET @hmr_sql := IF(
    @hmr_exists = 0,
    'ALTER TABLE order_lines ADD COLUMN hmr_status VARCHAR(10) NOT NULL DEFAULT ''NA''',
    'SELECT 1'
);
PREPARE hmr_stmt FROM @hmr_sql;
EXECUTE hmr_stmt;
DEALLOCATE PREPARE hmr_stmt;
