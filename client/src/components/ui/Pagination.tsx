import { ChevronLeft, ChevronRight } from 'lucide-react';

interface PaginationProps {
  page: number;
  pages: number;
  total: number;
  limit: number;
  onChange: (page: number) => void;
}

export function Pagination({ page, pages, total, limit, onChange }: PaginationProps) {
  if (pages <= 1) return null;

  const start = (page - 1) * limit + 1;
  const end = Math.min(page * limit, total);

  const visiblePages = (): (number | '...')[] => {
    if (pages <= 7) return Array.from({ length: pages }, (_, i) => i + 1);
    if (page <= 4) return [1, 2, 3, 4, 5, '...', pages];
    if (page >= pages - 3) return [1, '...', pages - 4, pages - 3, pages - 2, pages - 1, pages];
    return [1, '...', page - 1, page, page + 1, '...', pages];
  };

  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: '1rem' }}>
      <span style={{ fontSize: '0.75rem', color: '#747C75' }}>
        Showing {start}–{end} of {total}
      </span>
      <div className="pagination">
        <button
          className="page-btn"
          onClick={() => onChange(page - 1)}
          disabled={page === 1}
          aria-label="Previous page"
        >
          <ChevronLeft size={13} />
        </button>
        {visiblePages().map((p, i) =>
          p === '...' ? (
            <span key={`ellipsis-${i}`} style={{ padding: '0 0.25rem', fontSize: '0.75rem', color: '#747C75' }}>…</span>
          ) : (
            <button
              key={p}
              className={`page-btn ${p === page ? 'active' : ''}`}
              onClick={() => onChange(p as number)}
            >
              {p}
            </button>
          )
        )}
        <button
          className="page-btn"
          onClick={() => onChange(page + 1)}
          disabled={page === pages}
          aria-label="Next page"
        >
          <ChevronRight size={13} />
        </button>
      </div>
    </div>
  );
}
