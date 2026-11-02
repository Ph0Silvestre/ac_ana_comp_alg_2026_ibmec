import { useId } from 'react';

// Sequência fixa de azulejos, como o mosaico das paredes das estações do metrô de Hong Kong.
const TILES = [
  'var(--line-dijkstra)',
  'var(--land-active)',
  'var(--line-dfs)',
  'var(--surface)',
  'var(--line-kruskal)',
  'var(--land-active)',
  'var(--line-bfs)',
  'var(--line-dijkstra)',
  'var(--surface)',
  'var(--line-dfs)',
  'var(--land-active)',
  'var(--line-kruskal)',
  'var(--line-bfs)',
  'var(--surface)',
];

export function TileStrip({ size = 8, className }: { size?: number; className?: string }) {
  const id = useId();
  const step = size + 2;
  return (
    <svg className={className} width="100%" height={size + 2} aria-hidden="true" style={{ display: 'block' }}>
      <defs>
        <pattern id={id} width={step * TILES.length} height={size + 2} patternUnits="userSpaceOnUse">
          <rect width={step * TILES.length} height={size + 2} style={{ fill: 'var(--line-district)' }} />
          {TILES.map((c, i) => (
            <rect key={i} x={i * step + 1} y={1} width={size} height={size} style={{ fill: c }} />
          ))}
        </pattern>
      </defs>
      <rect width="100%" height={size + 2} fill={`url(#${id})`} />
    </svg>
  );
}
