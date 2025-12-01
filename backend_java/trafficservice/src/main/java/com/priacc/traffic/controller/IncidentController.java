package com.priacc.traffic.controller;

import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.client.RestTemplate;
import org.springframework.beans.factory.annotation.Autowired;
import java.net.URI;
import java.util.List;
import java.util.Map;
import com.priacc.traffic.model.Incident;
import com.priacc.traffic.service.IncidentService;

@RestController
@RequestMapping("/incidents")
public class IncidentController {
    private final IncidentService service;
    
    @Autowired
    private RestTemplate restTemplate;
    
    public IncidentController(IncidentService service) { this.service = service; }

    @PostMapping
    public ResponseEntity<Incident> create(@RequestBody Incident dto) {
        Incident created = service.create(dto);
        return ResponseEntity.created(URI.create("/api/incidents/" + created.getId())).body(created);
    }
    
    @GetMapping
    public String test(@RequestHeader(value = "X-Username", required = false) String username) {
        return "Hello " + username + ", incidents data retrieved!";
    }

    @GetMapping("/list")
    public ResponseEntity<List<Incident>> list(@RequestHeader(value = "X-Username", required = false) String username) {
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
    public ResponseEntity<Incident> get(@PathVariable Long id) {
        return service.get(id).map(ResponseEntity::ok).orElse(ResponseEntity.notFound().build());
    }

    @PutMapping("/{id}")
    public ResponseEntity<Incident> update(@PathVariable Long id, @RequestBody Incident up) {
        up.setId(id);
        return ResponseEntity.ok(service.update(up));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> delete(@PathVariable Long id) {
        service.delete(id);
        return ResponseEntity.noContent().build();
    }
}
