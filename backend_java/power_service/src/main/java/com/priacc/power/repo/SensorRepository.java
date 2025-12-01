package com.priacc.power.repo;

import org.springframework.data.jpa.repository.JpaRepository;
import com.priacc.power.model.Sensor;
import java.util.List;

public interface SensorRepository extends JpaRepository<Sensor, Long> {
    List<Sensor> findByUserId(Long userId);
}
