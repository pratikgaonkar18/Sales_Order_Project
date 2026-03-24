package com.turbocorp.orderworkflow.orders.api.dto;

import com.turbocorp.orderworkflow.orders.domain.DivisionType;
import com.turbocorp.orderworkflow.orders.domain.OwnerRole;
import com.turbocorp.orderworkflow.orders.domain.WorkflowStage;

public record OrderSummaryResponse(
        Long id,
        String salesOrderNo,
        DivisionType division,
        String customerName,
        WorkflowStage status,
        OwnerRole currentOwnerRole,
        Long previousOrderId
) {
}
