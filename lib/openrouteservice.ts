/**
 * OpenRouteService API Integration
 * Provides routing and navigation features
 */

const ORS_API_KEY = process.env.NEXT_PUBLIC_OPENROUTESERVICE_API_KEY || '';
const ORS_BASE_URL = 'https://api.openrouteservice.org';

export interface Route {
  distance: number; // in meters
  duration: number; // in seconds
  coordinates: [number, number][]; // [lng, lat] format
  instructions: RouteInstruction[];
}

export interface RouteInstruction {
  distance: number;
  duration: number;
  instruction: string;
  type: number;
}

/**
 * Get directions from one point to another
 * @param start [latitude, longitude]
 * @param end [latitude, longitude]
 * @param profile 'foot-walking' | 'driving-car' | 'cycling-regular'
 */
export async function getDirections(
  start: [number, number],
  end: [number, number],
  profile: 'foot-walking' | 'driving-car' | 'cycling-regular' = 'foot-walking'
): Promise<Route> {
  if (!ORS_API_KEY) {
    throw new Error('OpenRouteService API key is not configured');
  }

  // Convert [lat, lng] to [lng, lat] for OpenRouteService
  const startCoords: [number, number] = [start[1], start[0]];
  const endCoords: [number, number] = [end[1], end[0]];

  console.log('🔑 API Key:', ORS_API_KEY ? 'Present' : 'Missing');
  console.log('📍 Start coords (lng,lat):', startCoords);
  console.log('📍 End coords (lng,lat):', endCoords);

  const response = await fetch(`${ORS_BASE_URL}/v2/directions/${profile}/geojson`, {
    method: 'POST',
    headers: {
      'Accept': 'application/json, application/geo+json',
      'Content-Type': 'application/json; charset=utf-8',
      'Authorization': ORS_API_KEY,
    },
    body: JSON.stringify({
      coordinates: [startCoords, endCoords],
      instructions: true,
      language: 'en',
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.error('OpenRouteService error:', errorText);
    throw new Error(`Failed to get directions from OpenRouteService: ${response.status} - ${errorText}`);
  }

  const data = await response.json();
  console.log('📡 Full OpenRouteService response:', JSON.stringify(data, null, 2));

  if (!data.features || data.features.length === 0) {
    console.error('No features in GeoJSON response:', data);
    throw new Error('No routes found in response');
  }

  const feature = data.features[0];
  const route = feature.properties;
  const geometry = feature.geometry;
  
  console.log('📍 Feature:', feature);
  console.log('📍 Route properties:', route);
  console.log('📍 Geometry:', geometry);
  console.log('📍 Geometry coordinates type:', typeof geometry.coordinates);

  if (!route.summary || !geometry || !geometry.coordinates) {
    console.error('Invalid route structure:', { route, geometry });
    throw new Error('Invalid route structure from OpenRouteService');
  }

  // Convert coordinates back to [lat, lng]
  const coordinates = geometry.coordinates.map(([lng, lat]: [number, number]) => [lat, lng] as [number, number]);
  
  // Extract instructions safely
  let instructions: RouteInstruction[] = [];
  if (route.segments && route.segments.length > 0 && route.segments[0].steps) {
    instructions = route.segments[0].steps.map((step: any) => ({
      distance: step.distance || 0,
      duration: step.duration || 0,
      instruction: step.instruction || '',
      type: step.type || 0,
    }));
  }

  return {
    distance: route.summary.distance,
    duration: route.summary.duration,
    coordinates,
    instructions,
  };
}

/**
 * Calculate distance between two points
 * @param start [longitude, latitude]
 * @param end [longitude, latitude]
 */
export async function getDistance(
  start: [number, number],
  end: [number, number]
): Promise<{ distance: number; duration: number }> {
  const route = await getDirections(start, end);
  return {
    distance: route.distance,
    duration: route.duration,
  };
}

/**
 * Format distance for display
 */
export function formatDistance(meters: number): string {
  if (meters < 1000) {
    return `${Math.round(meters)} m`;
  }
  return `${(meters / 1000).toFixed(2)} km`;
}

/**
 * Format duration for display
 */
export function formatDuration(seconds: number): string {
  if (seconds < 60) {
    return `${Math.round(seconds)} sec`;
  }
  if (seconds < 3600) {
    return `${Math.round(seconds / 60)} min`;
  }
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.round((seconds % 3600) / 60);
  return `${hours} hr ${minutes} min`;
}
