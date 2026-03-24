package com.turbocorp.orderworkflow.orders.api.dto;

import com.turbocorp.orderworkflow.orders.domain.DivisionType;
import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotEmpty;
import jakarta.validation.constraints.NotNull;
import java.time.LocalDate;
import java.util.List;
import lombok.Getter;
import lombok.Setter;

@Getter
@Setter
public class CreateOrderRequest {

    @NotBlank
    private String salesOrderNo;

    @NotNull
    private DivisionType division;

    @NotBlank
    private String customerName;

    private String customerPo;

    private LocalDate submittalDate;

    private LocalDate shipDate;

    private String projectName;

    private String assignedEngineer;

    private String referenceSerialNumber;

    @Valid
    @NotEmpty
    private List<CreateOrderLineRequest> lines;
}
