package com.zenvehughub.server.prescription;

import com.zenvehughub.server.patient.Patient;
import jakarta.persistence.*;

import java.time.Instant;
import java.time.LocalDate;

@Entity
public class Prescription {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "patient_id")
    private Patient patient;

    private Double weight;
    private LocalDate date;

    @Column(length = 500)
    private String complaint;

    @Column(length = 500)
    private String diagnosis;

    @Lob
    private String notes;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 16)
    private PrescriptionStatus status = PrescriptionStatus.DRAFT;

    private Instant createdAt;
    private Instant updatedAt;

    protected Prescription() {
    }

    public Prescription(Patient patient, Double weight, LocalDate date, String complaint, String diagnosis,
                        String notes, PrescriptionStatus status) {
        this.patient = patient;
        this.weight = weight;
        this.date = date;
        this.complaint = complaint;
        this.diagnosis = diagnosis;
        this.notes = notes;
        this.status = status;
    }

    @PrePersist
    void onCreate() {
        this.createdAt = Instant.now();
        this.updatedAt = this.createdAt;
    }

    @PreUpdate
    void onUpdate() {
        this.updatedAt = Instant.now();
    }

    public Long getId() {
        return id;
    }

    public Patient getPatient() {
        return patient;
    }

    public void setPatient(Patient patient) {
        this.patient = patient;
    }

    public Double getWeight() {
        return weight;
    }

    public void setWeight(Double weight) {
        this.weight = weight;
    }

    public LocalDate getDate() {
        return date;
    }

    public void setDate(LocalDate date) {
        this.date = date;
    }

    public String getComplaint() {
        return complaint;
    }

    public void setComplaint(String complaint) {
        this.complaint = complaint;
    }

    public String getDiagnosis() {
        return diagnosis;
    }

    public void setDiagnosis(String diagnosis) {
        this.diagnosis = diagnosis;
    }

    public String getNotes() {
        return notes;
    }

    public void setNotes(String notes) {
        this.notes = notes;
    }

    public PrescriptionStatus getStatus() {
        return status;
    }

    public void setStatus(PrescriptionStatus status) {
        this.status = status;
    }

    public Instant getCreatedAt() {
        return createdAt;
    }

    public Instant getUpdatedAt() {
        return updatedAt;
    }
}
