'use client';

import { useEffect } from 'react';
import L from 'leaflet';
import { MapContainer, TileLayer, FeatureGroup, Polygon, useMap } from 'react-leaflet';
import { EditControl } from 'react-leaflet-draw';
import 'leaflet/dist/leaflet.css';
import 'leaflet-draw/dist/leaflet.draw.css';

// Fix for default marker icons in Leaflet
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
});

interface CemeteryMapProps {
  center?: [number, number];
  existingBoundary?: [number, number][];
  onBoundaryChange: (coordinates: [number, number][]) => void;
}

function MapController({ center }: { center: [number, number] }) {
  const map = useMap();
  
  useEffect(() => {
    map.setView(center, 13);
  }, [map, center]);
  
  return null;
}

export default function CemeteryMap({ 
  center = [14.5995, 120.9842], // Default: Manila, Philippines
  existingBoundary,
  onBoundaryChange 
}: CemeteryMapProps) {
  
  const handleCreated = (e: any) => {
    const layer = e.layer;
    const coordinates = layer.getLatLngs()[0].map((latLng: L.LatLng) => [
      latLng.lat,
      latLng.lng,
    ]);
    onBoundaryChange(coordinates);
  };

  const handleEdited = (e: any) => {
    const layers = e.layers;
    layers.eachLayer((layer: any) => {
      const coordinates = layer.getLatLngs()[0].map((latLng: L.LatLng) => [
        latLng.lat,
        latLng.lng,
      ]);
      onBoundaryChange(coordinates);
    });
  };

  const handleDeleted = () => {
    onBoundaryChange([]);
  };

  return (
    <div className="h-[600px] w-full rounded-lg overflow-hidden border border-gray-300">
      <MapContainer
        center={center}
        zoom={13}
        style={{ height: '100%', width: '100%' }}
        scrollWheelZoom={true}
      >
        <MapController center={center} />
        
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        
        <FeatureGroup>
          <EditControl
            position="topright"
            onCreated={handleCreated}
            onEdited={handleEdited}
            onDeleted={handleDeleted}
            draw={{
              rectangle: false,
              circle: false,
              circlemarker: false,
              marker: false,
              polyline: false,
              polygon: {
                allowIntersection: false,
                showArea: true,
                shapeOptions: {
                  color: '#4F46E5',
                  fillColor: '#4F46E5',
                  fillOpacity: 0.2,
                },
              },
            }}
          />
          
          {existingBoundary && existingBoundary.length > 0 && (
            <Polygon
              positions={existingBoundary}
              pathOptions={{
                color: '#4F46E5',
                fillColor: '#4F46E5',
                fillOpacity: 0.2,
              }}
            />
          )}
        </FeatureGroup>
      </MapContainer>
    </div>
  );
}
