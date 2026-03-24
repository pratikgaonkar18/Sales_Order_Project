CREATE TABLE users (
    id BIGINT PRIMARY KEY AUTO_INCREMENT,
    full_name VARCHAR(120) NOT NULL,
    email VARCHAR(160) NOT NULL UNIQUE,
    role VARCHAR(32) NOT NULL,
    active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

CREATE TABLE sales_orders (
    id BIGINT PRIMARY KEY AUTO_INCREMENT,
    sales_order_no VARCHAR(30) NOT NULL UNIQUE,
    division VARCHAR(10) NOT NULL,
    customer_name VARCHAR(160) NOT NULL,
    customer_po VARCHAR(80),
    submittal_date DATE,
    ship_date DATE,
    project_name VARCHAR(160),
    assigned_engineer VARCHAR(120),
    reference_serial_number VARCHAR(20),
    previous_order_id BIGINT,
    status VARCHAR(50) NOT NULL,
    current_owner_role VARCHAR(30) NOT NULL,
    stage_updated_at DATETIME NOT NULL,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    CONSTRAINT fk_sales_orders_previous
        FOREIGN KEY (previous_order_id) REFERENCES sales_orders (id)
);

CREATE INDEX idx_sales_orders_customer_name ON sales_orders (customer_name);
CREATE INDEX idx_sales_orders_status_owner ON sales_orders (status, current_owner_role);
CREATE INDEX idx_sales_orders_reference_serial ON sales_orders (reference_serial_number);

CREATE TABLE order_lines (
    id BIGINT PRIMARY KEY AUTO_INCREMENT,
    sales_order_id BIGINT NOT NULL,
    item_no VARCHAR(10) NOT NULL,
    description VARCHAR(255),
    quantity INT NOT NULL,
    material VARCHAR(80),
    part_number VARCHAR(60),
    revision VARCHAR(30),
    is_revision_default BOOLEAN,
    pn_rev_verified VARCHAR(20),
    new_serial_number VARCHAR(30),
    reference_serial_number VARCHAR(30),
    line_status VARCHAR(20),
    notes VARCHAR(500),
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    CONSTRAINT fk_order_lines_sales_order
        FOREIGN KEY (sales_order_id) REFERENCES sales_orders (id),
    CONSTRAINT uq_order_lines_item UNIQUE (sales_order_id, item_no)
);

CREATE INDEX idx_order_lines_part_number ON order_lines (part_number);
CREATE INDEX idx_order_lines_reference_serial ON order_lines (reference_serial_number);

CREATE TABLE engineering_checks (
    id BIGINT PRIMARY KEY AUTO_INCREMENT,
    order_line_id BIGINT NOT NULL,
    d365_part_exists BOOLEAN,
    revision_valid BOOLEAN,
    drawing_exists BOOLEAN,
    am_previous_order_checked BOOLEAN,
    bom_compatibility_verified BOOLEAN,
    notes VARCHAR(500),
    checked_by VARCHAR(120),
    checked_at DATETIME,
    CONSTRAINT fk_engineering_checks_order_line
        FOREIGN KEY (order_line_id) REFERENCES order_lines (id),
    CONSTRAINT uq_engineering_checks_order_line UNIQUE (order_line_id)
);

CREATE TABLE deliverables (
    id BIGINT PRIMARY KEY AUTO_INCREMENT,
    order_line_id BIGINT NOT NULL,
    deliverable_type VARCHAR(40) NOT NULL,
    required_flag BOOLEAN NOT NULL DEFAULT FALSE,
    status VARCHAR(20) NOT NULL DEFAULT 'NOT_REQUIRED',
    file_link VARCHAR(500),
    completed_by VARCHAR(120),
    completed_at DATETIME,
    CONSTRAINT fk_deliverables_order_line
        FOREIGN KEY (order_line_id) REFERENCES order_lines (id)
);

CREATE INDEX idx_deliverables_order_line ON deliverables (order_line_id);

CREATE TABLE workflow_events (
    id BIGINT PRIMARY KEY AUTO_INCREMENT,
    sales_order_id BIGINT NOT NULL,
    from_status VARCHAR(50),
    to_status VARCHAR(50) NOT NULL,
    actor_name VARCHAR(120) NOT NULL,
    comment_text VARCHAR(500),
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_workflow_events_sales_order
        FOREIGN KEY (sales_order_id) REFERENCES sales_orders (id)
);

CREATE INDEX idx_workflow_events_order_created ON workflow_events (sales_order_id, created_at);

CREATE TABLE notifications (
    id BIGINT PRIMARY KEY AUTO_INCREMENT,
    sales_order_id BIGINT NOT NULL,
    recipient_email VARCHAR(160) NOT NULL,
    event_type VARCHAR(60) NOT NULL,
    send_status VARCHAR(20) NOT NULL DEFAULT 'PENDING',
    sent_at DATETIME,
    retry_count INT NOT NULL DEFAULT 0,
    error_message VARCHAR(500),
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_notifications_sales_order
        FOREIGN KEY (sales_order_id) REFERENCES sales_orders (id)
);

CREATE INDEX idx_notifications_status_created ON notifications (send_status, created_at);

CREATE TABLE part_master_cache (
    part_number VARCHAR(60) NOT NULL,
    revision VARCHAR(30) NOT NULL,
    description VARCHAR(255),
    is_default_revision BOOLEAN,
    source_last_sync_at DATETIME,
    PRIMARY KEY (part_number, revision)
);
