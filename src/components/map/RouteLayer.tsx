import { useEffect, useRef } from 'react';
import mapboxgl from 'mapbox-gl';
import type { Route } from '@/hooks/useRoutes';

const PRIORITY_COLORS: Record<string, string> = {
  critical: '#ef4444',
  pending: '#f59e0b',
  preventive: '#3b82f6',
};

interface RouteLayerProps {
  map: mapboxgl.Map | null;
  route: Route | null;
}

export function RouteLayer({ map, route }: RouteLayerProps) {
  const markersRef = useRef<mapboxgl.Marker[]>([]);
  const sourceId = 'route-line-source';
  const layerId = 'route-line-layer';

  useEffect(() => {
    if (!map) return;

    const cleanup = () => {
      try {
        if (map.getStyle()) {
          if (map.getLayer(layerId)) map.removeLayer(layerId);
          if (map.getSource(sourceId)) map.removeSource(sourceId);
        }
      } catch { /* style not loaded */ }
      markersRef.current.forEach(m => m.remove());
      markersRef.current = [];
    };

    if (!route?.points?.length) {
      cleanup();
      return;
    }

    // Wait for style to be loaded
    if (!map.isStyleLoaded()) {
      const onLoad = () => {
        map.off('style.load', onLoad);
        // Re-trigger by forcing update — the effect will re-run
      };
      map.on('style.load', onLoad);
      return () => { map.off('style.load', onLoad); };
    }

    const validPoints = route.points.filter(
      p => p.outdoor?.lat && p.outdoor?.lng
    );

    if (validPoints.length === 0) return;

    // Build line coordinates: origin → points in sequence
    const coordinates: [number, number][] = [
      [route.origin_lng, route.origin_lat],
      ...validPoints.map(p => [p.outdoor!.lng!, p.outdoor!.lat!] as [number, number]),
    ];

    const geojson: GeoJSON.FeatureCollection = {
      type: 'FeatureCollection',
      features: [
        {
          type: 'Feature',
          geometry: {
            type: 'LineString',
            coordinates,
          },
          properties: {},
        },
      ],
    };

    // Add/update source and layer
    if (map.getSource(sourceId)) {
      (map.getSource(sourceId) as mapboxgl.GeoJSONSource).setData(geojson);
    } else {
      map.addSource(sourceId, { type: 'geojson', data: geojson });
    }

    if (!map.getLayer(layerId)) {
      map.addLayer({
        id: layerId,
        type: 'line',
        source: sourceId,
        paint: {
          'line-color': '#8b5cf6',
          'line-width': 3,
          'line-dasharray': [2, 2],
          'line-opacity': 0.8,
        },
      });
    }

    // Sequence markers
    markersRef.current.forEach(m => m.remove());
    markersRef.current = [];

    // Origin marker
    const originEl = document.createElement('div');
    originEl.className = 'flex items-center justify-center';
    originEl.innerHTML = `<div style="background:#10b981;color:white;width:28px;height:28px;border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:12px;font-weight:bold;border:2px solid white;box-shadow:0 2px 6px rgba(0,0,0,0.3);">🏁</div>`;
    const originMarker = new mapboxgl.Marker({ element: originEl })
      .setLngLat([route.origin_lng, route.origin_lat])
      .setPopup(new mapboxgl.Popup({ offset: 15 }).setHTML(`<strong>${route.origin_label}</strong><br/><small>Ponto de Partida</small>`))
      .addTo(map);
    markersRef.current.push(originMarker);

    // Point markers
    validPoints.forEach(point => {
      const color = PRIORITY_COLORS[point.priority] || '#8b5cf6';
      const el = document.createElement('div');
      el.innerHTML = `<div style="background:${color};color:white;width:24px;height:24px;border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:11px;font-weight:bold;border:2px solid white;box-shadow:0 2px 4px rgba(0,0,0,0.3);">${point.sequence}</div>`;

      const popup = new mapboxgl.Popup({ offset: 15 }).setHTML(
        `<strong>${point.outdoor?.code}</strong><br/>
        <small>${point.outdoor?.pdv?.name || ''}</small><br/>
        <small>📅 ${point.scheduled_date || 'Não agendado'}</small><br/>
        <small style="color:${color}">● ${point.priority === 'critical' ? 'Crítico' : point.priority === 'pending' ? 'Pendente' : 'Preventivo'}</small>`
      );

      const marker = new mapboxgl.Marker({ element: el })
        .setLngLat([point.outdoor!.lng!, point.outdoor!.lat!])
        .setPopup(popup)
        .addTo(map);
      markersRef.current.push(marker);
    });

    return () => {
      markersRef.current.forEach(m => m.remove());
      markersRef.current = [];
      if (map.getLayer(layerId)) map.removeLayer(layerId);
      if (map.getSource(sourceId)) map.removeSource(sourceId);
    };
  }, [map, route]);

  return null;
}
