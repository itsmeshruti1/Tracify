package com.tracify;

import com.tracify.model.HotspotCluster;
import com.tracify.service.BangaloreTelemetryService;
import com.tracify.service.RiskCalculator;

import java.util.List;

/**
 * Main Entry Point for Tracify Bengaluru in Java.
 * Prints an illustrative, synthetic 90-day junction snapshot.
 */
public class Main {
    public static void main(String[] args) {
        System.out.println("==========================================================================");
        System.out.println("   TRACIFY BENGALURU - ROAD SAFETY & HOTSPOT TELEMETRY (JAVA)       ");
        System.out.println("   SYNTHETIC DATA | Standalone CLI reference | Not an official safety rating");
        System.out.println("==========================================================================\n");

        BangaloreTelemetryService telemetryService = new BangaloreTelemetryService();
        List<HotspotCluster> clusters = telemetryService.getAllClusters();

        System.out.printf("Loaded %d Monitored Junctions across Greater Bengaluru:\n\n", clusters.size());

        for (HotspotCluster c : clusters) {
            double recalculatedScore = RiskCalculator.calculateScore(c);
            String status = RiskCalculator.getStatus(recalculatedScore);
            System.out.printf(" #%02d | %-14s | %-42s | Score: %5.1f | Status: %-9s\n",
                    c.getRank(), c.getNodeId(), c.getName(), recalculatedScore, status);
        }

        System.out.println("\n--------------------------------------------------------------------------");
        System.out.println("Up to 3 critical junctions in this synthetic snapshot (illustrative index):");
        List<HotspotCluster> critical = telemetryService.getCriticalHotspots();
        for (HotspotCluster c : critical.stream().limit(3).toList()) {
            System.out.printf("  * %s (%s): %s | Peak: %s\n",
                    c.getName(), c.getNodeId(), c.getDominantArchetype(), c.getPeakDangerWindow());
        }
        System.out.println("==========================================================================");
    }
}
