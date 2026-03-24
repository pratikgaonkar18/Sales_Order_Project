package com.turbocorp.orderworkflow.orders.api.dto;

import com.turbocorp.orderworkflow.orders.domain.WorkflowStage;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import lombok.Getter;
import lombok.Setter;

@Getter
@Setter
public class TransitionStageRequest {

    @NotNull
    private WorkflowStage toStatus;

    @NotBlank
    private String actorName;

    private String comment;
}
