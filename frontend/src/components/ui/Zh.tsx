import type { ReactNode } from 'react';

/** Texto em chinês tradicional, como nas placas bilíngues de Hong Kong. */
export function Zh({ children, className = '' }: { children: ReactNode; className?: string }) {
  return (
    <span lang="zh-Hant" className={`zh ${className}`}>
      {children}
    </span>
  );
}
