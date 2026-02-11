'use client';

import { useEffect } from 'react';
import { MapContainer, TileLayer, Polygon, Tooltip, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

// Fix for default marker icons
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
  map_coordinates: [number, number][];
  layers: number;
  occupied_layers: number;
}

interface PermitAssignmentMapProps {
  cemetery: Cemetery;
  plots: Plot[];
  selectedPlot: Plot | null;
  onPlotClick: (plot: Plot) => void;
}

function MapUpdater({ center }: { center: [number, number] }) {
  const map = useMap();
  
  useEffect(() => {
    map.setView(center, 18);
  }, [center, map]);
  
  return null;
}

export default function PermitAssignmentMap({
  cemetery,
  plots,
  selectedPlot,
  onPlotClick,
}: PermitAssignmentMapProps) {
  const centerLat = cemetery.latitude || 14.5995;
  const centerLng = cemetery.longitude || 120.9842;

  const getPlotColor = (plot: Plot) => {
    // Selected plot
    if (selectedPlot?.id === plot.id) {
      return '#8b5cf6'; // Purple
    }

    // Available plots (fully available or has available layers)
    if (plot.status === 'available') {
      return '#10b981'; // Green
    }
    
    if (plot.status === 'occupied' && plot.occupied_layers < plot.layers) {
      return '#3b82f6'; // Blue (partially occupied, has available layers)
    }

    // Full or unavailable plots
    return '#ef4444'; // Red
  };

  const getPlotOpacity = (plot: Plot) => {
    // Full plots are less visible
    if (plot.status === 'occupied' && plot.occupied_layers >= plot.layers) {
      return 0.3;
    }
    if (plot.status === 'reserved' || plot.status === 'maintenance') {
      return 0.3;
    }
    return 0.6;
  };

  const isPlotClickable = (plot: Plot) => {
    // Can click if available or has available layers
    if (plot.status === 'available') return true;
    if (plot.status === 'occupied' && plot.occupied_layers < plot.layers) return true;
    return false;
  };

  return (
    <div className="relative">
      {/* Legend */}
      <div className="absolute top-4 right-4 z-[1000] bg-white rounded-lg shadow-lg p-4 border border-slate-200">
        <h4 className="font-semibold text-sm text-slate-800 mb-2">Plot Status</h4>
        <div className="space-y-2 text-xs">
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 rounded" style={{ backgroundColor: '#10b981', opacity: 0.6 }}></div>
            <span className="text-slate-700">Available</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 rounded" style={{ backgroundColor: '#3b82f6', opacity: 0.6 }}></div>
            <span className="text-slate-700">Partial (layers available)</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 rounded" style={{ backgroundColor: '#ef4444', opacity: 0.3 }}></div>
            <span className="text-slate-700">Full / Unavailable</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 rounded" style={{ backgroundColor: '#8b5cf6', opacity: 0.6 }}></div>
            <span className="text-slate-700">Selected</span>
          </div>
        </div>
      </div>

      {/* Instructions */}
      <div className="mb-4 bg-blue-50 border border-blue-200 rounded-lg p-4">
        <p className="text-sm text-blue-800">
          <span className="font-semibold">💡 How to assign:</span> Click on a green (available) or blue (partially occupied) plot to select it. Full/unavailable plots cannot be selected.
        </p>
      </div>

      <div className="w-full h-[600px] rounded-xl overflow-hidden border border-slate-200 shadow-sm">
        <MapContainer
          center={[centerLat, centerLng]}
          zoom={18}
          style={{ height: '100%', width: '100%' }}
          scrollWheelZoom={true}
        >
          <MapUpdater center={[centerLat, centerLng]} />
          
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />

          {/* Cemetery Boundary */}
          {cemetery.map_coordinates && cemetery.map_coordinates.length > 0 && (
            <Polygon
              positions={cemetery.map_coordinates}
              pathOptions={{
                color: '#6366f1',
                fillColor: '#6366f1',
                fillOpacity: 0.05,
                weight: 3,
              }}
            >
              <Tooltip permanent direction="center">
                <span className="font-semibold">{cemetery.name}</span>
              </Tooltip>
            </Polygon>
          )}

          {/* Plot Polygons */}
          {plots.map((plot) => {
            if (!plot.map_coordinates || plot.map_coordinates.length === 0) return null;

            const coordinates = Array.isArray(plot.map_coordinates[0])
              ? plot.map_coordinates
              : [[0, 0]]; // Fallback

            const clickable = isPlotClickable(plot);

            return (
              <Polygon
                key={plot.id}
                positions={coordinates as [number, number][]}
                pathOptions={{
                  color: getPlotColor(plot),
                  fillColor: getPlotColor(plot),
                  fillOpacity: getPlotOpacity(plot),
                  weight: selectedPlot?.id === plot.id ? 3 : 1.5,
                }}
                eventHandlers={{
                  click: clickable ? () => onPlotClick(plot) : undefined,
                  mouseover: (e) => {
                    if (clickable) {
                      e.target.setStyle({
                        weight: 3,
                        fillOpacity: 0.8,
                      });
                    }
                  },
                  mouseout: (e) => {
                    if (clickable && selectedPlot?.id !== plot.id) {
                      e.target.setStyle({
                        weight: 1.5,
                        fillOpacity: getPlotOpacity(plot),
                      });
                    }
                  },
                }}
              >
                <Tooltip>
                  <div className="text-xs">
                    <div className="font-bold">{plot.plot_number}</div>
                    <div className="capitalize">{plot.status}</div>
                    {plot.layers > 1 && (
                      <div className="text-slate-600">
                        Layers: {plot.occupied_layers || 0} / {plot.layers}
                      </div>
                    )}
                    {clickable && (
                      <div className="text-green-600 font-semibold mt-1">
                        Click to select
                      </div>
                    )}
                    {!clickable && (
                      <div className="text-red-600 font-semibold mt-1">
                        Unavailable
                      </div>
                    )}
                  </div>
                </Tooltip>
              </Polygon>
            );
          })}
        </MapContainer>
      </div>
    </div>
  );
}
