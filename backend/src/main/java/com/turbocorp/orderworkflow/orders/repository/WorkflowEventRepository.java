package com.turbocorp.orderworkflow.orders.repository;

import com.turbocorp.orderworkflow.orders.domain.WorkflowEvent;
import org.springframework.data.jpa.repository.JpaRepository;

public interface WorkflowEventRepository extends JpaRepository<WorkflowEvent, Long> {
}
