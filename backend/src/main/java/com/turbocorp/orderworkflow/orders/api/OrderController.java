package com.turbocorp.orderworkflow.orders.api;

import com.turbocorp.orderworkflow.orders.api.dto.CreateOrderRequest;
import com.turbocorp.orderworkflow.orders.api.dto.DashboardOrderResponse;
import com.turbocorp.orderworkflow.orders.api.dto.OrderSummaryResponse;
import com.turbocorp.orderworkflow.orders.api.dto.TransitionStageRequest;
import com.turbocorp.orderworkflow.orders.api.dto.search.OrderSearchResponse;
import com.turbocorp.orderworkflow.orders.service.OrderService;
import jakarta.validation.Valid;
import java.util.List;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/orders")
@RequiredArgsConstructor
public class OrderController {

    private final OrderService orderService;

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    public OrderSummaryResponse createOrder(@Valid @RequestBody CreateOrderRequest request) {
        return orderService.createOrder(request);
    }

    @GetMapping
    public List<DashboardOrderResponse> listOrders(
            @RequestParam(defaultValue = "false") boolean openOnly
    ) {
        return orderService.getDashboard(openOnly);
    }

    @GetMapping("/{orderId:\\d+}")
    public OrderSummaryResponse getById(@PathVariable Long orderId) {
        return orderService.getOrderById(orderId);
    }

    @PostMapping("/{orderId:\\d+}/stage")
    public OrderSummaryResponse transitionStage(
            @PathVariable Long orderId,
            @Valid @RequestBody TransitionStageRequest request
    ) {
        return orderService.transitionStage(orderId, request);
    }

    @GetMapping("/dashboard")
    public List<DashboardOrderResponse> getDashboard(
            @RequestParam(defaultValue = "true") boolean openOnly
    ) {
        return orderService.getDashboard(openOnly);
    }

    @GetMapping("/search")
    public List<OrderSearchResponse> searchOrders(
            @RequestParam(required = false) String customerName,
            @RequestParam(required = false) String partNumber,
            @RequestParam(required = false) String salesOrderNo,
            @RequestParam(required = false) String referenceSerial
    ) {
        return orderService.searchOrders(customerName, partNumber, salesOrderNo, referenceSerial);
    }

    @GetMapping("/search/customer")
    public List<OrderSearchResponse> searchByCustomer(@RequestParam String value) {
        return orderService.searchByCustomer(value);
    }

    @GetMapping("/search/part-number")
    public List<OrderSearchResponse> searchByPartNumber(@RequestParam String value) {
        return orderService.searchByPartNumber(value);
    }

    @GetMapping("/search/sales-order")
    public List<OrderSearchResponse> searchBySalesOrder(@RequestParam String value) {
        return orderService.searchBySalesOrder(value);
    }

    @GetMapping("/search/reference-serial")
    public List<OrderSearchResponse> searchByReferenceSerial(@RequestParam String value) {
        return orderService.searchByReferenceSerial(value);
    }
}
