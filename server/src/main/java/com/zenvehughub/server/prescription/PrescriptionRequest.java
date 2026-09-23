package com.zenvehughub.server.prescription;

import jakarta.validation.constraints.NotNull;

import java.time.LocalDate;

public record PrescriptionRequest(
        @NotNull Long patientId,
        Double weight,
        LocalDate date,
        String complaint,
        String diagnosis,
        String notes,
        PrescriptionStatus status
) {
}
