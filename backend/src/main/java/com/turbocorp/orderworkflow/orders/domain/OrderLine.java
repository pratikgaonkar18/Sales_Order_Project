package com.turbocorp.orderworkflow.orders.domain;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.FetchType;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.PrePersist;
import jakarta.persistence.PreUpdate;
import jakarta.persistence.Table;
import java.time.LocalDateTime;
import lombok.Getter;
import lombok.Setter;

@Getter
@Setter
@Entity
@Table(name = "order_lines")
public class OrderLine {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "sales_order_id", nullable = false)
    private SalesOrder salesOrder;

    @Column(name = "item_no", nullable = false, length = 10)
    private String itemNo;

    @Column(length = 255)
    private String description;

    @Column(nullable = false)
    private Integer quantity;

    @Column(length = 80)
    private String material;

    @Column(name = "part_number", length = 60)
    private String partNumber;

    @Column(length = 30)
    private String revision;

    @Column(name = "is_revision_default")
    private Boolean revisionDefaultInSystem;

    @Enumerated(EnumType.STRING)
    @Column(name = "pn_rev_verified", length = 20)
    private PnRevVerification pnRevVerification;

    @Column(name = "new_serial_number", length = 30)
    private String newSerialNumber;

    @Column(name = "reference_serial_number", length = 30)
    private String referenceSerialNumber;

    @Column(name = "line_status", length = 20)
    private String lineStatus;

    @Enumerated(EnumType.STRING)
    @Column(name = "drawing_status", nullable = false, length = 10)
    private YesNoNaValue drawingStatus;

    @Enumerated(EnumType.STRING)
    @Column(name = "test_sheet_status", nullable = false, length = 10)
    private YesNoNaValue testSheetStatus;

    @Enumerated(EnumType.STRING)
    @Column(name = "tag_status", nullable = false, length = 10)
    private YesNoNaValue tagStatus;

    @Enumerated(EnumType.STRING)
    @Column(name = "hmr_status", nullable = false, length = 10)
    private YesNoNaValue hmrStatus;

    @Column(length = 500)
    private String notes;

    @Column(name = "created_at", nullable = false)
    private LocalDateTime createdAt;

    @Column(name = "updated_at", nullable = false)
    private LocalDateTime updatedAt;

    @PrePersist
    public void onCreate() {
        LocalDateTime now = LocalDateTime.now();
        this.createdAt = now;
        this.updatedAt = now;
        if (this.drawingStatus == null) {
            this.drawingStatus = YesNoNaValue.NA;
        }
        if (this.testSheetStatus == null) {
            this.testSheetStatus = YesNoNaValue.NA;
        }
        if (this.tagStatus == null) {
            this.tagStatus = YesNoNaValue.NA;
        }
        if (this.hmrStatus == null) {
            this.hmrStatus = YesNoNaValue.NA;
        }
    }

    @PreUpdate
    public void onUpdate() {
        this.updatedAt = LocalDateTime.now();
    }
}
