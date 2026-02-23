'use client';

import { useEffect, useState, useRef } from 'react';
import { MapContainer, TileLayer, Polygon, Rectangle, Tooltip, FeatureGroup, ZoomControl } from 'react-leaflet';
import { EditControl } from 'react-leaflet-draw';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import 'leaflet-draw/dist/leaflet.draw.css';

// Fix for default marker icons in Leaflet
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
});

interface Cemetery {
  id: number;
  name: string;
  map_coordinates: [number, number][];
  latitude: number;
  longitude: number;
}

interface Plot {
  id: number;
  plot_number: string;
  status: string;
  plot_type: string;
  map_coordinates: { x: number; y: number } | [number, number][];
  size_length?: number;
  size_width?: number;
  layers: number;
}

interface Facility {
  id: number;
  cemetery_id: number;
  name: string;
  facility_type: string;
  description?: string;
  map_coordinates: [number, number][] | [number, number];
  latitude?: number;
  longitude?: number;
}

interface PlotMapProps {
  cemetery: Cemetery;
  plots: Plot[];
  selectedPlot?: Plot | null;
  onPlotCreated: (coordinates: [number, number][]) => void;
  onPlotClick: (plot: Plot) => void;
  onPlotEdited?: (plotId: number, coordinates: [number, number][]) => void;
  selectedTemplate?: { width: number; length: number } | null;
  templateRotation?: number;
  onRotationChange?: (rotation: number) => void;
  onTemplateChange?: (templateId: string | null) => void;
  plotTemplates?: Array<{ id: string; name: string; width: number; length: number }>;
  searchQuery?: string;
  searchResults?: Plot[];
  facilitySearchResults?: Facility[];
  showSearchResults?: boolean;
  onSearchChange?: (query: string) => void;
  onSearchResultClick?: (plot: Plot) => void;
  onFacilityResultClick?: (facility: Facility) => void;
  onCloseSearch?: () => void;
  centerCoordinates?: [number, number] | null;
  plotFilter?: 'all' | 'available' | 'full';
  allBurials?: {plot_id: number}[];
  mappingMode?: 'plots' | 'facilities';
  facilities?: Facility[];
  onFacilityCreated?: (coordinates: [number, number][]) => void;
  onFacilityClick?: (facility: Facility) => void;
}

export default function PlotMap({ 
  cemetery, 
  plots,
  selectedPlot = null, 
  onPlotCreated, 
  onPlotClick, 
  onPlotEdited, 
  selectedTemplate, 
  templateRotation = 0,
  onRotationChange,
  onTemplateChange,
  plotTemplates = [],
  searchQuery = '',
  searchResults = [],
  facilitySearchResults = [],
  showSearchResults = false,
  onSearchChange,
  onSearchResultClick,
  onFacilityResultClick,
  onCloseSearch,
  centerCoordinates = null,
  plotFilter = 'all',
  allBurials = [],
  mappingMode = 'plots',
  facilities = [],
  onFacilityCreated,
  onFacilityClick,
}: PlotMapProps) {
  const [isMounted, setIsMounted] = useState(false);
  const [map, setMap] = useState<L.Map | null>(null);
  const mapRef = useRef<L.Map | null>(null);
  const measurementLayersRef = useRef<L.Layer[]>([]);
  const [templatePreview, setTemplatePreview] = useState<L.Polygon | null>(null);
  const [templateRotationLocal, setTemplateRotationLocal] = useState(0);
  const [showMappingPanel, setShowMappingPanel] = useState(false);
  const [selectedPlotForEditing, setSelectedPlotForEditing] = useState<number | null>(null);
  const [mapLayer, setMapLayer] = useState<'street' | 'satellite'>('street');
  const center: [number, number] = [cemetery.latitude, cemetery.longitude];
  const boundary = cemetery.map_coordinates || [];

  // Map layer configurations
  const mapLayers = {
    street: {
      url: 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
      maxNativeZoom: 19,
    },
    satellite: {
      url: 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
      attribution: '&copy; <a href="https://www.esri.com/">Esri</a> &mdash; Source: Esri, i-cubed, USDA, USGS, AEX, GeoEye, Getmapping, Aerogrid, IGN, IGP, UPR-EGP, and the GIS User Community',
      maxNativeZoom: 19,
    },
  };

  // Helper function to check if plot should be highlighted based on filter or selection
  const shouldHighlightPlot = (plot: Plot) => {
    // Highlight if it's the selected plot from search
    if (selectedPlot && plot.id === selectedPlot.id) return true;
    
    if (plotFilter === 'all') return false;
    
    const plotBurials = allBurials.filter(b => b.plot_id === plot.id);
    const occupiedLayers = plotBurials.length;
    const totalLayers = plot.layers || 1;
    
    if (plotFilter === 'available') {
      return occupiedLayers < totalLayers;
    } else if (plotFilter === 'full') {
      return occupiedLayers >= totalLayers;
    }
    
    return false;
  };

  // Sync templateRotation from props
  useEffect(() => {
    if (templateRotation !== undefined) {
      setTemplateRotationLocal(templateRotation);
    }
  }, [templateRotation]);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  // Disable location services on mobile devices to prevent permission prompts
  useEffect(() => {
    if (map) {
      // Explicitly disable locate control and stop any location tracking
      map.stopLocate();
      
      // Remove any location events that might have been bound
      map.off('locationfound');
      map.off('locationerror');
    }
  }, [map]);

  // Center map when centerCoordinates changes
  useEffect(() => {
    if (map && centerCoordinates) {
      map.flyTo(centerCoordinates, 20, {
        duration: 1.5
      });
    }
  }, [centerCoordinates, map]);

  // Reset rotation when template changes
  useEffect(() => {
    if (!selectedTemplate && onRotationChange) {
      setTemplateRotationLocal(0);
      onRotationChange(0);
    }
  }, [selectedTemplate, onRotationChange]);

  // Notify parent of rotation changes
  useEffect(() => {
    if (onRotationChange) {
      onRotationChange(templateRotationLocal);
    }
  }, [templateRotationLocal, onRotationChange]);

  // Helper function to rotate a point around a center
  const rotatePoint = (
    centerLat: number,
    centerLng: number,
    pointLat: number,
    pointLng: number,
    angleDeg: number
  ): [number, number] => {
    const angleRad = (angleDeg * Math.PI) / 180;
    const cosAngle = Math.cos(angleRad);
    const sinAngle = Math.sin(angleRad);

    const dx = pointLng - centerLng;
    const dy = pointLat - centerLat;

    const rotatedLng = centerLng + (dx * cosAngle - dy * sinAngle);
    const rotatedLat = centerLat + (dx * sinAngle + dy * cosAngle);

    return [rotatedLat, rotatedLng];
  };

  // Calculate distance between two lat/lng points in meters
  const calculateDistance = (lat1: number, lng1: number, lat2: number, lng2: number): number => {
    const R = 6371e3; // Earth's radius in meters
    const φ1 = (lat1 * Math.PI) / 180;
    const φ2 = (lat2 * Math.PI) / 180;
    const Δφ = ((lat2 - lat1) * Math.PI) / 180;
    const Δλ = ((lng2 - lng1) * Math.PI) / 180;

    const a = Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
              Math.cos(φ1) * Math.cos(φ2) *
              Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

    return R * c; // Distance in meters
  };

  // Add measurement labels to a polygon
  const addMeasurements = (layer: any) => {
    if (!map) return;

    // Check if layer has getLatLngs method (it's a polygon/polyline)
    if (!layer.getLatLngs || typeof layer.getLatLngs !== 'function') {
      return;
    }

    // Remove old measurements
    measurementLayersRef.current.forEach(l => map.removeLayer(l));
    measurementLayersRef.current = [];

    const latLngsData = layer.getLatLngs();
    // Handle both polygon (nested array) and polyline (flat array) structures
    const latLngs = Array.isArray(latLngsData[0]) ? latLngsData[0] : latLngsData;
    
    // Need at least 2 points to measure
    if (!latLngs || latLngs.length < 2) {
      return;
    }

    const newMeasurements: L.Layer[] = [];

    for (let i = 0; i < latLngs.length; i++) {
      const start = latLngs[i];
      const end = latLngs[(i + 1) % latLngs.length];
      
      const distance = calculateDistance(start.lat, start.lng, end.lat, end.lng);
      const midLat = (start.lat + end.lat) / 2;
      const midLng = (start.lng + end.lng) / 2;

      // Calculate perpendicular offset to position label outside the edge
      const dx = end.lng - start.lng;
      const dy = end.lat - start.lat;
      const length = Math.sqrt(dx * dx + dy * dy);
      
      // Perpendicular vector (rotated 90 degrees)
      const perpX = -dy / length;
      const perpY = dx / length;
      
      // Offset distance (increased to move labels much further from edge)
      const offsetDist = 0.00008; // Moved further away from the polygon
      
      const labelLat = midLat + (perpY * offsetDist);
      const labelLng = midLng + (perpX * offsetDist);

      // Create a marker with custom HTML instead of tooltip for better control
      const icon = L.divIcon({
        className: 'measurement-label',
        html: `<div class="measurement-label-content">${distance.toFixed(2)}m</div>`,
        iconSize: [60, 20],
        iconAnchor: [30, 10]
      });

      const marker = L.marker([labelLat, labelLng], { icon })
        .addTo(map);

      newMeasurements.push(marker);
    }

    measurementLayersRef.current = newMeasurements;
  };

  // Remove measurements
  const clearMeasurements = () => {
    if (!map) return;
    measurementLayersRef.current.forEach(l => map.removeLayer(l));
    measurementLayersRef.current = [];
  };

  // Listen for draw/edit events to add measurements
  useEffect(() => {
    if (!map) return;

    const handleEditVertex = (e: any) => {
      if (e.poly) {
        addMeasurements(e.poly);
      }
    };

    const handleDrawStart = () => {
      clearMeasurements();
    };

    const handleEditStart = (e: any) => {
      if (e.layer) {
        addMeasurements(e.layer);
      }
    };

    const handleDrawStop = () => {
      clearMeasurements();
    };

    const handleEditStop = () => {
      clearMeasurements();
    };

    // Only show measurements during editing, not while actively drawing
    map.on('draw:editvertex', handleEditVertex);
    map.on('draw:drawstart', handleDrawStart);
    map.on('draw:editstart', handleEditStart);
    map.on('draw:drawstop', handleDrawStop);
    map.on('draw:editstop', handleEditStop);
    map.on('draw:created', clearMeasurements);
    map.on('draw:edited', clearMeasurements);

    return () => {
      map.off('draw:editvertex', handleEditVertex);
      map.off('draw:drawstart', handleDrawStart);
      map.off('draw:editstart', handleEditStart);
      map.off('draw:drawstop', handleDrawStop);
      map.off('draw:editstop', handleEditStop);
      map.off('draw:created', clearMeasurements);
      map.off('draw:edited', clearMeasurements);
    };
  }, [map]);

  // Handle template placement
  useEffect(() => {
    if (!map) return;

    const handleMapClick = (e: L.LeafletMouseEvent) => {
      if (!selectedTemplate) return;

      const clickLat = e.latlng.lat;
      const clickLng = e.latlng.lng;

      // Convert meters to approximate lat/lng offsets
      const latOffset = (selectedTemplate.length / 2) / 111320;
      const lngOffset = (selectedTemplate.width / 2) / (111320 * Math.cos(clickLat * Math.PI / 180));

      // Create rectangle corners (before rotation)
      const corners: [number, number][] = [
        [clickLat - latOffset, clickLng - lngOffset], // bottom-left
        [clickLat + latOffset, clickLng - lngOffset], // top-left
        [clickLat + latOffset, clickLng + lngOffset], // top-right
        [clickLat - latOffset, clickLng + lngOffset], // bottom-right
      ];

      // Apply rotation to each corner
      const rotatedCorners = corners.map(([lat, lng]) =>
        rotatePoint(clickLat, clickLng, lat, lng, templateRotationLocal)
      );

      onPlotCreated(rotatedCorners);
    };

    const handleMapMouseMove = (e: L.LeafletMouseEvent) => {
      if (!selectedTemplate) {
        if (templatePreview) {
          map.removeLayer(templatePreview);
          setTemplatePreview(null);
        }
        return;
      }

      const clickLat = e.latlng.lat;
      const clickLng = e.latlng.lng;

      const latOffset = (selectedTemplate.length / 2) / 111320;
      const lngOffset = (selectedTemplate.width / 2) / (111320 * Math.cos(clickLat * Math.PI / 180));

      // Create rectangle corners (before rotation)
      const corners: [number, number][] = [
        [clickLat - latOffset, clickLng - lngOffset],
        [clickLat + latOffset, clickLng - lngOffset],
        [clickLat + latOffset, clickLng + lngOffset],
        [clickLat - latOffset, clickLng + lngOffset],
      ];

      // Apply rotation to each corner
      const rotatedCorners = corners.map(([lat, lng]) =>
        rotatePoint(clickLat, clickLng, lat, lng, templateRotationLocal)
      );

      if (templatePreview) {
        map.removeLayer(templatePreview);
      }

      const preview = L.polygon(rotatedCorners, {
        color: '#10b981',
        fillColor: '#10b981',
        fillOpacity: 0.3,
        weight: 2,
        dashArray: '5, 5',
      }).addTo(map);

      setTemplatePreview(preview);
    };

    if (selectedTemplate) {
      map.on('click', handleMapClick);
      map.on('mousemove', handleMapMouseMove);
    }

    return () => {
      map.off('click', handleMapClick);
      map.off('mousemove', handleMapMouseMove);
      if (templatePreview) {
        map.removeLayer(templatePreview);
      }
    };
  }, [map, selectedTemplate, templatePreview, templateRotationLocal, onPlotCreated]);

  if (!isMounted) {
    return (
      <div className="h-[calc(100vh-280px)] sm:h-[calc(100vh-260px)] w-full rounded-lg overflow-hidden border border-gray-300 relative flex items-center justify-center bg-gray-50">
        <p className="text-gray-500">Loading map...</p>
      </div>
    );
  }

  // Color coding for plot statuses
  const getPlotColor = (status: string) => {
    switch (status) {
      case 'available':
        return '#10b981'; // green
      case 'occupied':
        return '#3b82f6'; // blue
      case 'reserved':
        return '#f59e0b'; // yellow
      case 'unavailable':
        return '#ef4444'; // red
      default:
        return '#6b7280'; // gray
    }
  };

  // Color and icon for facility types
  const getFacilityStyle = (facilityType: string) => {
    const styles: Record<string, { color: string; icon: string }> = {
      office: { color: '#3b82f6', icon: '🏢' },
      chapel: { color: '#8b5cf6', icon: '⛪' },
      restroom: { color: '#06b6d4', icon: '🚻' },
      parking: { color: '#64748b', icon: '🅿️' },
      gate: { color: '#71717a', icon: '🚪' },
      crematorium: { color: '#ef4444', icon: '🔥' },
      columbarium: { color: '#a855f7', icon: '🏛️' },
      garden: { color: '#22c55e', icon: '🌳' },
      pond: { color: '#0ea5e9', icon: '💧' },
      fountain: { color: '#06b6d4', icon: '⛲' },
      bench: { color: '#92400e', icon: '🪑' },
      memorial: { color: '#6b7280', icon: '🗿' },
      other: { color: '#6b7280', icon: '📍' },
    };
    return styles[facilityType] || styles.other;
  };

  const handleCreated = (e: any) => {
    const layer = e.layer;
    
    // Get the actual polygon coordinates
    const latLngs = layer.getLatLngs()[0]; // Get first ring of coordinates
    const coordinates: [number, number][] = latLngs.map((latLng: any) => [
      latLng.lat,
      latLng.lng
    ]);
    
    // Pass the coordinates to the appropriate handler based on mapping mode
    if (mappingMode === 'facilities' && onFacilityCreated) {
      onFacilityCreated(coordinates);
    } else {
      onPlotCreated(coordinates);
    }
    
    // Remove the drawn layer immediately (we'll add it properly after saving)
    layer.remove();
  };

  const handleEdited = (e: any) => {
    const layers = e.layers;
    layers.eachLayer((layer: any) => {
      const plotId = layer.options.plotId;
      if (plotId && onPlotEdited) {
        const latLngs = layer.getLatLngs()[0];
        const coordinates: [number, number][] = latLngs.map((latLng: any) => [
          latLng.lat,
          latLng.lng
        ]);
        onPlotEdited(plotId, coordinates);
      }
    });
  };

  // Calculate plot bounds from center coordinates (for legacy center-based plots)
  const getPlotBounds = (plot: Plot & { map_coordinates: { x: number; y: number } }): [[number, number], [number, number]] => {
    const centerLat = plot.map_coordinates.y;
    const centerLng = plot.map_coordinates.x;
    
    // Default size if not specified (in meters, roughly)
    const defaultSize = 0.00005; // approximately 5-6 meters
    const latOffset = defaultSize;
    const lngOffset = defaultSize;
    
    return [
      [centerLat - latOffset, centerLng - lngOffset],
      [centerLat + latOffset, centerLng + lngOffset]
    ];
  };

  return (
    <div className="h-[calc(100vh-200px)] sm:h-[calc(100vh-180px)] w-full rounded-lg overflow-hidden border border-gray-300 relative">
      {/* Remove custom CSS, restore default Leaflet positioning */}
      
      {/* Map Layer Selector - Top Right */}
      <div className="absolute top-2 right-2 z-[1000] flex gap-1 bg-white rounded-lg shadow-md border border-gray-200 p-1">
        <button
          onClick={() => setMapLayer('street')}
          className={`px-3 py-1.5 text-xs rounded-md transition-all font-medium ${
            mapLayer === 'street'
              ? 'bg-indigo-600 text-white shadow-sm'
              : 'text-gray-700 hover:bg-gray-100'
          }`}
          title="Street Map"
        >
          🗺️ Street
        </button>
        <button
          onClick={() => setMapLayer('satellite')}
          className={`px-3 py-1.5 text-xs rounded-md transition-all font-medium ${
            mapLayer === 'satellite'
              ? 'bg-indigo-600 text-white shadow-sm'
              : 'text-gray-700 hover:bg-gray-100'
          }`}
          title="Satellite View"
        >
          🛰️ Satellite
        </button>
      </div>

      {/* Top Control Bar - Responsive */}
      <div className="absolute top-2 left-2 right-32 z-[1000] flex flex-col sm:flex-row gap-2">
        {/* Mapping Tools - Compact Panel */}
        <div className="bg-white rounded-lg shadow-md border border-gray-200">
          <div className="flex items-center gap-1 p-1.5 flex-wrap">
            {/* Select Template Button - Toggle Panel */}
            <button
              onClick={() => setShowMappingPanel(!showMappingPanel)}
              className="px-2.5 py-1.5 text-xs bg-white text-gray-700 border border-gray-300 rounded-md hover:bg-gray-50 transition-colors font-medium flex items-center gap-1"
              title="Select plot template"
            >
              <span>{selectedTemplate ? selectedTemplate.width + 'm × ' + selectedTemplate.length + 'm' : 'Select Template'}</span>
              <svg className={`w-3 h-3 transition-transform ${showMappingPanel ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </button>

            {/* Rotation Controls - Inline when template selected */}
            {selectedTemplate && (
              <>
                <div className="hidden sm:block w-px h-6 bg-gray-300 mx-1"></div>
                <button
                  onClick={() => {
                    const newRotation = (templateRotationLocal - 10 + 360) % 360;
                    setTemplateRotationLocal(newRotation);
                  }}
                  className="px-2 py-1.5 text-xs bg-white border border-gray-300 rounded-md hover:bg-gray-50 transition-colors"
                  title="Rotate left 10°"
                >
                  ↺
                </button>
                <input
                  type="number"
                  min="0"
                  max="359"
                  value={templateRotationLocal}
                  onChange={(e) => {
                    const value = parseInt(e.target.value) || 0;
                    const normalized = ((value % 360) + 360) % 360;
                    setTemplateRotationLocal(normalized);
                  }}
                  className="w-14 px-1 py-1 text-[10px] font-bold text-indigo-600 bg-indigo-50 rounded border border-indigo-200 text-center focus:outline-none focus:ring-2 focus:ring-indigo-400"
                  title="Enter rotation angle (0-359°)"
                />
                <button
                  onClick={() => {
                    const newRotation = (templateRotationLocal + 10) % 360;
                    setTemplateRotationLocal(newRotation);
                  }}
                  className="px-2 py-1.5 text-xs bg-white border border-gray-300 rounded-md hover:bg-gray-50 transition-colors"
                  title="Rotate right 10°"
                >
                  ↻
                </button>
                <button
                  onClick={() => setTemplateRotationLocal(0)}
                  className="px-2 py-1.5 text-xs bg-white border border-gray-300 rounded-md hover:bg-gray-50 transition-colors"
                  title="Reset rotation"
                >
                  ⟲
                </button>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Template Selection Panel - Expandable */}
      {showMappingPanel && (
        <div className="absolute top-14 left-2 z-[1000] bg-white rounded-lg shadow-lg border border-gray-200 w-80">
          <div className="p-3">
            <div className="flex items-center justify-between mb-3 pb-2 border-b border-gray-200">
              <h3 className="text-sm font-semibold text-gray-800">Select Plot Template</h3>
              <button
                onClick={() => setShowMappingPanel(false)}
                className="p-1 hover:bg-gray-100 rounded transition-colors"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            
            {/* Preset Templates */}
            <div className="grid grid-cols-2 gap-2">
              {plotTemplates.map((template) => (
                <button
                  key={template.id}
                  onClick={() => {
                    onTemplateChange && onTemplateChange(template.id);
                    setShowMappingPanel(false);
                  }}
                  className={`px-3 py-2.5 text-sm rounded-lg border-2 transition-all ${
                    selectedTemplate && plotTemplates.find(t => t.id === template.id && t.width === selectedTemplate.width && t.length === selectedTemplate.length)
                      ? 'bg-indigo-50 text-indigo-700 border-indigo-500 font-semibold'
                      : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'
                  }`}
                >
                  <div className="font-semibold">{template.name}</div>
                  <div className="text-xs text-gray-500 mt-0.5">{template.width}m × {template.length}m</div>
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      <MapContainer
        key={`plotmap-${cemetery.id}-${mapLayer}`}
        center={center}
        zoom={20}
        maxZoom={22}
        minZoom={15}
        style={{ height: '100%', width: '100%' }}
        scrollWheelZoom={true}
          zoomControl={false}
          ref={(m: L.Map | null) => {
            if (m) {
              setMap(m);
              mapRef.current = m;
            } else {
              setMap(null);
              mapRef.current = null;
            }
          }}
        preferCanvas={true}
        attributionControl={true}
        doubleClickZoom={true}
      >
        {/* Zoom Control - Bottom Left */}
        {map && <ZoomControl position="topleft" />}
        
        {mapLayer === 'street' && (
          <TileLayer
            key="street-layer"
            attribution={mapLayers.street.attribution}
            url={mapLayers.street.url}
            maxZoom={22}
            maxNativeZoom={mapLayers.street.maxNativeZoom}
          />
        )}
        
        {mapLayer === 'satellite' && (
          <TileLayer
            key="satellite-layer"
            attribution={mapLayers.satellite.attribution}
            url={mapLayers.satellite.url}
            maxZoom={22}
            maxNativeZoom={mapLayers.satellite.maxNativeZoom}
          />
        )}

        {/* Cemetery Boundary */}
        {boundary.length > 0 && (
          <Polygon
            positions={boundary}
            pathOptions={{
              color: '#6366f1',
              fillColor: '#6366f1',
              fillOpacity: 0.1,
              weight: 3,
            }}
          />
        )}

        {/* Drawing Control - Only for new plots */}
        <FeatureGroup>
          <EditControl
            position="topleft"
            onCreated={handleCreated}
            draw={{
              polygon: selectedTemplate ? false : {
                allowIntersection: false,
                showArea: true,
                drawError: {
                  color: '#e74c3c',
                  timeout: 1000,
                },
                shapeOptions: {
                  color: '#10b981',
                  fillColor: '#10b981',
                  fillOpacity: 0.3,
                  weight: 2,
                },
                icon: new L.DivIcon({
                  iconSize: new L.Point(8, 8),
                  className: 'leaflet-div-icon leaflet-editing-icon',
                }),
              },
              rectangle: false,
              circle: false,
              circlemarker: false,
              marker: false,
              polyline: false,
            }}
            edit={{
              edit: false,
              remove: false,
            }}
          />
        </FeatureGroup>

        {/* Selected Plot - Editable */}
        {selectedPlotForEditing && plots.find(p => p.id === selectedPlotForEditing) && (
          <FeatureGroup>
            <EditControl
              position="topright"
              onEdited={handleEdited}
              draw={{
                polygon: false,
                rectangle: false,
                circle: false,
                circlemarker: false,
                marker: false,
                polyline: false,
              }}
              edit={{
                edit: {
                  selectedPathOptions: {
                    color: '#fbbf24',
                    fillColor: '#fbbf24',
                    fillOpacity: 0.4,
                    opacity: 1,
                    weight: 3,
                    dashArray: '10, 5',
                  },
                },
                remove: false,
              }}
            />
            {(() => {
              const plot = plots.find(p => p.id === selectedPlotForEditing);
              if (!plot || !Array.isArray(plot.map_coordinates) || plot.map_coordinates.length === 0) {
                return null;
              }
              const pathOptions = {
                color: getPlotColor(plot.status),
                fillColor: getPlotColor(plot.status),
                fillOpacity: 0.5,
                weight: 2,
                plotId: plot.id,
              };
              return (
                <Polygon
                  key={`editable-${plot.id}-${JSON.stringify(plot.map_coordinates)}`}
                  positions={plot.map_coordinates as [number, number][]}
                  pathOptions={pathOptions}
                  eventHandlers={{
                    click: () => onPlotClick(plot),
                  }}
                >
                  <Tooltip direction="top" offset={[0, -10]} opacity={1} permanent={false}>
                    <div className="text-xs">
                      <div className="font-bold">{plot.plot_number}</div>
                      <div className="text-gray-600">
                        {plot.plot_type} • {plot.status}
                      </div>
                    </div>
                  </Tooltip>
                </Polygon>
              );
            })()}
          </FeatureGroup>
        )}

        {/* Non-editable Grave Plots */}
        {plots
          .filter((plot) => {
            if (plot.id === selectedPlotForEditing) return false; // Skip selected plot
            if (Array.isArray(plot.map_coordinates)) {
              return plot.map_coordinates.length > 0;
            }
            return false;
          })
          .map((plot) => {
            const isHighlighted = shouldHighlightPlot(plot);
            const isSelected = selectedPlot && plot.id === selectedPlot.id;
            const pathOptions = {
              color: isSelected ? '#3b82f6' : (isHighlighted ? (plotFilter === 'available' ? '#10b981' : '#ef4444') : getPlotColor(plot.status)),
              fillColor: isSelected ? '#3b82f6' : (isHighlighted ? (plotFilter === 'available' ? '#10b981' : '#ef4444') : getPlotColor(plot.status)),
              fillOpacity: isSelected ? 0.8 : (isHighlighted ? 0.7 : 0.5),
              weight: isSelected ? 5 : (isHighlighted ? 4 : 2),
              plotId: plot.id,
              className: isSelected ? 'selected-plot' : (isHighlighted ? 'highlighted-plot' : ''),
            };
            
            return (
              <Polygon
                key={`${plot.id}-${JSON.stringify(plot.map_coordinates)}`}
                positions={plot.map_coordinates as [number, number][]}
                pathOptions={pathOptions}
                eventHandlers={{
                  click: () => {
                    setSelectedPlotForEditing(plot.id);
                    onPlotClick(plot);
                  },
                }}
              >
                <Tooltip direction="top" offset={[0, -10]} opacity={1} permanent={false}>
                  <div className="text-xs">
                    <div className="font-bold">{plot.plot_number}</div>
                    <div className="text-gray-600">
                      {plot.plot_type} • {plot.status}
                    </div>
                  </div>
                </Tooltip>
              </Polygon>
            );
          })}

        {/* Legacy Rectangle Plots (not editable) */}
        {plots
          .filter((plot) => {
            return plot.map_coordinates && !Array.isArray(plot.map_coordinates) && 
                   plot.map_coordinates.x && plot.map_coordinates.y;
          })
          .map((plot) => {
            const pathOptions = {
              color: getPlotColor(plot.status),
              fillColor: getPlotColor(plot.status),
              fillOpacity: 0.5,
              weight: 2,
            };
            
            return (
              <Rectangle
                key={plot.id}
                bounds={getPlotBounds(plot as Plot & { map_coordinates: { x: number; y: number } })}
                pathOptions={pathOptions}
                eventHandlers={{
                  click: () => onPlotClick(plot),
                }}
              >
                <Tooltip direction="top" offset={[0, -10]} opacity={1} permanent={false}>
                  <div className="text-xs">
                    <div className="font-bold">{plot.plot_number}</div>
                    <div className="text-gray-600">
                      {plot.plot_type} • {plot.status}
                    </div>
                  </div>
                </Tooltip>
              </Rectangle>
            );
          })}

        {/* Facilities */}
        {facilities && facilities.map((facility) => {
          if (!facility.map_coordinates || !Array.isArray(facility.map_coordinates) || facility.map_coordinates.length === 0) {
            return null;
          }

          const style = getFacilityStyle(facility.facility_type);
          const pathOptions = {
            color: style.color,
            fillColor: style.color,
            fillOpacity: 0.3,
            weight: 3,
            dashArray: '5, 5',
          };

          return (
            <Polygon
              key={`facility-${facility.id}`}
              positions={facility.map_coordinates as [number, number][]}
              pathOptions={pathOptions}
              eventHandlers={{
                click: () => {
                  if (onFacilityClick) {
                    onFacilityClick(facility);
                  }
                },
              }}
            >
              <Tooltip direction="top" offset={[0, -10]} opacity={1} permanent={false}>
                <div className="text-xs">
                  <div className="flex items-center gap-1">
                    <span className="text-base">{style.icon}</span>
                    <span className="font-bold">{facility.name}</span>
                  </div>
                  <div className="text-gray-600 capitalize">
                    {facility.facility_type}
                  </div>
                  {facility.description && (
                    <div className="text-gray-500 text-[10px] mt-1">
                      {facility.description}
                    </div>
                  )}
                </div>
              </Tooltip>
            </Polygon>
          );
        })}
      </MapContainer>

      {/* Legend */}
      {mappingMode === 'plots' ? (
        <div className="absolute bottom-2 right-2 sm:bottom-4 sm:right-4 bg-white rounded-lg shadow-lg p-2 sm:p-3 z-[1000]">
          <h4 className="text-xs font-bold text-gray-900 mb-1 sm:mb-2">Plot Status</h4>
          <div className="space-y-0.5 sm:space-y-1">
            <div className="flex items-center gap-1 sm:gap-2">
              <div className="w-2.5 h-2.5 sm:w-3 sm:h-3 rounded-full bg-green-500"></div>
              <span className="text-[10px] sm:text-xs text-gray-700">Available</span>
            </div>
            <div className="flex items-center gap-1 sm:gap-2">
              <div className="w-2.5 h-2.5 sm:w-3 sm:h-3 rounded-full bg-blue-500"></div>
              <span className="text-[10px] sm:text-xs text-gray-700">Occupied</span>
            </div>
            <div className="flex items-center gap-1 sm:gap-2">
              <div className="w-2.5 h-2.5 sm:w-3 sm:h-3 rounded-full bg-yellow-500"></div>
              <span className="text-[10px] sm:text-xs text-gray-700">Reserved</span>
            </div>
            <div className="flex items-center gap-1 sm:gap-2">
              <div className="w-2.5 h-2.5 sm:w-3 sm:h-3 rounded-full bg-red-500"></div>
              <span className="text-[10px] sm:text-xs text-gray-700">Unavailable</span>
            </div>
          </div>
        </div>
      ) : (
        <div className="absolute bottom-2 right-2 sm:bottom-4 sm:right-4 bg-white rounded-lg shadow-lg p-2 sm:p-3 z-[1000] max-h-64 overflow-y-auto">
          <h4 className="text-xs font-bold text-gray-900 mb-1 sm:mb-2">Facilities</h4>
          <div className="space-y-0.5 sm:space-y-1">
            {['office', 'chapel', 'restroom', 'parking', 'gate', 'garden', 'pond', 'memorial'].map((type) => {
              const style = getFacilityStyle(type);
              const count = facilities?.filter(f => f.facility_type === type).length || 0;
              if (count === 0) return null;
              return (
                <div key={type} className="flex items-center gap-1 sm:gap-2">
                  <span className="text-sm">{style.icon}</span>
                  <span className="text-[10px] sm:text-xs text-gray-700 capitalize">{type}</span>
                  <span className="text-[10px] text-gray-500">({count})</span>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
