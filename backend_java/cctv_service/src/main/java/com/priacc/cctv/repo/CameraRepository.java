package com.priacc.cctv.repo;

import org.springframework.data.jpa.repository.JpaRepository;
import com.priacc.cctv.model.Camera;
import java.util.List;

public interface CameraRepository extends JpaRepository<Camera, Long> {
    List<Camera> findByUserId(Long userId);
}

