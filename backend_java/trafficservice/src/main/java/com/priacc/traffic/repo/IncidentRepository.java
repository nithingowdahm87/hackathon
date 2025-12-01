package com.priacc.traffic.repo;

import org.springframework.data.jpa.repository.JpaRepository;
import com.priacc.traffic.model.Incident;
import java.util.List;

public interface IncidentRepository extends JpaRepository<Incident, Long> {
    List<Incident> findByUserId(Long userId);
}
