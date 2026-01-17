'use client';

import { useState, useEffect, ComponentType } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Navbar from '@/components/Navbar';
import dynamic from 'next/dynamic';

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

const PlotMap = dynamic<PlotMapProps>(
  () => import('../../../../../components/PlotMap'),
  {
    ssr: false,
    loading: () => (
      <div className="h-[calc(100vh-200px)] w-full rounded-lg overflow-hidden border border-gray-300 flex items-center justify-center bg-gray-50">
        <p className="text-gray-500">Loading map...</p>
      </div>
    ),
  }
);

export default function CemeteryMapPage() {
  const params = useParams();
  const router = useRouter();
  const cemeteryId = params.id as string;

  const [cemetery, setCemetery] = useState<Cemetery | null>(null);
  const [plots, setPlots] = useState<Plot[]>([]);
  const [allBurials, setAllBurials] = useState<{plot_id: number}[]>([]);
  const [loading, setLoading] = useState(true);
  const [showPlotForm, setShowPlotForm] = useState(false);
  const [selectedCoordinates, setSelectedCoordinates] = useState<[number, number][] | null>(null);
  const [selectedPlot, setSelectedPlot] = useState<Plot | null>(null);
  const [showEditModal, setShowEditModal] = useState(false);
  const [selectedTemplate, setSelectedTemplate] = useState<string | null>(null);
  const [templateRotation, setTemplateRotation] = useState(0);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<Plot[]>([]);
  const [facilitySearchResults, setFacilitySearchResults] = useState<Facility[]>([]);
  const [showSearchResults, setShowSearchResults] = useState(false);
  const [centerCoordinates, setCenterCoordinates] = useState<[number, number] | null>(null);
  const [showOnlyVacant, setShowOnlyVacant] = useState(false);
  const [mappingMode, setMappingMode] = useState<'plots' | 'facilities'>('plots');
  const [facilities, setFacilities] = useState<Facility[]>([]);
  const [showFacilityForm, setShowFacilityForm] = useState(false);
  const [selectedFacilityCoordinates, setSelectedFacilityCoordinates] = useState<[number, number][] | null>(null);
  const [selectedFacility, setSelectedFacility] = useState<Facility | null>(null);
  const [showFacilityEditModal, setShowFacilityEditModal] = useState(false);

  // Common cemetery plot templates (width x length in meters)
  const plotTemplates = [
    { id: 'small', name: '2m × 1m', width: 2, length: 1 },
    { id: 'standard', name: '2.5m × 1m', width: 2.5, length: 1 },
    { id: 'medium', name: '2m × 2m', width: 2, length: 2 },
    { id: 'large', name: '3m × 2m', width: 3, length: 2 },
    { id: 'family', name: '3m × 3m', width: 3, length: 3 },
  ];

  useEffect(() => {
    fetchCemeteryData();
    fetchPlots();
    fetchAllBurials();
    fetchFacilities();
  }, [cemeteryId]);

  const fetchCemeteryData = async () => {
    try {
      const response = await fetch(`/api/cemeteries/${cemeteryId}`);
      const data = await response.json();
      setCemetery(data.cemetery);
      
      // Calculate and set the center of the cemetery for initial map view
      if (data.cemetery?.map_coordinates && data.cemetery.map_coordinates.length > 0) {
        const coords = data.cemetery.map_coordinates;
        const latSum = coords.reduce((sum: number, [lat]: [number, number]) => sum + lat, 0);
        const lngSum = coords.reduce((sum: number, [, lng]: [number, number]) => sum + lng, 0);
        const centerLat = latSum / coords.length;
        const centerLng = lngSum / coords.length;
        setCenterCoordinates([centerLat, centerLng]);
      }
    } catch (error) {
      console.error('Error fetching cemetery:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchPlots = async () => {
    try {
      const response = await fetch(`/api/plots?cemetery_id=${cemeteryId}`);
      const data = await response.json();
      setPlots(data.plots || []);
    } catch (error) {
      console.error('Error fetching plots:', error);
    }
  };

  const fetchAllBurials = async () => {
    try {
      // Fetch all burials for this cemetery's plots
      const response = await fetch(`/api/burials?cemetery_id=${cemeteryId}`);
      const data = await response.json();
      setAllBurials(data.burials || []);
    } catch (error) {
      console.error('Error fetching burials:', error);
      setAllBurials([]);
    }
  };

  const fetchFacilities = async () => {
    try {
      const response = await fetch(`/api/facilities?cemetery_id=${cemeteryId}`);
      const data = await response.json();
      setFacilities(data.facilities || []);
    } catch (error) {
      console.error('Error fetching facilities:', error);
      setFacilities([]);
    }
  };

  const handleFacilityDrawn = (coordinates: [number, number][]) => {
    setSelectedFacilityCoordinates(coordinates);
    setShowFacilityForm(true);
  };

  const handleFacilityCreated = () => {
    fetchFacilities();
    setShowFacilityForm(false);
    setSelectedFacilityCoordinates(null);
  };

  const handleFacilityClick = (facility: Facility) => {
    setSelectedFacility(facility);
    setShowFacilityEditModal(true);
  };

  const handlePlotDrawn = (coordinates: [number, number][]) => {
    setSelectedCoordinates(coordinates);
    setShowPlotForm(true);
  };

  const handlePlotCreated = () => {
    fetchPlots();
    fetchAllBurials();
    setShowPlotForm(false);
    setSelectedCoordinates(null);
  };

  const handlePlotEdited = async (plotId: number, coordinates: [number, number][]) => {
    try {
      const plot = plots.find(p => p.id === plotId);
      if (!plot) return;

      // Calculate center coordinates from the new polygon
      const latSum = coordinates.reduce((sum, [lat]) => sum + lat, 0);
      const lngSum = coordinates.reduce((sum, [, lng]) => sum + lng, 0);
      const centerLat = latSum / coordinates.length;
      const centerLng = lngSum / coordinates.length;

      const response = await fetch(`/api/plots/${plotId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          plot_number: plot.plot_number,
          plot_type: plot.plot_type,
          status: plot.status,
          layers: plot.layers || 1,
          latitude: centerLat,
          longitude: centerLng,
          map_coordinates: coordinates,
        }),
      });

      if (response.ok) {
        fetchPlots();
      } else {
        alert('Failed to update plot shape');
      }
    } catch (error) {
      console.error('Error updating plot:', error);
      alert('Error updating plot shape');
    }
  };

  const handleSearch = (query: string) => {
    setSearchQuery(query);
    if (query.trim()) {
      const plotResults = plots.filter(plot => 
        plot.plot_number.toLowerCase().includes(query.toLowerCase())
      );
      const facilityResults = facilities.filter(facility =>
        facility.name.toLowerCase().includes(query.toLowerCase()) ||
        facility.facility_type.toLowerCase().includes(query.toLowerCase())
      );
      setSearchResults(plotResults);
      setFacilitySearchResults(facilityResults);
      setShowSearchResults(true);
    } else {
      setSearchResults([]);
      setFacilitySearchResults([]);
      setShowSearchResults(false);
    }
  };

  const handleSelectPlot = (plot: Plot) => {
    setSelectedPlot(plot);
    setSearchQuery('');
    setShowSearchResults(false);
    
    // Center map on the selected plot
    if (Array.isArray(plot.map_coordinates)) {
      // Calculate center from polygon coordinates
      const coords = plot.map_coordinates as [number, number][];
      const latSum = coords.reduce((sum, [lat]) => sum + lat, 0);
      const lngSum = coords.reduce((sum, [, lng]) => sum + lng, 0);
      const centerLat = latSum / coords.length;
      const centerLng = lngSum / coords.length;
      setCenterCoordinates([centerLat, centerLng]);
    } else if (plot.map_coordinates && 'x' in plot.map_coordinates && 'y' in plot.map_coordinates) {
      // Legacy format - x is lat, y is lng
      setCenterCoordinates([plot.map_coordinates.x, plot.map_coordinates.y]);
    }
  };

  const handleSelectFacility = (facility: Facility) => {
    setSearchQuery('');
    setShowSearchResults(false);
    
    // Center map on the selected facility
    if (facility.latitude && facility.longitude) {
      setCenterCoordinates([facility.latitude, facility.longitude]);
    } else if (Array.isArray(facility.map_coordinates) && facility.map_coordinates.length > 0) {
      // If it's a polygon, calculate center
      if (Array.isArray(facility.map_coordinates[0])) {
        const coords = facility.map_coordinates as [number, number][];
        const latSum = coords.reduce((sum, [lat]) => sum + lat, 0);
        const lngSum = coords.reduce((sum, [, lng]) => sum + lng, 0);
        const centerLat = latSum / coords.length;
        const centerLng = lngSum / coords.length;
        setCenterCoordinates([centerLat, centerLng]);
      } else {
        // It's already a point
        const [lat, lng] = facility.map_coordinates as [number, number];
        setCenterCoordinates([lat, lng]);
      }
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Navbar />
        <div className="flex items-center justify-center h-[calc(100vh-64px)]">
          <p className="text-gray-500">Loading...</p>
        </div>
      </div>
    );
  }

  if (!cemetery) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Navbar />
        <div className="flex items-center justify-center h-[calc(100vh-64px)]">
          <p className="text-red-500">Cemetery not found</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />
      
      <div className="w-full px-2 sm:px-4 lg:px-6 py-4">
        <div className="mb-4 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2 sm:gap-4">
          <div className="flex-1">
            <h1 className="text-lg sm:text-2xl font-bold text-gray-900">{cemetery.name} - Cemetery Mapping</h1>
            <p className="text-sm text-gray-600">Map plots and facilities</p>
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => router.back()}
              className="px-3 py-2 sm:px-4 text-sm border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors whitespace-nowrap"
            >
              ← Back
            </button>
          </div>
        </div>

        {/* Mapping Mode Tabs */}
        <div className="mb-4 flex gap-2 border-b border-gray-200">
          <button
            onClick={() => setMappingMode('plots')}
            className={`px-4 py-2 font-medium transition-colors border-b-2 ${
              mappingMode === 'plots'
                ? 'text-blue-600 border-blue-600'
                : 'text-gray-500 border-transparent hover:text-gray-700'
            }`}
          >
            Plot Mapping
          </button>
          <button
            onClick={() => setMappingMode('facilities')}
            className={`px-4 py-2 font-medium transition-colors border-b-2 ${
              mappingMode === 'facilities'
                ? 'text-blue-600 border-blue-600'
                : 'text-gray-500 border-transparent hover:text-gray-700'
            }`}
          >
            Facility Mapping
          </button>
        </div>

        {/* Stats Bar */}
        {mappingMode === 'plots' ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 sm:gap-4 mb-4">
            <div className="bg-white rounded-lg shadow p-3 sm:p-4">
              <p className="text-xs sm:text-sm text-gray-600">Total Plots</p>
              <p className="text-xl sm:text-2xl font-bold text-gray-900">{plots.length}</p>
            </div>
            <div className="bg-white rounded-lg shadow p-3 sm:p-4">
              <p className="text-xs sm:text-sm text-gray-600">Total Capacity</p>
              <p className="text-xl sm:text-2xl font-bold text-gray-900">
                {plots.reduce((sum, p) => sum + (p.layers || 1), 0)}
              </p>
            </div>
            <div className="bg-white rounded-lg shadow p-3 sm:p-4">
              <p className="text-xs sm:text-sm text-gray-600">Occupied Layers</p>
              <p className="text-xl sm:text-2xl font-bold text-blue-600">
                {allBurials.length}
              </p>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 sm:gap-4 mb-4">
            <div className="bg-white rounded-lg shadow p-3 sm:p-4">
              <p className="text-xs sm:text-sm text-gray-600">Total Facilities</p>
              <p className="text-xl sm:text-2xl font-bold text-gray-900">{facilities.length}</p>
            </div>
            <div className="bg-white rounded-lg shadow p-3 sm:p-4">
              <p className="text-xs sm:text-sm text-gray-600">Facility Types</p>
              <p className="text-xl sm:text-2xl font-bold text-gray-900">
                {new Set(facilities.map(f => f.facility_type)).size}
              </p>
            </div>
            <div className="bg-white rounded-lg shadow p-3 sm:p-4">
              <p className="text-xs sm:text-sm text-gray-600">Latest Added</p>
              <p className="text-xl sm:text-2xl font-bold text-blue-600">
                {facilities.length > 0 ? facilities[facilities.length - 1].name : 'None'}
              </p>
            </div>
          </div>
        )}

        {/* Map and Sidebar Container */}
        <div className="flex gap-4">
          {/* Left Sidebar for Forms */}
          <div className="flex-shrink-0 w-96">
            {/* Plot Mode Sidebars */}
            {mappingMode === 'plots' && showPlotForm && selectedCoordinates && (
              <PlotFormSidebar
                cemeteryId={parseInt(cemeteryId)}
                coordinates={selectedCoordinates}
                onClose={() => {
                  setShowPlotForm(false);
                  setSelectedCoordinates(null);
                }}
                onSuccess={handlePlotCreated}
              />
            )}
            
            {mappingMode === 'plots' && showEditModal && selectedPlot && !showPlotForm && (
              <EditPlotModal
                plot={selectedPlot}
                onClose={() => {
                  setShowEditModal(false);
                  setSelectedPlot(null);
                }}
                onSuccess={() => {
                  fetchPlots();
                  fetchAllBurials();
                  setShowEditModal(false);
                  setSelectedPlot(null);
                }}
              />
            )}
            
            {mappingMode === 'plots' && !showPlotForm && !showEditModal && (
              <div className="bg-white rounded-lg shadow p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-2">Plot Mapping</h3>
                <p className="text-sm text-gray-600 mb-4">
                  Click and draw on the map to create a new grave plot. Click existing plots to edit them.
                </p>

                {/* Filter Controls */}
                <div className="border-t border-gray-200 pt-4 mt-4">
                  <h4 className="text-sm font-semibold text-gray-900 mb-3">Filter Plots</h4>
                  <button
                    onClick={() => setShowOnlyVacant(!showOnlyVacant)}
                    className={`w-full px-4 py-3 text-sm font-medium rounded-lg transition-all text-left flex items-center justify-between ${
                      showOnlyVacant
                        ? 'bg-green-600 text-white shadow-md'
                        : 'bg-gray-50 text-gray-700 border border-gray-200 hover:bg-gray-100'
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <div className={`w-5 h-5 rounded border-2 flex items-center justify-center ${
                        showOnlyVacant ? 'bg-white border-white' : 'border-gray-300'
                      }`}>
                        {showOnlyVacant && (
                          <svg className="w-4 h-4 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                          </svg>
                        )}
                      </div>
                      <span>Highlight Vacant Plots</span>
                    </div>
                    <span className={`text-xs px-2 py-1 rounded-full ${
                      showOnlyVacant ? 'bg-green-700' : 'bg-gray-200 text-gray-700'
                    }`}>
                      {plots.filter(p => {
                        const occupied = allBurials.filter(b => b.plot_id === p.id).length;
                        return occupied < (p.layers || 1);
                      }).length}
                    </span>
                  </button>
                </div>
              </div>
            )}

            {/* Facility Mode Sidebars */}
            {mappingMode === 'facilities' && showFacilityForm && selectedFacilityCoordinates && (
              <FacilityFormSidebar
                cemeteryId={parseInt(cemeteryId)}
                coordinates={selectedFacilityCoordinates}
                onClose={() => {
                  setShowFacilityForm(false);
                  setSelectedFacilityCoordinates(null);
                }}
                onSuccess={handleFacilityCreated}
              />
            )}

            {mappingMode === 'facilities' && !showFacilityForm && !showFacilityEditModal && (
              <div className="bg-white rounded-lg shadow p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-2">Facility Mapping</h3>
                <p className="text-sm text-gray-600 mb-4">
                  Click and draw on the map to create a new facility. Click existing facilities to edit them.
                </p>

                {/* Facility List */}
                {facilities.length > 0 && (
                  <div className="border-t border-gray-200 pt-4 mt-4">
                    <h4 className="text-sm font-semibold text-gray-900 mb-3">Existing Facilities</h4>
                    <div className="space-y-2 max-h-96 overflow-y-auto">
                      {facilities.map((facility) => (
                        <button
                          key={facility.id}
                          onClick={() => handleFacilityClick(facility)}
                          className="w-full p-3 border border-gray-200 rounded-lg hover:bg-gray-50 text-left transition-colors"
                        >
                          <div className="flex items-center gap-2">
                            <span className="text-2xl">
                              {facility.facility_type === 'office' && '🏢'}
                              {facility.facility_type === 'chapel' && '⛪'}
                              {facility.facility_type === 'restroom' && '🚻'}
                              {facility.facility_type === 'parking' && '🅿️'}
                              {facility.facility_type === 'gate' && '🚪'}
                              {facility.facility_type === 'crematorium' && '🔥'}
                              {facility.facility_type === 'columbarium' && '🏛️'}
                              {facility.facility_type === 'garden' && '🌳'}
                              {facility.facility_type === 'pond' && '💧'}
                              {facility.facility_type === 'fountain' && '⛲'}
                              {facility.facility_type === 'bench' && '🪑'}
                              {facility.facility_type === 'memorial' && '🗿'}
                              {!['office', 'chapel', 'restroom', 'parking', 'gate', 'crematorium', 'columbarium', 'garden', 'pond', 'fountain', 'bench', 'memorial'].includes(facility.facility_type) && '📍'}
                            </span>
                            <div className="flex-1">
                              <div className="font-medium text-gray-900">{facility.name}</div>
                              <div className="text-xs text-gray-500 capitalize">{facility.facility_type}</div>
                            </div>
                          </div>
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Map */}
          <div className="flex-1 bg-white rounded-lg shadow p-4">
            <PlotMap
              cemetery={cemetery}
              plots={plots}
              selectedPlot={selectedPlot}
              onPlotCreated={handlePlotDrawn}
              onPlotEdited={handlePlotEdited}
              selectedTemplate={
                selectedTemplate
                  ? plotTemplates.find((t) => t.id === selectedTemplate) || null
                  : null
              }
              templateRotation={templateRotation}
              onTemplateChange={setSelectedTemplate}
              onRotationChange={setTemplateRotation}
              plotTemplates={plotTemplates}
              onPlotClick={(plot: Plot) => {
                setSelectedPlot(plot);
                setShowEditModal(true);
              }}
              searchQuery={searchQuery}
              searchResults={searchResults}
              facilitySearchResults={facilitySearchResults}
              showSearchResults={showSearchResults}
              onSearchChange={handleSearch}
              onSearchResultClick={handleSelectPlot}
              onFacilityResultClick={handleSelectFacility}
              onCloseSearch={() => setShowSearchResults(false)}
              centerCoordinates={centerCoordinates}
              plotFilter={showOnlyVacant ? 'available' : 'all'}
              allBurials={allBurials}
              mappingMode={mappingMode}
              facilities={facilities}
              onFacilityCreated={handleFacilityDrawn}
              onFacilityClick={handleFacilityClick}
            />
          </div>
        </div>
      </div>

      {/* Facility Edit Modal */}
      {showFacilityEditModal && selectedFacility && (
        <EditFacilityModal
          facility={selectedFacility}
          onClose={() => {
            setShowFacilityEditModal(false);
            setSelectedFacility(null);
          }}
          onSuccess={() => {
            fetchFacilities();
            setShowFacilityEditModal(false);
            setSelectedFacility(null);
          }}
        />
      )}
    </div>
  );
}

function PlotFormSidebar({
  cemeteryId,
  coordinates,
  onClose,
  onSuccess,
}: {
  cemeteryId: number;
  coordinates: [number, number][];
  onClose: () => void;
  onSuccess: () => void;
}) {
  // Calculate center from polygon coordinates
  const latSum = coordinates.reduce((sum, [lat]) => sum + lat, 0);
  const lngSum = coordinates.reduce((sum, [, lng]) => sum + lng, 0);
  const centerLat = latSum / coordinates.length;
  const centerLng = lngSum / coordinates.length;
  
  // Calculate approximate dimensions in meters (rough estimation)
  const lats = coordinates.map(([lat]) => lat);
  const lngs = coordinates.map(([, lng]) => lng);
  const latDiff = Math.max(...lats) - Math.min(...lats);
  const lngDiff = Math.max(...lngs) - Math.min(...lngs);
  const metersPerDegree = 111000; // approximate
  const estimatedLength = (latDiff * metersPerDegree).toFixed(2);
  const estimatedWidth = (lngDiff * metersPerDegree * Math.cos(centerLat * Math.PI / 180)).toFixed(2);

  const [formData, setFormData] = useState({
    plot_number: '',
    plot_type: 'single',
    status: 'available',
    size_length: estimatedLength,
    size_width: estimatedWidth,
    price: '',
    notes: '',
    layers: '1',
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsSubmitting(true);

    try {
      const payload = {
        cemetery_id: cemeteryId,
        plot_number: formData.plot_number,
        plot_type: formData.plot_type,
        status: formData.status,
        size_length: formData.size_length ? parseFloat(formData.size_length) : undefined,
        size_width: formData.size_width ? parseFloat(formData.size_width) : undefined,
        price: formData.price ? parseFloat(formData.price) : undefined,
        notes: formData.notes || undefined,
        layers: formData.layers ? parseInt(formData.layers) : 1,
        latitude: centerLat,
        longitude: centerLng,
        map_coordinates: coordinates,
      };

      const response = await fetch('/api/plots', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to create plot');
      }

      onSuccess();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="bg-white rounded-lg shadow-xl p-6 max-h-[calc(100vh-280px)] overflow-y-auto">
      <div className="flex justify-between items-center mb-4">
        <h3 className="text-xl font-bold text-gray-900">Add Grave Plot</h3>
        <button
          onClick={onClose}
          className="text-gray-400 hover:text-gray-600 transition-colors"
        >
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>

      {/* Coordinate Info */}
      <div className="bg-blue-50 border border-blue-200 rounded-md p-3 mb-4">
        <div className="flex items-start gap-2">
          <svg className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
          </svg>
          <div className="flex-1">
            <p className="text-sm font-medium text-blue-900">Coordinates Auto-Captured</p>
            <p className="text-xs text-blue-700 mt-1">
              Center: {centerLat.toFixed(6)}, {centerLng.toFixed(6)}
            </p>
            <p className="text-xs text-blue-600 mt-1">
              This plot's coordinates will be saved for the grave locator feature.
            </p>
          </div>
        </div>
      </div>
      
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Plot Number *
          </label>
          <input
            type="text"
            required
            value={formData.plot_number}
            onChange={(e) => setFormData({ ...formData, plot_number: e.target.value })}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
            placeholder="e.g., A-1, B-23"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Plot Type
          </label>
          <select
            value={formData.plot_type}
            onChange={(e) => setFormData({ ...formData, plot_type: e.target.value })}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
          >
            <option value="single">Single</option>
            <option value="double">Double</option>
            <option value="family">Family</option>
            <option value="cremation">Cremation</option>
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Number of Layers
          </label>
          <input
            type="number"
            min="1"
            max="10"
            value={formData.layers}
            onChange={(e) => setFormData({ ...formData, layers: e.target.value })}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
            placeholder="How many burial layers?"
          />
          <p className="text-xs text-gray-500 mt-1">Specify how many layers this plot can hold (e.g., 2 = ground + second level)</p>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Length (m)
            </label>
            <input
              type="number"
              step="0.01"
              value={formData.size_length}
              onChange={(e) => setFormData({ ...formData, size_length: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Width (m)
            </label>
            <input
              type="number"
              step="0.01"
              value={formData.size_width}
              onChange={(e) => setFormData({ ...formData, size_width: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Price
          </label>
          <input
            type="number"
            step="0.01"
            value={formData.price}
            onChange={(e) => setFormData({ ...formData, price: e.target.value })}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Notes
          </label>
          <textarea
            value={formData.notes}
            onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
            rows={2}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 rounded-md p-3">
            <p className="text-sm text-red-800">{error}</p>
          </div>
        )}

        <div className="flex gap-3">
          <button
            type="button"
            onClick={onClose}
            className="flex-1 px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={isSubmitting}
            className="flex-1 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors disabled:opacity-50"
          >
            {isSubmitting ? 'Adding...' : 'Add Plot'}
          </button>
        </div>
      </form>
    </div>
  );
}

function EditPlotModal({
  plot,
  onClose,
  onSuccess,
}: {
  plot: Plot;
  onClose: () => void;
  onSuccess: () => void;
}) {
  const [view, setView] = useState<'details' | 'burials'>('details');
  const [formData, setFormData] = useState({
    plot_number: plot.plot_number,
    plot_type: plot.plot_type,
    status: plot.status,
    size_length: plot.size_length?.toString() || '',
    size_width: plot.size_width?.toString() || '',
    price: '',
    notes: '',
    layers: plot.layers?.toString() || '1',
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [burials, setBurials] = useState<Burial[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddBurialForm, setShowAddBurialForm] = useState(false);
  const [selectedLayer, setSelectedLayer] = useState('1');
  const [deceasedForm, setDeceasedForm] = useState({
    firstName: '',
    lastName: '',
    dateOfBirth: '',
    dateOfDeath: '',
  });
  const [burialDate, setBurialDate] = useState('');
  const [burialNotes, setBurialNotes] = useState('');

  useEffect(() => {
    fetchBurials();
  }, [plot.id]);

  useEffect(() => {
    // Update formData when plot changes
    setFormData({
      plot_number: plot.plot_number,
      plot_type: plot.plot_type,
      status: plot.status,
      size_length: plot.size_length?.toString() || '',
      size_width: plot.size_width?.toString() || '',
      price: '',
      notes: '',
      layers: plot.layers?.toString() || '1',
    });
  }, [plot.id, plot.layers, plot.plot_number, plot.plot_type, plot.status, plot.size_length, plot.size_width]);

  const fetchBurials = async () => {
    try {
      const response = await fetch(`/api/burials?plot_id=${plot.id}`, {
        credentials: 'include',
      });
      if (!response.ok) {
        throw new Error('Failed to fetch burials');
      }
      const data = await response.json();
      setBurials(data.burials || []);
    } catch (error) {
      console.error('Error fetching burials:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsSubmitting(true);

    try {
      const payload = {
        plot_number: formData.plot_number,
        plot_type: formData.plot_type,
        status: formData.status,
        size_length: formData.size_length ? parseFloat(formData.size_length) : undefined,
        size_width: formData.size_width ? parseFloat(formData.size_width) : undefined,
        price: formData.price ? parseFloat(formData.price) : undefined,
        notes: formData.notes || undefined,
        layers: formData.layers ? parseInt(formData.layers) : 1,
        map_coordinates: plot.map_coordinates,
      };

      const response = await fetch(`/api/plots/${plot.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to update plot');
      }

      // Update the plot object with new data from response
      if (data.plot) {
        plot.layers = data.plot.layers;
        plot.plot_number = data.plot.plot_number;
        plot.plot_type = data.plot.plot_type;
        plot.status = data.plot.status;
        plot.size_length = data.plot.size_length;
        plot.size_width = data.plot.size_width;
      }
      
      // Refresh burials to update capacity display
      fetchBurials();
      
      // Show success message without closing
      alert('Plot updated successfully!');
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async () => {
    setError('');
    setIsSubmitting(true);

    try {
      const response = await fetch(`/api/plots/${plot.id}`, {
        method: 'DELETE',
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to delete plot');
      }

      onSuccess();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleAssignBurial = async () => {
    if (!deceasedForm.firstName || !deceasedForm.lastName) {
      setError('Please enter first name and last name');
      return;
    }
    if (!deceasedForm.dateOfDeath) {
      setError('Please enter date of death');
      return;
    }

    setIsSubmitting(true);
    setError('');

    try {
      // First, create or find the deceased record
      const deceasedResponse = await fetch('/api/deceased', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          first_name: deceasedForm.firstName,
          last_name: deceasedForm.lastName,
          date_of_birth: deceasedForm.dateOfBirth || null,
          date_of_death: deceasedForm.dateOfDeath,
        }),
      });

      if (!deceasedResponse.ok) {
        const errorData = await deceasedResponse.json();
        throw new Error(errorData.error || 'Failed to create deceased record');
      }

      const deceasedData = await deceasedResponse.json();
      const deceasedId = deceasedData.deceased.id;

      // Now assign the burial
      const response = await fetch('/api/burials', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          plot_id: plot.id,
          deceased_id: deceasedId,
          layer: parseInt(selectedLayer),
          burial_date: burialDate || undefined,
          notes: burialNotes || undefined,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to assign burial');
      }

      // Reset form
      setShowAddBurialForm(false);
      setDeceasedForm({
        firstName: '',
        lastName: '',
        dateOfBirth: '',
        dateOfDeath: '',
      });
      setBurialDate('');
      setBurialNotes('');
      setSelectedLayer('1');
      
      // Refresh burials
      fetchBurials();
      
      // Update plot status and refresh parent list
      onSuccess();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleRemoveBurial = async (burialId: number) => {
    if (!confirm('Are you sure you want to remove this burial assignment?')) {
      return;
    }

    try {
      const response = await fetch(`/api/burials/${burialId}`, {
        method: 'DELETE',
        credentials: 'include',
      });

      if (!response.ok) {
        throw new Error('Failed to remove burial');
      }

      fetchBurials();
      
      // Refresh parent list to update stats
      onSuccess();
    } catch (err: any) {
      setError(err.message);
    }
  };

  return (
    <div className="bg-white rounded-lg shadow-xl max-h-[calc(100vh-280px)] overflow-y-auto">
      {/* Header */}
      <div className="sticky top-0 bg-white border-b border-gray-200 p-4 z-10">
        <div className="flex justify-between items-center mb-3">
          <h3 className="text-xl font-bold text-gray-900">Plot {plot.plot_number}</h3>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
        
        {/* Tab Navigation */}
        <div className="flex gap-2">
          <button
            onClick={() => setView('details')}
            className={`flex-1 px-4 py-2 text-sm font-medium rounded-lg transition-colors ${
              view === 'details'
                ? 'bg-indigo-600 text-white'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            Plot Details
          </button>
          <button
            onClick={() => setView('burials')}
            className={`flex-1 px-4 py-2 text-sm font-medium rounded-lg transition-colors ${
              view === 'burials'
                ? 'bg-indigo-600 text-white'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            Burials ({burials.length})
          </button>
        </div>
      </div>

      <div className="p-4">
        {/* Plot Details View */}
        {view === 'details' && !showDeleteConfirm && (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Plot Number *
              </label>
              <input
                type="text"
                required
                value={formData.plot_number}
                onChange={(e) => setFormData({ ...formData, plot_number: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
                placeholder="e.g., A-1, B-23"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Plot Type
              </label>
              <select
                value={formData.plot_type}
                onChange={(e) => setFormData({ ...formData, plot_type: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
              >
                <option value="single">Single</option>
                <option value="double">Double</option>
                <option value="family">Family</option>
                <option value="cremation">Cremation</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Number of Layers
              </label>
              <input
                type="number"
                min="1"
                max="10"
                value={formData.layers}
                onChange={(e) => setFormData({ ...formData, layers: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
                placeholder="How many burial layers?"
              />
              <p className="text-xs text-gray-500 mt-1">Specify how many layers this plot can hold</p>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Length (m)
                </label>
                <input
                  type="number"
                  step="0.01"
                  value={formData.size_length}
                  onChange={(e) => setFormData({ ...formData, size_length: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Width (m)
                </label>
                <input
                  type="number"
                  step="0.01"
                  value={formData.size_width}
                  onChange={(e) => setFormData({ ...formData, size_width: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Price
              </label>
              <input
                type="number"
                step="0.01"
                value={formData.price}
                onChange={(e) => setFormData({ ...formData, price: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Notes
              </label>
              <textarea
                value={formData.notes}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                rows={2}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>

            {error && (
              <div className="bg-red-50 border border-red-200 rounded-md p-3">
                <p className="text-sm text-red-800">{error}</p>
              </div>
            )}

            <div className="flex gap-3">
              <button
                type="button"
                onClick={() => setShowDeleteConfirm(true)}
                className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors disabled:opacity-50"
                disabled={isSubmitting}
              >
                Delete
              </button>
              <button
                type="submit"
                disabled={isSubmitting}
                className="flex-1 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors disabled:opacity-50"
              >
                {isSubmitting ? 'Updating...' : 'Update'}
              </button>
            </div>
          </form>
        )}

        {/* Delete Confirmation */}
        {view === 'details' && showDeleteConfirm && (
          <div className="space-y-4">
            <p className="text-gray-700">
              Are you sure you want to delete plot <strong>{plot.plot_number}</strong>? This action cannot be undone.
            </p>

            {error && (
              <div className="bg-red-50 border border-red-200 rounded-md p-3">
                <p className="text-sm text-red-800">{error}</p>
              </div>
            )}

            <div className="flex gap-3">
              <button
                type="button"
                onClick={() => setShowDeleteConfirm(false)}
                className="flex-1 px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors"
                disabled={isSubmitting}
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleDelete}
                className="flex-1 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors disabled:opacity-50"
                disabled={isSubmitting}
              >
                {isSubmitting ? 'Deleting...' : 'Delete Plot'}
              </button>
            </div>
          </div>
        )}

        {/* Burials View */}
        {view === 'burials' && (
          <div className="space-y-4">
            {/* Burial Summary */}
            <div className="p-4 bg-gray-50 rounded-lg border border-gray-200">
              <div className="text-center">
                <p className="text-sm text-gray-600 mb-2">Occupied Layers / Total Capacity</p>
                <p className="text-3xl font-bold text-gray-900">
                  {burials.length} / {formData.layers || 1}
                </p>
                <span className={`inline-block mt-2 px-3 py-1 rounded-full text-sm font-medium ${
                  burials.length === 0 ? 'bg-green-100 text-green-800' :
                  burials.length < parseInt(formData.layers || '1') ? 'bg-yellow-100 text-yellow-800' :
                  'bg-red-100 text-red-800'
                }`}>
                  {burials.length === 0 ? 'All Empty' : 
                   burials.length < parseInt(formData.layers || '1') ? 'Partially Occupied' : 'Full'}
                </span>
              </div>
            </div>

            {/* Layer Slots */}
            {loading ? (
              <p className="text-gray-500 text-center py-8">Loading...</p>
            ) : (
              <div className="space-y-3">
                <h4 className="font-semibold text-gray-900">Burial Layers</h4>
                {Array.from({ length: parseInt(formData.layers || '1') }, (_, i) => i + 1).map((layerNum) => {
                  const burial = burials.find(b => b.layer === layerNum);
                  const isEmpty = !burial;
                  
                  return (
                    <div
                      key={layerNum}
                      onClick={() => {
                        if (isEmpty) {
                          setSelectedLayer(layerNum.toString());
                          setShowAddBurialForm(true);
                        }
                      }}
                      className={`border rounded-lg p-4 transition-all cursor-pointer ${
                        isEmpty 
                          ? 'bg-white border-gray-300 hover:border-indigo-500 hover:bg-indigo-50' 
                          : 'bg-blue-50 border-blue-200'
                      }`}
                    >
                      <div className="flex justify-between items-start">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-2">
                            <span className={`text-xs px-2 py-1 rounded-full font-medium ${
                              isEmpty ? 'bg-gray-200 text-gray-700' : 'bg-indigo-600 text-white'
                            }`}>
                              Layer {layerNum}
                            </span>
                            <span className={`text-xs ${isEmpty ? 'text-gray-500' : 'text-green-600 font-medium'}`}>
                              {isEmpty ? 'Available' : 'Occupied'}
                            </span>
                          </div>
                          
                          {isEmpty ? (
                            <div className="text-sm text-gray-500 italic">
                              <p>Click to assign burial</p>
                            </div>
                          ) : (
                            <>
                              <p className="text-sm font-bold text-gray-900">
                                {burial.first_name} {burial.last_name}
                              </p>
                              <p className="text-xs text-gray-600">
                                {burial.date_of_birth && `${new Date(burial.date_of_birth).toLocaleDateString()} - `}
                                {new Date(burial.date_of_death).toLocaleDateString()}
                              </p>
                              {burial.burial_date && (
                                <p className="text-xs text-gray-500 mt-1">
                                  Buried: {new Date(burial.burial_date).toLocaleDateString()}
                                </p>
                              )}
                              {burial.notes && (
                                <p className="text-xs text-gray-600 italic mt-1">{burial.notes}</p>
                              )}
                            </>
                          )}
                        </div>
                        
                        {!isEmpty && (
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleRemoveBurial(burial.id);
                            }}
                            className="text-red-600 hover:text-red-800 text-sm font-medium ml-2"
                          >
                            Remove
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            {error && (
              <div className="bg-red-50 border border-red-200 rounded-md p-3">
                <p className="text-sm text-red-800">{error}</p>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Add Burial Modal */}
      {showAddBurialForm && (
        <div className="fixed inset-0 bg-transparent flex items-center justify-center z-[9999] p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="sticky top-0 bg-white border-b border-gray-200 p-4 z-10">
              <div className="flex items-center justify-between">
                <h4 className="text-lg font-bold text-gray-900">Assign Burial to Layer {selectedLayer}</h4>
                <button
                  onClick={() => {
                    setShowAddBurialForm(false);
                    setDeceasedForm({
                      firstName: '',
                      lastName: '',
                      dateOfBirth: '',
                      dateOfDeath: '',
                    });
                    setBurialDate('');
                    setBurialNotes('');
                    setError('');
                  }}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            </div>

            <div className="p-6 space-y-4">
              {error && (
                <div className="bg-red-50 border border-red-200 rounded-md p-3">
                  <p className="text-sm text-red-800">{error}</p>
                </div>
              )}

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    First Name *
                  </label>
                  <input
                    type="text"
                    required
                    value={deceasedForm.firstName}
                    onChange={(e) => setDeceasedForm({ ...deceasedForm, firstName: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    placeholder="First name"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Last Name *
                  </label>
                  <input
                    type="text"
                    required
                    value={deceasedForm.lastName}
                    onChange={(e) => setDeceasedForm({ ...deceasedForm, lastName: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    placeholder="Last name"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Date of Birth
                  </label>
                  <input
                    type="date"
                    value={deceasedForm.dateOfBirth}
                    onChange={(e) => setDeceasedForm({ ...deceasedForm, dateOfBirth: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Date of Death *
                  </label>
                  <input
                    type="date"
                    required
                    value={deceasedForm.dateOfDeath}
                    onChange={(e) => setDeceasedForm({ ...deceasedForm, dateOfDeath: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Burial Date
                </label>
                <input
                  type="date"
                  value={burialDate}
                  onChange={(e) => setBurialDate(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Notes
                </label>
                <textarea
                  value={burialNotes}
                  onChange={(e) => setBurialNotes(e.target.value)}
                  rows={3}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  placeholder="Additional notes..."
                />
              </div>

              <div className="flex gap-3 pt-4">
                <button
                  onClick={() => {
                    setShowAddBurialForm(false);
                    setDeceasedForm({
                      firstName: '',
                      lastName: '',
                      dateOfBirth: '',
                      dateOfDeath: '',
                    });
                    setBurialDate('');
                    setBurialNotes('');
                    setSelectedLayer('1');
                    setError('');
                  }}
                  className="flex-1 px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  onClick={handleAssignBurial}
                  disabled={isSubmitting}
                  className="flex-1 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50"
                >
                  {isSubmitting ? 'Assigning...' : 'Assign Burial'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

interface Burial {
  id: number;
  layer: number;
  deceased_id: number;
  first_name: string;
  last_name: string;
  date_of_birth: string;
  date_of_death: string;
  burial_date?: string;
  notes?: string;
}

interface Deceased {
  id: number;
  first_name: string;
  last_name: string;
  date_of_birth: string;
  date_of_death: string;
}

function FacilityFormSidebar({
  cemeteryId,
  coordinates,
  onClose,
  onSuccess,
}: {
  cemeteryId: number;
  coordinates: [number, number][];
  onClose: () => void;
  onSuccess: () => void;
}) {
  const [facilityForm, setFacilityForm] = useState({
    name: '',
    facility_type: 'office',
    description: '',
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');

  const facilityTypes = [
    { value: 'office', label: 'Office', icon: '🏢' },
    { value: 'chapel', label: 'Chapel', icon: '⛪' },
    { value: 'restroom', label: 'Restroom', icon: '🚻' },
    { value: 'parking', label: 'Parking', icon: '🅿️' },
    { value: 'gate', label: 'Gate', icon: '🚪' },
    { value: 'crematorium', label: 'Crematorium', icon: '🔥' },
    { value: 'columbarium', label: 'Columbarium', icon: '🏛️' },
    { value: 'garden', label: 'Garden', icon: '🌳' },
    { value: 'pond', label: 'Pond', icon: '💧' },
    { value: 'fountain', label: 'Fountain', icon: '⛲' },
    { value: 'bench', label: 'Bench', icon: '🪑' },
    { value: 'memorial', label: 'Memorial', icon: '🗿' },
    { value: 'other', label: 'Other', icon: '📍' },
  ];

  const handleSubmit = async () => {
    if (!facilityForm.name.trim()) {
      setError('Facility name is required');
      return;
    }

    setIsSubmitting(true);
    setError('');

    try {
      // Calculate center point
      const latSum = coordinates.reduce((sum, [lat]) => sum + lat, 0);
      const lngSum = coordinates.reduce((sum, [, lng]) => sum + lng, 0);
      const centerLat = latSum / coordinates.length;
      const centerLng = lngSum / coordinates.length;

      const response = await fetch('/api/facilities', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          cemetery_id: cemeteryId,
          name: facilityForm.name,
          facility_type: facilityForm.facility_type,
          description: facilityForm.description,
          map_coordinates: coordinates,
          latitude: centerLat,
          longitude: centerLng,
        }),
      });

      if (response.ok) {
        onSuccess();
      } else {
        const data = await response.json();
        setError(data.error || 'Failed to create facility');
      }
    } catch (error) {
      setError('Error creating facility');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-transparent flex items-center justify-center z-[9999] p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <div className="sticky top-0 bg-white border-b border-gray-200 p-4 z-10">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold text-gray-900">Add New Facility</h3>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>
        <div className="p-6">
          {error && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
              {error}
            </div>
          )}

          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Facility Name *
              </label>
              <input
                type="text"
                required
                value={facilityForm.name}
                onChange={(e) => setFacilityForm({ ...facilityForm, name: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="e.g., Main Office"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Facility Type *
              </label>
              <div className="grid grid-cols-2 gap-2">
                {facilityTypes.map((type) => (
                  <button
                    key={type.value}
                    type="button"
                    onClick={() => setFacilityForm({ ...facilityForm, facility_type: type.value })}
                    className={`p-3 border-2 rounded-lg text-left transition-colors ${
                      facilityForm.facility_type === type.value
                        ? 'border-blue-500 bg-blue-50'
                        : 'border-gray-200 hover:border-gray-300'
                    }`}
                  >
                    <div className="text-2xl mb-1">{type.icon}</div>
                    <div className="text-sm font-medium text-gray-900">{type.label}</div>
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Description
              </label>
              <textarea
                value={facilityForm.description}
                onChange={(e) => setFacilityForm({ ...facilityForm, description: e.target.value })}
                rows={3}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Additional details about this facility..."
              />
            </div>

            <div className="flex gap-3 pt-4">
              <button
                onClick={onClose}
                className="flex-1 px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={handleSubmit}
                disabled={isSubmitting}
                className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
              >
                {isSubmitting ? 'Creating...' : 'Create Facility'}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function EditFacilityModal({
  facility,
  onClose,
  onSuccess,
}: {
  facility: Facility;
  onClose: () => void;
  onSuccess: () => void;
}) {
  const [facilityForm, setFacilityForm] = useState({
    name: facility.name,
    facility_type: facility.facility_type,
    description: facility.description || '',
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');

  const facilityTypes = [
    { value: 'office', label: 'Office', icon: '🏢' },
    { value: 'chapel', label: 'Chapel', icon: '⛪' },
    { value: 'restroom', label: 'Restroom', icon: '🚻' },
    { value: 'parking', label: 'Parking', icon: '🅿️' },
    { value: 'gate', label: 'Gate', icon: '🚪' },
    { value: 'crematorium', label: 'Crematorium', icon: '🔥' },
    { value: 'columbarium', label: 'Columbarium', icon: '🏛️' },
    { value: 'garden', label: 'Garden', icon: '🌳' },
    { value: 'pond', label: 'Pond', icon: '💧' },
    { value: 'fountain', label: 'Fountain', icon: '⛲' },
    { value: 'bench', label: 'Bench', icon: '🪑' },
    { value: 'memorial', label: 'Memorial', icon: '🗿' },
    { value: 'other', label: 'Other', icon: '📍' },
  ];

  const handleUpdate = async () => {
    if (!facilityForm.name.trim()) {
      setError('Facility name is required');
      return;
    }

    setIsSubmitting(true);
    setError('');

    try {
      const response = await fetch(`/api/facilities/${facility.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: facilityForm.name,
          facility_type: facilityForm.facility_type,
          description: facilityForm.description,
          map_coordinates: facility.map_coordinates,
          latitude: facility.latitude,
          longitude: facility.longitude,
        }),
      });

      if (response.ok) {
        onSuccess();
      } else {
        const data = await response.json();
        setError(data.error || 'Failed to update facility');
      }
    } catch (error) {
      setError('Error updating facility');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async () => {
    if (!confirm('Are you sure you want to delete this facility?')) return;

    setIsSubmitting(true);
    try {
      const response = await fetch(`/api/facilities/${facility.id}`, {
        method: 'DELETE',
      });

      if (response.ok) {
        onSuccess();
      } else {
        setError('Failed to delete facility');
      }
    } catch (error) {
      setError('Error deleting facility');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-transparent flex items-center justify-center z-[9999] p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <div className="p-6">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-xl font-semibold text-gray-900">Edit Facility</h3>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          {error && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
              {error}
            </div>
          )}

          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Facility Name *
              </label>
              <input
                type="text"
                required
                value={facilityForm.name}
                onChange={(e) => setFacilityForm({ ...facilityForm, name: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Facility Type *
              </label>
              <div className="grid grid-cols-3 gap-2">
                {facilityTypes.map((type) => (
                  <button
                    key={type.value}
                    type="button"
                    onClick={() => setFacilityForm({ ...facilityForm, facility_type: type.value })}
                    className={`p-3 border-2 rounded-lg text-left transition-colors ${
                      facilityForm.facility_type === type.value
                        ? 'border-blue-500 bg-blue-50'
                        : 'border-gray-200 hover:border-gray-300'
                    }`}
                  >
                    <div className="text-2xl mb-1">{type.icon}</div>
                    <div className="text-sm font-medium text-gray-900">{type.label}</div>
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Description
              </label>
              <textarea
                value={facilityForm.description}
                onChange={(e) => setFacilityForm({ ...facilityForm, description: e.target.value })}
                rows={3}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div className="flex gap-3 pt-4 border-t">
              <button
                onClick={handleDelete}
                disabled={isSubmitting}
                className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50"
              >
                Delete
              </button>
              <div className="flex-1"></div>
              <button
                onClick={onClose}
                className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={handleUpdate}
                disabled={isSubmitting}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
              >
                {isSubmitting ? 'Updating...' : 'Update'}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
