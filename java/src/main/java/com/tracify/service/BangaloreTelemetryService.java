package com.tracify.service;

import com.tracify.model.HotspotCluster;
import java.util.*;
import java.util.stream.Collectors;

/**
 * Standalone synthetic junction snapshot. Does not fetch telemetry or discover clusters.
 */
public class BangaloreTelemetryService {

    private final List<HotspotCluster> clusters = new ArrayList<>();

    public BangaloreTelemetryService() {
        initData();
        for (HotspotCluster c : clusters) {
            c.setCompositeScore(RiskCalculator.calculateScore(c));
            c.setStatus(RiskCalculator.getStatus(c.getCompositeScore()));
        }
        clusters.sort(Comparator.comparingDouble(HotspotCluster::getCompositeScore).reversed()
                .thenComparing(HotspotCluster::getNodeId));
        for (int i = 0; i < clusters.size(); i++) clusters.get(i).setRank(i + 1);
    }

    private void initData() {
        clusters.add(new HotspotCluster("BLR-089A", "BLR-SILK-01", "Silk Board Junction (Hosur Rd & ORR)",
                "South Corridor • Ward 174", 12.9176, 77.6233, 1, 94.2, 34, 5, 18,
                "Two-Wheeler & Bus Blind Merge", "18m ago", 0.3, "CRITICAL",
                72.4, "18:00 - 21:30", "2 Luminaire Glare Issues", "Monsoon Rain & Wet Flyover Ramp", 40.0));

        clusters.add(new HotspotCluster("BLR-022F", "BLR-KRP-02", "KR Puram Bridge & Tin Factory",
                "East Corridor • Old Madras Rd", 13.0035, 77.6844, 2, 91.8, 29, 4, 16,
                "Pedestrian Crosswalk Strike", "1h ago", 1.0, "CRITICAL",
                81.0, "19:30 - 23:00", "3 Broken Streetlights", "Night Unlit Crossing & Heavy Trucks", 35.0));

        clusters.add(new HotspotCluster("BLR-041C", "BLR-HEB-03", "Hebbal Flyover & Bellary Road",
                "North Corridor • Airport Route", 13.0358, 77.5970, 3, 82.4, 24, 2, 11,
                "Elevated Curve Skid / Over-speed", "4h ago", 4.0, "CRITICAL",
                38.5, "22:00 - 02:00", "Standard (Compliant)", "Airport Corridor High-Speed Merging", 50.0));

        clusters.add(new HotspotCluster("BLR-112E", "BLR-GOR-04", "Goraguntepalya Junction (Tumkur Rd)",
                "North-West • Peenya Industrial Area", 13.0284, 77.5414, 4, 78.5, 21, 1, 9,
                "Commercial Freight Turn Occlusion", "8h ago", 8.0, "WARNING",
                52.0, "07:30 - 10:00", "Sub-Standard Visibility", "Multi-Axle Truck Blindspots", 45.0));

        clusters.add(new HotspotCluster("BLR-055K", "BLR-MAR-05", "Marathahalli Bridge & Varthur Rd",
                "East Tech Hub • ORR", 12.9560, 77.7011, 5, 73.6, 18, 1, 7,
                "Two-Wheeler Lane Filtering Crash", "12h ago", 12.0, "WARNING",
                68.0, "08:30 - 11:00", "Standard", "Service Road Merge Friction", 35.0));

        clusters.add(new HotspotCluster("BLR-9921", "BLR-ECO-06", "Bellandur / Ecospace Junction",
                "South-East • ORR Tech Belt", 12.9255, 77.6789, 6, 68.2, 15, 0, 8,
                "Rear-End Congestion Surge", "1d ago", 24.0, "WARNING",
                44.0, "17:30 - 20:30", "Standard", "Waterlogging & Monsoonal Skid", 35.0));

        clusters.add(new HotspotCluster("BLR-3312", "BLR-DAI-07", "Dairy Circle & Bannerghatta Road",
                "Central South • Jayadeva Arterial", 12.9345, 77.6015, 7, 54.1, 11, 0, 4,
                "Angled Left-Turn Collision", "2d ago", 48.0, "MONITORED",
                36.0, "12:00 - 15:00", "Standard", "Bus Stop Queue Blockage", 30.0));

        clusters.add(new HotspotCluster("BLR-7788", "BLR-RIC-08", "Richmond Circle Flyover",
                "Central Business District (CBD)", 12.9667, 77.5990, 8, 46.8, 8, 0, 2,
                "Lane Divergence Sideswipe", "3d ago", 72.0, "MONITORED",
                28.0, "16:00 - 18:30", "LED Upgraded", "Abrupt Exit Ramp Filtering", 35.0));

        clusters.add(new HotspotCluster("BLR-8810", "BLR-ECITY-09", "Electronic City Tollgate & Elevated Expressway",
                "Far South • Tech Corridor", 12.8399, 77.6770, 9, 84.6, 26, 3, 14,
                "Elevated Toll Ramp Merging Conflict", "2h ago", 2.5, "CRITICAL",
                64.0, "08:00 - 10:30", "Highway Sodium Lamps", "High-Speed Elevated Deceleration", 60.0));

        clusters.add(new HotspotCluster("BLR-2914", "BLR-YEL-10", "Yelahanka Police Station Circle",
                "North • Airport Expressway (NH 44)", 13.1007, 77.5963, 10, 71.4, 16, 1, 8,
                "Expressway Service Road Blind Merge", "1d ago", 22.0, "WARNING",
                48.0, "21:00 - 01:00", "Standard Highway Lighting", "Night Mist & Over-Speeding", 50.0));

        clusters.add(new HotspotCluster("BLR-5421", "BLR-WHT-11", "Whitefield Hope Farm Junction",
                "East • ITPL Tech Belt", 12.9830, 77.7516, 11, 76.8, 19, 1, 10,
                "Metro Pillar Turning Occlusion", "5h ago", 5.2, "WARNING",
                74.0, "18:30 - 21:30", "Under Metro Shadow", "Metro Construction Narrow Lane Choke", 30.0));

        clusters.add(new HotspotCluster("BLR-6190", "BLR-JAY-12", "Jayanagar 4th Block Complex Circle",
                "South Central • Commercial Precinct", 12.9298, 77.5828, 12, 48.2, 9, 0, 3,
                "Pedestrian Crossing & Auto Congestion", "3d ago", 76.0, "MONITORED",
                82.0, "17:00 - 20:30", "Commercial Sodium Bulbs", "Pedestrian Flow Surge & Shopper Traffic", 25.0));

        clusters.add(new HotspotCluster("BLR-4432", "BLR-RAJ-13", "Rajajinagar 10th Cross & Dr Rajkumar Rd",
                "West • Metro Green Line Corridor", 12.9882, 77.5548, 13, 62.4, 13, 0, 6,
                "Two-Wheeler Right Turn Collision", "1d ago", 30.0, "WARNING",
                65.0, "08:30 - 10:30", "Standard", "Signal Jumping on Grade Slope", 35.0));

        clusters.add(new HotspotCluster("BLR-7319", "BLR-IND-14", "Indiranagar 100 Feet Rd & CMH Junction",
                "East Central • Dining & Nightlife Belt", 12.9784, 77.6408, 14, 56.5, 12, 0, 5,
                "Night Cab & Two-Wheeler Collision", "14h ago", 14.5, "MONITORED",
                58.0, "22:30 - 02:00", "Good Commercial Lighting", "Late-Night Speeding on Clear Stretches", 35.0));

        clusters.add(new HotspotCluster("BLR-1550", "BLR-KOR-15", "Koramangala Sony World Signal",
                "South-East • 80 Feet Rd Arterial", 12.9352, 77.6245, 15, 65.0, 14, 0, 7,
                "4-Way Intersection Gridlock Conflict", "9h ago", 9.0, "WARNING",
                60.0, "18:00 - 22:00", "Good Streetlighting", "Abrupt U-Turns & Food Delivery Riders", 30.0));

        clusters.add(new HotspotCluster("BLR-3882", "BLR-JPN-16", "JP Nagar Jayadeva Underpass (Bannerghatta Rd)",
                "South • Multi-Level Flyover", 12.9180, 77.5950, 16, 79.2, 22, 2, 10,
                "Underpass Blind Incline Merge", "3h ago", 3.2, "WARNING",
                70.0, "08:00 - 11:00", "Underpass Fluorescent Lamps", "Sudden Incline Merge Friction", 40.0));

        clusters.add(new HotspotCluster("BLR-9011", "BLR-MAJ-17", "Majestic Kempegowda Circle & Bus Station",
                "Central Transit Hub", 12.9767, 77.5713, 17, 72.8, 20, 1, 11,
                "BMTC Bus & Pedestrian Crowd Collision", "6h ago", 6.0, "WARNING",
                88.0, "07:00 - 11:00", "Transit High-Mast Lamps", "Pedestrians Spilling onto Carriageway", 25.0));

        clusters.add(new HotspotCluster("BLR-5570", "BLR-MYS-18", "Nayandahalli Junction (Mysore Rd & ORR)",
                "South-West Expressway Interchange", 12.9460, 77.5260, 18, 75.3, 20, 2, 9,
                "High-Speed Flyover Down-Ramp Collision", "10h ago", 10.0, "WARNING",
                55.0, "20:00 - 23:30", "Elevated High-Mast Lights", "Heavy Intercity Bus Down-Ramp Speed", 45.0));
    }

    public List<HotspotCluster> getAllClusters() {
        return Collections.unmodifiableList(clusters);
    }

    public List<HotspotCluster> getCriticalHotspots() {
        return clusters.stream()
                .filter(c -> "CRITICAL".equalsIgnoreCase(c.getStatus()))
                .collect(Collectors.toList());
    }

    public Optional<HotspotCluster> findByNodeId(String nodeId) {
        return clusters.stream()
                .filter(c -> c.getNodeId().equalsIgnoreCase(nodeId))
                .findFirst();
    }
}
