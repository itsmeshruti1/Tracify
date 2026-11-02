package com.tracify;

import com.tracify.model.HotspotCluster;
import com.tracify.service.BangaloreTelemetryService;
import com.tracify.service.RiskCalculator;

public class RiskCalculatorTest {
    public static void main(String[] args) {
        HotspotCluster c = new HotspotCluster();
        if (RiskCalculator.calculateScore(c) != 0.0) throw new AssertionError("Empty cluster must score zero");
        c.setIncidentCount90d(1); c.setFatalCount(1); c.setLastRecurrenceHoursAgo(0);
        // Shared TypeScript fixture: 1 frequency point + 45 severity + 20 recency.
        if (RiskCalculator.calculateScore(c) != 66.0) throw new AssertionError("Formula parity failed");
        var service = new BangaloreTelemetryService();
        double previous = Double.POSITIVE_INFINITY; int rank = 1;
        for (HotspotCluster cluster : service.getAllClusters()) {
            if (cluster.getCompositeScore() > previous || cluster.getRank() != rank++) throw new AssertionError("Ranking inconsistent");
            if (!cluster.getStatus().equals(RiskCalculator.getStatus(cluster.getCompositeScore()))) throw new AssertionError("Status inconsistent");
            previous = cluster.getCompositeScore();
        }
        if (service.getCriticalHotspots().stream().anyMatch(cluster -> cluster.getCompositeScore() < 80)) throw new AssertionError("Critical filter inconsistent");
        System.out.println("Java formula, ranking and status checks passed.");
    }
}
