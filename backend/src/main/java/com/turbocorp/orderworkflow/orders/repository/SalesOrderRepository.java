package com.turbocorp.orderworkflow.orders.repository;

import com.turbocorp.orderworkflow.orders.domain.SalesOrder;
import java.util.List;
import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface SalesOrderRepository extends JpaRepository<SalesOrder, Long> {

    Optional<SalesOrder> findBySalesOrderNo(String salesOrderNo);

    boolean existsBySalesOrderNo(String salesOrderNo);

    List<SalesOrder> findAllByOrderByStageUpdatedAtAsc();

        @Query("""
            select distinct o
            from SalesOrder o
            left join o.lines l
            where (:customerName is null or lower(o.customerName) like lower(concat('%', :customerName, '%')))
              and (:partNumber is null or lower(l.partNumber) like lower(concat('%', :partNumber, '%')))
              and (:salesOrderNo is null or lower(o.salesOrderNo) like lower(concat('%', :salesOrderNo, '%')))
              and (:referenceSerial is null or lower(o.referenceSerialNumber) like lower(concat('%', :referenceSerial, '%')))
            order by o.stageUpdatedAt desc
            """)
        List<SalesOrder> searchOrders(
            @Param("customerName") String customerName,
            @Param("partNumber") String partNumber,
            @Param("salesOrderNo") String salesOrderNo,
            @Param("referenceSerial") String referenceSerial
        );
}
