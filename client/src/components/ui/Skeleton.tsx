interface SkeletonProps {
  className?: string;
  style?: React.CSSProperties;
}

export function Skeleton({ className = '', style }: SkeletonProps) {
  return <div className={`skeleton ${className}`} style={{ height: 16, ...style }} />;
}

export function TableSkeleton({ rows = 5, cols = 5 }: { rows?: number; cols?: number }) {
  return (
    <div className="card" style={{ overflow: 'hidden' }}>
      <table className="data-table">
        <thead>
          <tr>
            {Array.from({ length: cols }).map((_, i) => (
              <th key={i}><Skeleton style={{ width: 80, height: 12 }} /></th>
            ))}
          </tr>
        </thead>
        <tbody>
          {Array.from({ length: rows }).map((_, r) => (
            <tr key={r}>
              {Array.from({ length: cols }).map((_, c) => (
                <td key={c}>
                  <Skeleton style={{ width: c === 0 ? 120 : 80, height: 14 }} />
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export function CardSkeleton({ count = 4 }: { count?: number }) {
  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: '1rem' }}>
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="stat-card">
          <Skeleton style={{ width: 60, height: 32, marginBottom: 8 }} />
          <Skeleton style={{ width: 100, height: 12 }} />
        </div>
      ))}
    </div>
  );
}
