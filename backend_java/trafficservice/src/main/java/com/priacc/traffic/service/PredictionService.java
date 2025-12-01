package com.priacc.traffic.service;

import com.priacc.traffic.model.Prediction;
import com.priacc.traffic.repo.PredictionRepository;
import org.springframework.stereotype.Service;

import java.util.List;

@Service
public class PredictionService {

    private final PredictionRepository repository;

    public PredictionService(PredictionRepository repository) {
        this.repository = repository;
    }

    public void savePredictions(List<Prediction> predictions) {
        repository.saveAll(predictions);
    }

    public List<Prediction> getAllPredictions() {
        return repository.findAll();
    }
}
