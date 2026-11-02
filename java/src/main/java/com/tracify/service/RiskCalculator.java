package com.tracify.service;

import com.tracify.model.HotspotCluster;

/**
 * Illustrative risk calculator for a fixed 90-day synthetic snapshot.
 * Weights are project design choices, not official BTP or IRC calibration.
 */
public class RiskCalculator {

    // Same weights as the TypeScript calculator with a 90-day window.
    public static final double FREQUENCY_WEIGHT = 0.35;
    public static final double SEVERITY_WEIGHT = 0.45;
    public static final double RECENCY_WEIGHT = 0.20;
    public static final double DECAY_LAMBDA = 0.082;

    /**
     * Calculates the composite danger score for a Bengaluru road cluster.
     *
     * @param cluster The junction cluster data
     * @return Score between 0.0 and 100.0; this is not a crash probability.
     */
    public static double calculateScore(HotspotCluster cluster) {
        if (cluster == null) throw new IllegalArgumentException("Cluster is required");
        if (cluster.getIncidentCount90d() < 0 || cluster.getFatalCount() < 0 || cluster.getInjuryCount() < 0
                || !Double.isFinite(cluster.getLastRecurrenceHoursAgo()) || cluster.getLastRecurrenceHoursAgo() < 0)
            throw new IllegalArgumentException("Counts and recency must be nonnegative");
        if (cluster.getIncidentCount90d() == 0) return 0.0;

        // 1. Frequency Component (Normalized against 35 incidents/90d baseline)
        double normFreq = Math.min((double) cluster.getIncidentCount90d() / 35.0, 1.0);

        // 2. Severity Component (5x for fatalities, 2x for injuries)
        double rawSeverity = ((cluster.getFatalCount() * 5.0) + (cluster.getInjuryCount() * 2.0))
                / Math.max(cluster.getIncidentCount90d(), 1);
        double normSeverity = Math.min(rawSeverity / 2.5, 1.0);

        // 3. Exponential Time Decay for Recency
        double recencyDecay = Math.exp(-DECAY_LAMBDA * cluster.getLastRecurrenceHoursAgo());

        // Composite Weighted Score
        double rawScore = (FREQUENCY_WEIGHT * normFreq
                + SEVERITY_WEIGHT * normSeverity
                + RECENCY_WEIGHT * recencyDecay) * 100.0;

        // Clamp to the displayed index range.
        double rounded = Math.round(rawScore * 10.0) / 10.0;
        return Math.min(Math.max(rounded, 0.0), 100.0);
    }

    /**
     * Determines status category based on composite score.
     */
    public static String getStatus(double score) {
        if (score >= 80.0) return "CRITICAL";
        if (score >= 60.0) return "WARNING";
        return "MONITORED";
    }
}
