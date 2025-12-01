package com.priacc.alert.repo;

import org.springframework.data.jpa.repository.JpaRepository;
import com.priacc.alert.model.Alert;
import java.util.List;
public interface AlertRepository extends JpaRepository<Alert, Long> {
    List<Alert> findByUserId(Long userId);
}
