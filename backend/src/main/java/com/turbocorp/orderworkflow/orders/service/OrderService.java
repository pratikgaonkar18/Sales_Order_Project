package com.turbocorp.orderworkflow.orders.service;

import com.turbocorp.orderworkflow.common.NotFoundException;
import com.turbocorp.orderworkflow.orders.api.dto.CreateOrderLineRequest;
import com.turbocorp.orderworkflow.orders.api.dto.CreateOrderRequest;
import com.turbocorp.orderworkflow.orders.api.dto.DashboardOrderResponse;
import com.turbocorp.orderworkflow.orders.api.dto.OrderSummaryResponse;
import com.turbocorp.orderworkflow.orders.api.dto.TransitionStageRequest;
import com.turbocorp.orderworkflow.orders.api.dto.search.OrderSearchResponse;
import com.turbocorp.orderworkflow.orders.domain.DivisionType;
import com.turbocorp.orderworkflow.orders.domain.OrderLine;
import com.turbocorp.orderworkflow.orders.domain.OwnerRole;
import com.turbocorp.orderworkflow.orders.domain.PnRevVerification;
import com.turbocorp.orderworkflow.orders.domain.ProductionOrderStatus;
import com.turbocorp.orderworkflow.orders.domain.SalesOrder;
import com.turbocorp.orderworkflow.orders.domain.WorkflowEvent;
import com.turbocorp.orderworkflow.orders.domain.WorkflowStage;
import com.turbocorp.orderworkflow.orders.domain.YesNoNaValue;
import com.turbocorp.orderworkflow.orders.repository.SalesOrderRepository;
import com.turbocorp.orderworkflow.orders.repository.WorkflowEventRepository;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.temporal.ChronoUnit;
import java.util.EnumMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Set;
import java.util.regex.Matcher;
import java.util.regex.Pattern;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
public class OrderService {

    private static final Pattern REFERENCE_SERIAL_PATTERN = Pattern.compile("^(\\d{6})-\\d{4}$");

    private static final Map<WorkflowStage, Set<WorkflowStage>> ALLOWED_TRANSITIONS = new EnumMap<>(WorkflowStage.class);

    static {
        ALLOWED_TRANSITIONS.put(WorkflowStage.DRAFT, Set.of(WorkflowStage.SUBMITTED_TO_ENGINEERING, WorkflowStage.CANCELLED));
        ALLOWED_TRANSITIONS.put(
                WorkflowStage.SUBMITTED_TO_ENGINEERING,
                Set.of(WorkflowStage.ENGINEERING_REVIEW_IN_PROGRESS, WorkflowStage.CANCELLED)
        );
        ALLOWED_TRANSITIONS.put(
                WorkflowStage.ENGINEERING_REVIEW_IN_PROGRESS,
                Set.of(
                        WorkflowStage.CLARIFICATION_NEEDED,
                        WorkflowStage.ENGINEERING_APPROVED,
                        WorkflowStage.CANCELLED
                )
        );
        ALLOWED_TRANSITIONS.put(
                WorkflowStage.CLARIFICATION_NEEDED,
                Set.of(WorkflowStage.SUBMITTED_TO_ENGINEERING, WorkflowStage.CANCELLED)
        );
        ALLOWED_TRANSITIONS.put(
                WorkflowStage.ENGINEERING_APPROVED,
                Set.of(WorkflowStage.READY_FOR_PRODUCTION_RELEASE, WorkflowStage.CANCELLED)
        );
        ALLOWED_TRANSITIONS.put(
                WorkflowStage.READY_FOR_PRODUCTION_RELEASE,
                Set.of(WorkflowStage.RELEASED_TO_PRODUCTION, WorkflowStage.CANCELLED)
        );
        ALLOWED_TRANSITIONS.put(
                WorkflowStage.RELEASED_TO_PRODUCTION,
            Set.of()
        );
        ALLOWED_TRANSITIONS.put(WorkflowStage.CLOSED, Set.of());
        ALLOWED_TRANSITIONS.put(WorkflowStage.CANCELLED, Set.of());
    }

    private final SalesOrderRepository salesOrderRepository;
    private final WorkflowEventRepository workflowEventRepository;

    @Transactional
    public OrderSummaryResponse createOrder(CreateOrderRequest request) {
        String normalizedSalesOrderNo = normalizeSalesOrderNo(request.getSalesOrderNo());
        if (salesOrderRepository.existsBySalesOrderNo(normalizedSalesOrderNo)) {
            throw new IllegalArgumentException("Sales order already exists: " + normalizedSalesOrderNo);
        }

        validateReferenceSerial(request.getDivision(), request.getReferenceSerialNumber());

        SalesOrder order = new SalesOrder();
        order.setSalesOrderNo(normalizedSalesOrderNo);
        order.setDivision(request.getDivision());
        order.setCustomerName(request.getCustomerName().trim());
        order.setCustomerPo(trimToNull(request.getCustomerPo()));
        order.setSubmittalDate(request.getSubmittalDate() != null ? request.getSubmittalDate() : LocalDate.now());
        order.setShipDate(request.getShipDate());
        order.setProjectName(trimToNull(request.getProjectName()));
        order.setAssignedEngineer(trimToNull(request.getAssignedEngineer()));
        order.setReferenceSerialNumber(trimToNull(request.getReferenceSerialNumber()));
        order.setStatus(WorkflowStage.DRAFT);
        order.setCurrentOwnerRole(OwnerRole.PM);
        order.setStageUpdatedAt(LocalDateTime.now());

        SalesOrder previousOrder = resolvePreviousOrder(request.getReferenceSerialNumber());
        order.setPreviousOrder(previousOrder);

        for (CreateOrderLineRequest lineRequest : request.getLines()) {
            OrderLine line = new OrderLine();
            line.setItemNo(lineRequest.getItemNo().trim());
            line.setDescription(trimToNull(lineRequest.getDescription()));
            line.setQuantity(lineRequest.getQuantity());
            line.setMaterial(trimToNull(lineRequest.getMaterial()));
            line.setPartNumber(trimToNull(lineRequest.getPartNumber()));
            line.setRevision(trimToNull(lineRequest.getRevision()));
            line.setRevisionDefaultInSystem(lineRequest.getRevisionDefaultInSystem());
            line.setPnRevVerification(lineRequest.getPnRevVerification());
            line.setNewSerialNumber(trimToNull(lineRequest.getNewSerialNumber()));
            line.setReferenceSerialNumber(trimToNull(lineRequest.getReferenceSerialNumber()));
            line.setLineStatus(trimToNull(lineRequest.getLineStatus()));
            line.setDrawingStatus(defaultYesNoNa(lineRequest.getDrawingStatus()));
            line.setTestSheetStatus(defaultYesNoNa(lineRequest.getTestSheetStatus()));
            line.setTagStatus(defaultYesNoNa(lineRequest.getTagStatus()));
            line.setHmrStatus(defaultYesNoNa(lineRequest.getHmrStatus()));
            line.setNotes(trimToNull(lineRequest.getNotes()));
            order.addLine(line);
        }

        SalesOrder saved = salesOrderRepository.save(order);
        saveWorkflowEvent(saved, null, WorkflowStage.DRAFT, "SYSTEM", "Order created");
        return toSummary(saved);
    }

    @Transactional
    public OrderSummaryResponse transitionStage(Long orderId, TransitionStageRequest request) {
        SalesOrder order = salesOrderRepository.findById(orderId)
                .orElseThrow(() -> new NotFoundException("Order not found: " + orderId));

        WorkflowStage fromStage = order.getStatus();
        WorkflowStage toStage = request.getToStatus();
        validateTransition(fromStage, toStage);

        order.setStatus(toStage);
        order.setCurrentOwnerRole(ownerForStage(toStage));
        order.setStageUpdatedAt(LocalDateTime.now());

        SalesOrder saved = salesOrderRepository.save(order);
        saveWorkflowEvent(saved, fromStage, toStage, request.getActorName().trim(), trimToNull(request.getComment()));
        return toSummary(saved);
    }

    @Transactional(readOnly = true)
    public OrderSummaryResponse getOrderById(Long orderId) {
        SalesOrder order = salesOrderRepository.findById(orderId)
                .orElseThrow(() -> new NotFoundException("Order not found: " + orderId));
        return toSummary(order);
    }

    @Transactional
    public void softDelete(Long orderId, String deletedBy) {
        SalesOrder order = salesOrderRepository.findById(orderId)
                .orElseThrow(() -> new NotFoundException("Order not found: " + orderId));

        if (order.isDeleted()) {
            return;
        }

        order.setDeleted(true);
        order.setDeletedAt(LocalDateTime.now());
        order.setDeletedBy(trimToNull(deletedBy));
        salesOrderRepository.save(order);
    }

    @Transactional(readOnly = true)
    public Page<DashboardOrderResponse> getDashboard(boolean openOnly, boolean includeArchived, Pageable pageable) {
       return salesOrderRepository.findDashboardOrders(openOnly, includeArchived, pageable)
    .map(order -> new DashboardOrderResponse(
        order.getId(),
        order.getSalesOrderNo(),
        order.getCustomerName(),
        order.getStatus(),
        order.getCurrentOwnerRole(),
        calculateDaysWaiting(order.getStageUpdatedAt()),
        evaluateOrderStatus(order),
        order.isDeleted()
    ));
    }

    @Transactional(readOnly = true)
    public List<OrderSearchResponse> searchOrders(
            boolean includeArchived,
            String customerName,
            String partNumber,
            String salesOrderNo,
            String referenceSerial
    ) {
        return salesOrderRepository.searchOrders(
                includeArchived,
                        trimToNull(customerName),
                        trimToNull(partNumber),
                        trimToNull(salesOrderNo),
                        trimToNull(referenceSerial)
                ).stream()
                .map(this::toSearchResponse)
                .toList();
    }

    @Transactional(readOnly = true)
    public List<OrderSearchResponse> searchByCustomer(String customerName) {
        return searchOrders(false, customerName, null, null, null);
    }

    @Transactional(readOnly = true)
    public List<OrderSearchResponse> searchByPartNumber(String partNumber) {
        return searchOrders(false, null, partNumber, null, null);
    }

    @Transactional(readOnly = true)
    public List<OrderSearchResponse> searchBySalesOrder(String salesOrderNo) {
        return searchOrders(false, null, null, salesOrderNo, null);
    }

    @Transactional(readOnly = true)
    public List<OrderSearchResponse> searchByReferenceSerial(String referenceSerial) {
        return searchOrders(false, null, null, null, referenceSerial);
    }

    @Transactional
    public void restore(Long orderId) {
        SalesOrder order = salesOrderRepository.findById(orderId)
                .orElseThrow(() -> new NotFoundException("Order not found: " + orderId));

        if (!order.isDeleted()) {
            return;
        }

        order.setDeleted(false);
        order.setDeletedAt(null);
        order.setDeletedBy(null);
        salesOrderRepository.save(order);
    }

    private long calculateDaysWaiting(LocalDateTime stageUpdatedAt) {
        if (stageUpdatedAt == null) {
            return 0;
        }
        long days = ChronoUnit.DAYS.between(stageUpdatedAt.toLocalDate(), LocalDate.now());
        return Math.max(days, 0);
    }

    private void validateReferenceSerial(DivisionType division, String referenceSerialNumber) {
        String value = trimToNull(referenceSerialNumber);
        if (division == DivisionType.AM && value == null) {
            throw new IllegalArgumentException("Reference serial number is required for AM orders");
        }
    }

    private SalesOrder resolvePreviousOrder(String referenceSerialNumber) {
        String value = trimToNull(referenceSerialNumber);
        if (value == null) {
            return null;
        }
        Matcher matcher = REFERENCE_SERIAL_PATTERN.matcher(value);
        if (!matcher.matches()) {
            return null;
        }
        String previousSalesOrderNo = "SO-" + matcher.group(1);
        return salesOrderRepository.findBySalesOrderNo(previousSalesOrderNo).orElse(null);
    }

    private void validateTransition(WorkflowStage fromStage, WorkflowStage toStage) {
        Set<WorkflowStage> allowedNextStages = ALLOWED_TRANSITIONS.getOrDefault(fromStage, Set.of());
        if (!allowedNextStages.contains(toStage)) {
            throw new IllegalArgumentException("Transition not allowed from " + fromStage + " to " + toStage);
        }
    }

    private OwnerRole ownerForStage(WorkflowStage stage) {
        return switch (stage) {
            case DRAFT, CLARIFICATION_NEEDED, ENGINEERING_APPROVED,
                 READY_FOR_PRODUCTION_RELEASE, RELEASED_TO_PRODUCTION -> OwnerRole.PM;
            case SUBMITTED_TO_ENGINEERING, ENGINEERING_REVIEW_IN_PROGRESS -> OwnerRole.ENGINEERING;
            case CLOSED, CANCELLED -> OwnerRole.SYSTEM;
        };
    }

    private void saveWorkflowEvent(
            SalesOrder order,
            WorkflowStage fromStatus,
            WorkflowStage toStatus,
            String actorName,
            String comment
    ) {
        WorkflowEvent event = new WorkflowEvent();
        event.setSalesOrder(order);
        event.setFromStatus(fromStatus);
        event.setToStatus(toStatus);
        event.setActorName(actorName);
        event.setCommentText(comment);
        workflowEventRepository.save(event);
    }

    private String normalizeSalesOrderNo(String input) {
        if (input == null || input.isBlank()) {
            throw new IllegalArgumentException("Sales order number is required");
        }
        String value = input.trim().toUpperCase(Locale.ROOT);
        if (value.startsWith("SO-")) {
            return value;
        }
        if (value.matches("\\d+")) {
            int minLength = 6;
            if (value.length() < minLength) {
                value = "0".repeat(minLength - value.length()) + value;
            }
            return "SO-" + value;
        }
        return "SO-" + value;
    }

    private String trimToNull(String value) {
        if (value == null) {
            return null;
        }
        String trimmed = value.trim();
        return trimmed.isEmpty() ? null : trimmed;
    }

    private OrderSummaryResponse toSummary(SalesOrder order) {
        Long previousOrderId = order.getPreviousOrder() != null ? order.getPreviousOrder().getId() : null;
        return new OrderSummaryResponse(
                order.getId(),
                order.getSalesOrderNo(),
                order.getDivision(),
                order.getCustomerName(),
                order.getStatus(),
                order.getCurrentOwnerRole(),
                previousOrderId
        );
    }

    private OrderSearchResponse toSearchResponse(SalesOrder order) {
        return new OrderSearchResponse(
                order.getId(),
                order.getSalesOrderNo(),
                order.getCustomerName(),
                order.getDivision(),
                order.getStatus(),
                order.getCurrentOwnerRole(),
                evaluateOrderStatus(order),
                resolveReferenceSerialNumber(order),
                order.getStageUpdatedAt(),
                order.isDeleted()
        );
    }

    private String resolveReferenceSerialNumber(SalesOrder order) {
        String orderReference = trimToNull(order.getReferenceSerialNumber());
        if (orderReference != null) {
            return orderReference;
        }

        List<OrderLine> lines = order.getLines();
        if (lines == null || lines.isEmpty()) {
            return null;
        }

        return lines.stream()
                .map(OrderLine::getReferenceSerialNumber)
                .map(this::trimToNull)
                .filter(value -> value != null)
                .findFirst()
                .orElse(null);
    }

    private ProductionOrderStatus evaluateOrderStatus(SalesOrder order) {
        List<OrderLine> lines = order.getLines();
        if (lines == null || lines.isEmpty()) {
            return ProductionOrderStatus.OPEN;
        }

        boolean allClosedReady = order.getStatus() == WorkflowStage.RELEASED_TO_PRODUCTION
                && lines.stream().allMatch(this::isClosedReadyLine);
        if (allClosedReady) {
            return ProductionOrderStatus.CLOSED;
        }

        boolean anyProductionAllowedCase = lines.stream().anyMatch(line ->
                isPnVerifiedYes(line) && (isNo(line.getTestSheetStatus()) || isNo(line.getTagStatus()) || isNo(line.getHmrStatus()))
        );
        if (anyProductionAllowedCase) {
            return ProductionOrderStatus.PRODUCTION_ALLOWED;
        }

        boolean anyOpenCase = lines.stream().anyMatch(line ->
                isPnVerifiedNo(line) || isNo(line.getTestSheetStatus()) || isNo(line.getTagStatus()) || isNo(line.getHmrStatus())
        );
        if (anyOpenCase) {
            return ProductionOrderStatus.OPEN;
        }

        return ProductionOrderStatus.OPEN;
    }

    private boolean isClosedReadyLine(OrderLine line) {
        return isPnVerifiedYes(line)
                && isYes(line.getTestSheetStatus())
                && isYes(line.getTagStatus())
                && isYes(line.getHmrStatus());
    }

    private boolean isPnVerifiedYes(OrderLine line) {
        return line.getPnRevVerification() == PnRevVerification.CORRECT;
    }

    private boolean isPnVerifiedNo(OrderLine line) {
        return line.getPnRevVerification() == PnRevVerification.INCORRECT;
    }

    private boolean isYes(YesNoNaValue value) {
        return value == YesNoNaValue.YES;
    }

    private boolean isNo(YesNoNaValue value) {
        return value == YesNoNaValue.NO;
    }

    private YesNoNaValue defaultYesNoNa(YesNoNaValue value) {
        return value != null ? value : YesNoNaValue.NA;
    }
}
