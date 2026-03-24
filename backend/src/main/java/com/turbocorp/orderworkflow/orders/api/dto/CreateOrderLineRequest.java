package com.turbocorp.orderworkflow.orders.api.dto;

import com.turbocorp.orderworkflow.orders.domain.PnRevVerification;
import com.turbocorp.orderworkflow.orders.domain.YesNoNaValue;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Positive;
import lombok.Getter;
import lombok.Setter;

@Getter
@Setter
public class CreateOrderLineRequest {

    @NotBlank
    private String itemNo;

    private String description;

    @NotNull
    @Positive
    private Integer quantity;

    private String material;

    private String partNumber;

    private String revision;

    private Boolean revisionDefaultInSystem;

    private PnRevVerification pnRevVerification;

    private String newSerialNumber;

    private String referenceSerialNumber;

    private String lineStatus;

    private YesNoNaValue drawingStatus;

    private YesNoNaValue testSheetStatus;

    private YesNoNaValue tagStatus;

    private YesNoNaValue hmrStatus;

    private String notes;
}
