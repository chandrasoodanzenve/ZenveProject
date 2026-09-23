package com.zenvehughub.server.prescription;

import java.time.Instant;
import java.time.LocalDate;

public record PrescriptionResponse(
        Long id,
        Long patientId,
        String petName,
        String ownerName,
        Double weight,
        LocalDate date,
        String complaint,
        String diagnosis,
        String notes,
        PrescriptionStatus status,
        Instant createdAt,
        Instant updatedAt
) {

    public static PrescriptionResponse from(Prescription prescription) {
        return new PrescriptionResponse(
                prescription.getId(),
                prescription.getPatient().getId(),
                prescription.getPatient().getPetName(),
                prescription.getPatient().getOwner().getName(),
                prescription.getWeight(),
                prescription.getDate(),
                prescription.getComplaint(),
                prescription.getDiagnosis(),
                prescription.getNotes(),
                prescription.getStatus(),
                prescription.getCreatedAt(),
                prescription.getUpdatedAt()
        );
    }
}
