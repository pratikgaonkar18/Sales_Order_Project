package com.turbocorp.orderworkflow.orders.api.dto;

import com.turbocorp.orderworkflow.orders.domain.OwnerRole;
import com.turbocorp.orderworkflow.orders.domain.ProductionOrderStatus;
import com.turbocorp.orderworkflow.orders.domain.WorkflowStage;

public record DashboardOrderResponse(
        Long id,
        String salesOrderNo,
        String customerName,
        WorkflowStage stage,
        OwnerRole owner,
        long daysWaiting,
        ProductionOrderStatus orderStatus,
        boolean isDeleted
) {
}
