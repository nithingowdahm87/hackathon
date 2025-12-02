package com.priacc.alert.controller;

import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.client.RestTemplate;
import java.net.URI;
import java.util.List;
import java.util.Map;
import com.priacc.alert.model.Alert;
import com.priacc.alert.service.AlertService;

@RestController
@RequestMapping("/alerts")
public class AlertController {
    private final AlertService service;
    private final RestTemplate restTemplate;

    public AlertController(AlertService service, RestTemplate restTemplate) {
        this.service = service;
        this.restTemplate = restTemplate;
    }

    @PostMapping
    public ResponseEntity<Alert> create(
        @RequestBody Alert dto,
        @RequestHeader(value = "X-Username", required = false) String username
    ) {
        Long userId = resolveUserId(username);
        if (userId == null) {
            return ResponseEntity.status(401).build();
        }

        dto.setUserId(userId);
        Alert created = service.create(dto);
        return ResponseEntity.created(URI.create("/api/alerts/" + created.getId())).body(created);
    }
    
    @GetMapping
    public String test(@RequestHeader(value = "X-Username", required = false) String username) {
        return "Hello " + username + ", alerts data retrieved!";
    }

    @GetMapping("/list")
    public ResponseEntity<List<Alert>> list(@RequestHeader(value = "X-Username", required = false) String username) {
        Long userId = resolveUserId(username);
        if (userId == null) {
            return ResponseEntity.status(401).build();
        }

        return ResponseEntity.ok(service.list(userId));
    }

    @GetMapping("/{id}")
    public ResponseEntity<Alert> get(@PathVariable Long id) {
        return service.get(id).map(ResponseEntity::ok).orElse(ResponseEntity.notFound().build());
    }

    @PutMapping("/{id}")
    public ResponseEntity<Alert> update(
        @PathVariable Long id,
        @RequestBody Alert up,
        @RequestHeader(value = "X-Username", required = false) String username
    ) {
        Long userId = resolveUserId(username);
        if (userId == null) {
            return ResponseEntity.status(401).build();
        }

        up.setId(id);
        up.setUserId(userId);
        return ResponseEntity.ok(service.update(up));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> delete(@PathVariable Long id) {
        service.delete(id);
        return ResponseEntity.noContent().build();
    }

    private Long resolveUserId(String username) {
        if (username == null || username.isBlank()) {
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

            System.err.println("Failed to resolve userId for username: " + username);
        } catch (Exception e) {
            System.err.println("Failed to get userId from auth service: " + e.getMessage());
        }

        return null;
    }
}
