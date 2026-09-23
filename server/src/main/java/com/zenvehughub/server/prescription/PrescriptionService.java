package com.zenvehughub.server.prescription;

import com.zenvehughub.server.common.ResourceNotFoundException;
import com.zenvehughub.server.patient.Patient;
import com.zenvehughub.server.patient.PatientService;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.util.List;

@Service
@Transactional
public class PrescriptionService {

    private final PrescriptionRepository prescriptionRepository;
    private final PatientService patientService;

    public PrescriptionService(PrescriptionRepository prescriptionRepository, PatientService patientService) {
        this.prescriptionRepository = prescriptionRepository;
        this.patientService = patientService;
    }

    @Transactional(readOnly = true)
    public List<PrescriptionResponse> findAll(Long patientId) {
        return prescriptionRepository.findAllForPatient(patientId).stream()
                .map(PrescriptionResponse::from)
                .toList();
    }

    @Transactional(readOnly = true)
    public PrescriptionResponse getById(Long id) {
        return PrescriptionResponse.from(findEntity(id));
    }

    public PrescriptionResponse create(PrescriptionRequest request) {
        Patient patient = patientService.getEntityById(request.patientId());
        Prescription prescription = new Prescription(
                patient,
                request.weight(),
                request.date() != null ? request.date() : LocalDate.now(),
                trim(request.complaint()),
                trim(request.diagnosis()),
                trim(request.notes()),
                statusOf(request)
        );
        return PrescriptionResponse.from(prescriptionRepository.save(prescription));
    }

    /**
     * Used by both auto-save and the Save button, so an in-progress prescription
     * keeps updating one row instead of creating a new one per keystroke.
     */
    public PrescriptionResponse update(Long id, PrescriptionRequest request) {
        Prescription prescription = findEntity(id);
        prescription.setPatient(patientService.getEntityById(request.patientId()));
        prescription.setWeight(request.weight());
        prescription.setDate(request.date() != null ? request.date() : LocalDate.now());
        prescription.setComplaint(trim(request.complaint()));
        prescription.setDiagnosis(trim(request.diagnosis()));
        prescription.setNotes(trim(request.notes()));
        prescription.setStatus(statusOf(request));
        // Flush so @PreUpdate runs before we read updatedAt for the response.
        return PrescriptionResponse.from(prescriptionRepository.saveAndFlush(prescription));
    }

    private Prescription findEntity(Long id) {
        return prescriptionRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Prescription not found: " + id));
    }

    private PrescriptionStatus statusOf(PrescriptionRequest request) {
        return request.status() != null ? request.status() : PrescriptionStatus.DRAFT;
    }

    private String trim(String value) {
        return value == null ? null : value.trim();
    }
}
