package com.tracify.model;

import java.io.Serializable;

/**
 * Model representing individual collision records in Bengaluru.
 */
public class IncidentRecord implements Serializable {
    private static final long serialVersionUID = 1L;

    private String id;
    private String timestamp;
    private int timeMinutesAgo;
    private String locationName;
    private String gridSector;
    private String nodeId;
    private double lat;
    private double lng;
    private String vehicleType;
    private String weather;
    private String roadCondition;
    private String accidentType;
    private String severity; // "FATAL", "SEVERE", "MODERATE", "MINOR"
    private int fatalities;
    private int injuries;
    private double speedDeltaMph;

    public IncidentRecord() {
    }

    public IncidentRecord(String id, String timestamp, int timeMinutesAgo, String locationName,
                          String gridSector, String nodeId, double lat, double lng,
                          String vehicleType, String weather, String roadCondition,
                          String accidentType, String severity, int fatalities,
                          int injuries, double speedDeltaMph) {
        this.id = id;
        this.timestamp = timestamp;
        this.timeMinutesAgo = timeMinutesAgo;
        this.locationName = locationName;
        this.gridSector = gridSector;
        this.nodeId = nodeId;
        this.lat = lat;
        this.lng = lng;
        this.vehicleType = vehicleType;
        this.weather = weather;
        this.roadCondition = roadCondition;
        this.accidentType = accidentType;
        this.severity = severity;
        this.fatalities = fatalities;
        this.injuries = injuries;
        this.speedDeltaMph = speedDeltaMph;
    }

    public String getId() { return id; }
    public void setId(String id) { this.id = id; }

    public String getTimestamp() { return timestamp; }
    public void setTimestamp(String timestamp) { this.timestamp = timestamp; }

    public int getTimeMinutesAgo() { return timeMinutesAgo; }
    public void setTimeMinutesAgo(int timeMinutesAgo) { this.timeMinutesAgo = timeMinutesAgo; }

    public String getLocationName() { return locationName; }
    public void setLocationName(String locationName) { this.locationName = locationName; }

    public String getGridSector() { return gridSector; }
    public void setGridSector(String gridSector) { this.gridSector = gridSector; }

    public String getNodeId() { return nodeId; }
    public void setNodeId(String nodeId) { this.nodeId = nodeId; }

    public double getLat() { return lat; }
    public void setLat(double lat) { this.lat = lat; }

    public double getLng() { return lng; }
    public void setLng(double lng) { this.lng = lng; }

    public String getVehicleType() { return vehicleType; }
    public void setVehicleType(String vehicleType) { this.vehicleType = vehicleType; }

    public String getWeather() { return weather; }
    public void setWeather(String weather) { this.weather = weather; }

    public String getRoadCondition() { return roadCondition; }
    public void setRoadCondition(String roadCondition) { this.roadCondition = roadCondition; }

    public String getAccidentType() { return accidentType; }
    public void setAccidentType(String accidentType) { this.accidentType = accidentType; }

    public String getSeverity() { return severity; }
    public void setSeverity(String severity) { this.severity = severity; }

    public int getFatalities() { return fatalities; }
    public void setFatalities(int fatalities) { this.fatalities = fatalities; }

    public int getInjuries() { return injuries; }
    public void setInjuries(int injuries) { this.injuries = injuries; }

    public double getSpeedDeltaMph() { return speedDeltaMph; }
    public void setSpeedDeltaMph(double speedDeltaMph) { this.speedDeltaMph = speedDeltaMph; }
}
