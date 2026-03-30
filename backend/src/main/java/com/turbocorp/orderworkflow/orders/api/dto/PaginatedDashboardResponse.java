package com.turbocorp.orderworkflow.orders.api.dto;

import java.util.List;

public record PaginatedDashboardResponse(
        List<DashboardOrderResponse> content,
        long totalElements,
        int totalPages,
        int currentPage,
        int pageSize
) {
}
