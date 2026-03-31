package com.turbocorp.orderworkflow.orders.domain;

import jakarta.persistence.CascadeType;
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
import jakarta.persistence.OneToMany;
import jakarta.persistence.PrePersist;
import jakarta.persistence.PreUpdate;
import jakarta.persistence.Table;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;
import lombok.Getter;
import lombok.Setter;

@Getter
@Setter
@Entity
@Table(name = "sales_orders")
public class SalesOrder {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "sales_order_no", nullable = false, unique = true, length = 30)
    private String salesOrderNo;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 10)
    private DivisionType division;

    @Column(name = "customer_name", nullable = false, length = 160)
    private String customerName;

    @Column(name = "customer_po", length = 80)
    private String customerPo;

    @Column(name = "submittal_date")
    private LocalDate submittalDate;

    @Column(name = "ship_date")
    private LocalDate shipDate;

    @Column(name = "project_name", length = 160)
    private String projectName;

    @Column(name = "assigned_engineer", length = 120)
    private String assignedEngineer;

    @Column(name = "reference_serial_number", length = 20)
    private String referenceSerialNumber;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "previous_order_id")
    private SalesOrder previousOrder;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 50)
    private WorkflowStage status;

    @Enumerated(EnumType.STRING)
    @Column(name = "current_owner_role", nullable = false, length = 30)
    private OwnerRole currentOwnerRole;

    @Column(name = "stage_updated_at", nullable = false)
    private LocalDateTime stageUpdatedAt;

    @Column(name = "created_at", nullable = false)
    private LocalDateTime createdAt;

    @Column(name = "updated_at", nullable = false)
    private LocalDateTime updatedAt;

    @Column(name = "is_deleted", nullable = false)
    private boolean isDeleted = false;

    @Column(name = "deleted_at")
    private LocalDateTime deletedAt;

    @Column(name = "deleted_by", length = 100)
    private String deletedBy;

    @OneToMany(mappedBy = "salesOrder", cascade = CascadeType.ALL, orphanRemoval = true)
    private List<OrderLine> lines = new ArrayList<>();

    public void addLine(OrderLine line) {
        line.setSalesOrder(this);
        this.lines.add(line);
    }

    @PrePersist
    public void onCreate() {
        LocalDateTime now = LocalDateTime.now();
        this.createdAt = now;
        this.updatedAt = now;
        if (this.stageUpdatedAt == null) {
            this.stageUpdatedAt = now;
        }
    }

    @PreUpdate
    public void onUpdate() {
        this.updatedAt = LocalDateTime.now();
    }
}
