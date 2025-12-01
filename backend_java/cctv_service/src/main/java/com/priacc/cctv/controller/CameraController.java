package com.priacc.cctv.controller;

import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.client.RestTemplate;
import org.springframework.beans.factory.annotation.Autowired;
import java.net.URI;
import java.util.List;
import java.util.Map;
import com.priacc.cctv.model.Camera;
import com.priacc.cctv.service.CameraService;

@RestController
@RequestMapping("/cameras")
public class CameraController {
    private final CameraService service;
    
    @Autowired
    private RestTemplate restTemplate;
    
    public CameraController(CameraService service) { this.service = service; }

    @PostMapping
    public ResponseEntity<Camera> create(@RequestBody Camera dto) {
        Camera created = service.create(dto);
        return ResponseEntity.created(URI.create("/api/cameras/" + created.getId())).body(created);
    }
    
    @GetMapping
    public String test(@RequestHeader(value = "X-Username", required = false) String username) {
        return "Hello " + username + ", cameras data retrieved!";
    }

    @GetMapping("/list")
    public ResponseEntity<List<Camera>> list(@RequestHeader(value = "X-Username", required = false) String username) {
        if (username == null) {
            System.err.println("X-Username header missing");
            return ResponseEntity.status(401).build();
        }

        Long userId = null;
        try {
            ResponseEntity<Map> response = restTemplate.getForEntity(
                "http://auth-service:8090/auth/user-id?username=" + username, 
                Map.class
            );
            if (response.getBody() != null && response.getBody().containsKey("userId")) {
                userId = Long.valueOf(response.getBody().get("userId").toString());
            }
        } catch (Exception e) {
            System.err.println("Failed to get userId from auth service: " + e.getMessage());
            return ResponseEntity.status(401).build(); // Fail closed
        }

        if (userId == null) {
             return ResponseEntity.status(401).build();
        }

        return ResponseEntity.ok(service.list(userId));
    }

    @GetMapping("/{id}")
    public ResponseEntity<Camera> get(@PathVariable Long id) {
        return service.get(id).map(ResponseEntity::ok).orElse(ResponseEntity.notFound().build());
    }

    @PutMapping("/{id}")
    public ResponseEntity<Camera> update(@PathVariable Long id, @RequestBody Camera up) {
        up.setId(id);
        return ResponseEntity.ok(service.update(up));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> delete(@PathVariable Long id) {
        service.delete(id);
        return ResponseEntity.noContent().build();
    }
}
