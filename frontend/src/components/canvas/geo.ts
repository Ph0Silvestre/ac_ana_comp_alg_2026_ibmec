import { geoMercator, geoPath, type GeoProjection } from 'd3-geo';
import type { FeatureCollection, Geometry } from 'geojson';
import raw from '../../data/hk-districts.geojson?raw';
import { HK_NODES } from '../../data/hongKongGraph';

// Anéis já orientados para o d3: não reorientar.
export const DISTRICTS = JSON.parse(raw) as FeatureCollection<Geometry, { name: string }>;

export const ACTIVE_DISTRICTS = new Set(HK_NODES.map((n) => n.district));

export interface MapProjection {
  projection: GeoProjection;
  paths: { name: string; d: string }[];
}

export function projectMap(width: number, height: number, margin: number): MapProjection {
  const projection = geoMercator().fitExtent(
    [
      [margin, margin],
      [Math.max(margin + 1, width - margin), Math.max(margin + 1, height - margin)],
    ],
    DISTRICTS,
  );
  const path = geoPath(projection);
  return {
    projection,
    paths: DISTRICTS.features.map((f) => ({ name: f.properties.name, d: path(f) ?? '' })),
  };
}
