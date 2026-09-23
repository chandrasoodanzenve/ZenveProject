package com.zenvehughub.server.prescription;

import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/prescriptions")
public class PrescriptionController {

    private final PrescriptionService prescriptionService;

    public PrescriptionController(PrescriptionService prescriptionService) {
        this.prescriptionService = prescriptionService;
    }

    @GetMapping
    public List<PrescriptionResponse> getAll(@RequestParam(required = false) Long patientId) {
        return prescriptionService.findAll(patientId);
    }

    @GetMapping("/{id}")
    public PrescriptionResponse getOne(@PathVariable Long id) {
        return prescriptionService.getById(id);
    }

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    public PrescriptionResponse create(@Valid @RequestBody PrescriptionRequest request) {
        return prescriptionService.create(request);
    }

    @PutMapping("/{id}")
    public PrescriptionResponse update(@PathVariable Long id, @Valid @RequestBody PrescriptionRequest request) {
        return prescriptionService.update(id, request);
    }
}
