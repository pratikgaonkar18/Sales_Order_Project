package com.turbocorp.orderworkflow.orders.api.dto.search;

import com.turbocorp.orderworkflow.orders.domain.DivisionType;
import com.turbocorp.orderworkflow.orders.domain.OwnerRole;
import com.turbocorp.orderworkflow.orders.domain.ProductionOrderStatus;
import com.turbocorp.orderworkflow.orders.domain.WorkflowStage;
import java.time.LocalDateTime;

public record OrderSearchResponse(
        Long id,
        String salesOrderNo,
        String customerName,
        DivisionType division,
        WorkflowStage status,
        OwnerRole currentOwnerRole,
        ProductionOrderStatus orderStatus,
        String referenceSerialNumber,
        LocalDateTime stageUpdatedAt,
        boolean isDeleted
) {
}
