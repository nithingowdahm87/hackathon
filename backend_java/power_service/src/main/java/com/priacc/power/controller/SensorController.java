package com.priacc.power.controller;

import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.client.RestTemplate;
import org.springframework.beans.factory.annotation.Autowired;
import java.net.URI;
import java.util.List;
import java.util.Map;
import com.priacc.power.model.Sensor;
import com.priacc.power.service.SensorService;

@RestController
@RequestMapping("/sensors")
public class SensorController {

    private final SensorService service;
    
    @Autowired
    private RestTemplate restTemplate;
    
    public SensorController(SensorService service) { this.service = service; }

    // ✅ Test endpoint
    @GetMapping
    public String test(@RequestHeader(value = "X-Username", required = false) String username) {
        return "Hello " + username + ", sensors data retrieved!";
    }

    @PostMapping
    public ResponseEntity<Sensor> create(
            @RequestHeader(value = "X-Username", required = false) String username,
            @RequestBody Sensor dto) {

        Long userId = resolveUserId(username);
        if (userId == null) {
            return ResponseEntity.status(401).build();
        }

        dto.setUserId(userId);
        dto.setLastUpdated(java.time.Instant.now());
        Sensor created = service.create(dto);
        return ResponseEntity.created(URI.create("/api/sensors/" + created.getId())).body(created);
    }

    @GetMapping("/list")
    public ResponseEntity<List<Sensor>> list(@RequestHeader(value = "X-Username", required = false) String username) {
        if (username == null) {
            System.err.println("X-Username header missing");
            return ResponseEntity.status(401).build();
        }

        Long userId = resolveUserId(username);
        if (userId == null) {
             return ResponseEntity.status(401).build();
        }

        return ResponseEntity.ok(service.list(userId));
    }

    private Long resolveUserId(String username) {
        if (username == null) {
            System.err.println("X-Username header missing");
            return null;
        }

        try {
            ResponseEntity<Map> response = restTemplate.getForEntity(
                    "http://auth-service:8090/auth/user-id?username=" + username,
                    Map.class
            );
            if (response.getBody() != null && response.getBody().containsKey("userId")) {
                return Long.valueOf(response.getBody().get("userId").toString());
            }
        } catch (Exception e) {
            System.err.println("Failed to get userId from auth service: " + e.getMessage());
        }
        return null;
    }

    @GetMapping("/{id}")
    public ResponseEntity<Sensor> get(@PathVariable Long id) {
        return service.get(id).map(ResponseEntity::ok).orElse(ResponseEntity.notFound().build());
    }

    @PutMapping("/{id}")
    public ResponseEntity<Sensor> update(@PathVariable Long id, @RequestBody Sensor up) {
        up.setId(id);
        return ResponseEntity.ok(service.update(up));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> delete(@PathVariable Long id) {
        service.delete(id);
        return ResponseEntity.noContent().build();
    }
}
