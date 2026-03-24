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
import jakarta.persistence.Table;
import java.time.LocalDateTime;
import lombok.Getter;
import lombok.Setter;

@Getter
@Setter
@Entity
@Table(name = "workflow_events")
public class WorkflowEvent {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "sales_order_id", nullable = false)
    private SalesOrder salesOrder;

    @Enumerated(EnumType.STRING)
    @Column(name = "from_status", length = 50)
    private WorkflowStage fromStatus;

    @Enumerated(EnumType.STRING)
    @Column(name = "to_status", nullable = false, length = 50)
    private WorkflowStage toStatus;

    @Column(name = "actor_name", nullable = false, length = 120)
    private String actorName;

    @Column(name = "comment_text", length = 500)
    private String commentText;

    @Column(name = "created_at", nullable = false)
    private LocalDateTime createdAt;

    @PrePersist
    public void onCreate() {
        this.createdAt = LocalDateTime.now();
    }
}
