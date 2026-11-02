package com.tracify.model;

import java.io.Serializable;

/**
 * Data Model for Bengaluru Road Safety & Accident Hotspots.
 * Represents a monitored road intersection, flyover ramp, or pedestrian blackspot.
 */
public class HotspotCluster implements Serializable {
    private static final long serialVersionUID = 1L;

    private String id;
    private String nodeId;
    private String name;
    private String gridSector;
    private double lat;
    private double lng;
    private int rank;
    private double compositeScore;
    private int incidentCount90d;
    private int fatalCount;
    private int injuryCount;
    private String dominantArchetype;
    private String lastRecurrence;
    private double lastRecurrenceHoursAgo;
    private String status; // "CRITICAL", "WARNING", "MONITORED"
    private double vulnerableUserRatio;
    private String peakDangerWindow;
    private String lightingInfrastructure;
    private String dominantTrigger;
    private double speedLimitMph;

    public HotspotCluster() {
    }

    public HotspotCluster(String id, String nodeId, String name, String gridSector,
                          double lat, double lng, int rank, double compositeScore,
                          int incidentCount90d, int fatalCount, int injuryCount,
                          String dominantArchetype, String lastRecurrence,
                          double lastRecurrenceHoursAgo, String status,
                          double vulnerableUserRatio, String peakDangerWindow,
                          String lightingInfrastructure, String dominantTrigger,
                          double speedLimitMph) {
        this.id = id;
        this.nodeId = nodeId;
        this.name = name;
        this.gridSector = gridSector;
        this.lat = lat;
        this.lng = lng;
        this.rank = rank;
        this.compositeScore = compositeScore;
        this.incidentCount90d = incidentCount90d;
        this.fatalCount = fatalCount;
        this.injuryCount = injuryCount;
        this.dominantArchetype = dominantArchetype;
        this.lastRecurrence = lastRecurrence;
        this.lastRecurrenceHoursAgo = lastRecurrenceHoursAgo;
        this.status = status;
        this.vulnerableUserRatio = vulnerableUserRatio;
        this.peakDangerWindow = peakDangerWindow;
        this.lightingInfrastructure = lightingInfrastructure;
        this.dominantTrigger = dominantTrigger;
        this.speedLimitMph = speedLimitMph;
    }

    // Getters and Setters
    public String getId() { return id; }
    public void setId(String id) { this.id = id; }

    public String getNodeId() { return nodeId; }
    public void setNodeId(String nodeId) { this.nodeId = nodeId; }

    public String getName() { return name; }
    public void setName(String name) { this.name = name; }

    public String getGridSector() { return gridSector; }
    public void setGridSector(String gridSector) { this.gridSector = gridSector; }

    public double getLat() { return lat; }
    public void setLat(double lat) { this.lat = lat; }

    public double getLng() { return lng; }
    public void setLng(double lng) { this.lng = lng; }

    public int getRank() { return rank; }
    public void setRank(int rank) { this.rank = rank; }

    public double getCompositeScore() { return compositeScore; }
    public void setCompositeScore(double compositeScore) { this.compositeScore = compositeScore; }

    public int getIncidentCount90d() { return incidentCount90d; }
    public void setIncidentCount90d(int incidentCount90d) { this.incidentCount90d = incidentCount90d; }

    public int getFatalCount() { return fatalCount; }
    public void setFatalCount(int fatalCount) { this.fatalCount = fatalCount; }

    public int getInjuryCount() { return injuryCount; }
    public void setInjuryCount(int injuryCount) { this.injuryCount = injuryCount; }

    public String getDominantArchetype() { return dominantArchetype; }
    public void setDominantArchetype(String dominantArchetype) { this.dominantArchetype = dominantArchetype; }

    public String getLastRecurrence() { return lastRecurrence; }
    public void setLastRecurrence(String lastRecurrence) { this.lastRecurrence = lastRecurrence; }

    public double getLastRecurrenceHoursAgo() { return lastRecurrenceHoursAgo; }
    public void setLastRecurrenceHoursAgo(double lastRecurrenceHoursAgo) { this.lastRecurrenceHoursAgo = lastRecurrenceHoursAgo; }

    public String getStatus() { return status; }
    public void setStatus(String status) { this.status = status; }

    public double getVulnerableUserRatio() { return vulnerableUserRatio; }
    public void setVulnerableUserRatio(double vulnerableUserRatio) { this.vulnerableUserRatio = vulnerableUserRatio; }

    public String getPeakDangerWindow() { return peakDangerWindow; }
    public void setPeakDangerWindow(String peakDangerWindow) { this.peakDangerWindow = peakDangerWindow; }

    public String getLightingInfrastructure() { return lightingInfrastructure; }
    public void setLightingInfrastructure(String lightingInfrastructure) { this.lightingInfrastructure = lightingInfrastructure; }

    public String getDominantTrigger() { return dominantTrigger; }
    public void setDominantTrigger(String dominantTrigger) { this.dominantTrigger = dominantTrigger; }

    public double getSpeedLimitMph() { return speedLimitMph; }
    public void setSpeedLimitMph(double speedLimitMph) { this.speedLimitMph = speedLimitMph; }

    @Override
    public String toString() {
        return String.format("[%s] %s | Danger Score: %.1f/100 | %d Incidents (%d Fatal) | Status: %s",
                nodeId, name, compositeScore, incidentCount90d, fatalCount, status);
    }
}
