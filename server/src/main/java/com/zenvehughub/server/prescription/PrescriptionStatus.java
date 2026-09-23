package com.zenvehughub.server.prescription;

public enum PrescriptionStatus {
    /** Written by auto-save while the doctor is still dictating. */
    DRAFT,
    /** Confirmed by the doctor pressing Save. */
    SAVED
}
