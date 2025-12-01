package com.priacc.traffic.controller;

import com.priacc.traffic.model.Prediction;
import com.priacc.traffic.service.PredictionService;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

@RestController
@RequestMapping("/predictions")
public class PredictionController {

    private final PredictionService service;

    public PredictionController(PredictionService service) {
        this.service = service;
    }

    @PostMapping
    public ResponseEntity<?> receivePredictions(@RequestBody List<Map<String, Object>> predictionsData) {
        // Convert Map to Prediction entity
        List<Prediction> predictions = predictionsData.stream().map(data -> {
            Prediction p = new Prediction();
            p.setLatitude(Double.valueOf(data.get("latitude").toString()));
            p.setLongitude(Double.valueOf(data.get("longitude").toString()));
            p.setHour(Integer.valueOf(data.get("hour").toString()));
            p.setPredictedSpeed(Double.valueOf(data.get("predicted_speed").toString()));
            return p;
        }).collect(Collectors.toList());

        service.savePredictions(predictions);

        return ResponseEntity.ok(Map.of(
            "message", "Predictions received and saved successfully",
            "count", predictions.size()
        ));
    }

    @GetMapping
    public ResponseEntity<List<Prediction>> getPredictions(@RequestHeader(value = "X-Username", required = false) String username) {
        return ResponseEntity.ok(service.getAllPredictions());
    }
}
