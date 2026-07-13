import { ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight } from 'lucide-react';

interface PaginationProps {
  currentPage: number;
  totalPages: number;
  totalItems: number;
  pageSize: number;
  onPageChange: (page: number) => void;
  onPageSizeChange: (size: number) => void;
  itemLabel?: string;
  pageSizeOptions?: number[];
}

export function Pagination({
  currentPage,
  totalPages,
  totalItems,
  pageSize,
  onPageChange,
  onPageSizeChange,
  itemLabel = 'element',
  pageSizeOptions = [10, 20, 50, 100],
}: PaginationProps) {
  const safePage = Math.min(currentPage, totalPages);
  const from = (safePage - 1) * pageSize + 1;
  const to = Math.min(safePage * pageSize, totalItems);

  const pageNumbers: (number | '...')[] = (() => {
    if (totalPages <= 7) return Array.from({ length: totalPages }, (_, i) => i + 1);
    if (safePage <= 4) return [1, 2, 3, 4, 5, '...', totalPages];
    if (safePage >= totalPages - 3)
      return [1, '...', totalPages - 4, totalPages - 3, totalPages - 2, totalPages - 1, totalPages];
    return [1, '...', safePage - 1, safePage, safePage + 1, '...', totalPages];
  })();

  const btnBase =
    'flex h-10 w-10 items-center justify-center rounded-lg text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-700 disabled:cursor-not-allowed disabled:opacity-30 dark:hover:bg-slate-800 dark:hover:text-slate-200';

  return (
    <div className="flex flex-col items-center justify-between gap-4 border-t border-slate-100 px-6 py-4 sm:flex-row dark:border-slate-800">
      <div className="flex items-center gap-3">
        <p className="text-xs text-slate-500 dark:text-slate-400">
          Affichage de{' '}
          <span className="font-semibold text-slate-700 dark:text-slate-200">{from}</span>-
          <span className="font-semibold text-slate-700 dark:text-slate-200">{to}</span> sur{' '}
          <span className="font-semibold text-slate-700 dark:text-slate-200">{totalItems}</span>{' '}
          {itemLabel}{totalItems > 1 ? 's' : ''}
        </p>
        <select
          value={pageSize}
          onChange={(e) => onPageSizeChange(Number(e.target.value))}
          className="rounded-xl border border-slate-200 bg-white px-2.5 py-1.5 text-xs text-slate-700 shadow-sm focus:border-sky-400 focus:outline-none dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100"
        >
          {pageSizeOptions.map((n) => (
            <option key={n} value={n}>{n} / page</option>
          ))}
        </select>
      </div>

      <div className="flex items-center gap-1">
        <button onClick={() => onPageChange(1)} disabled={safePage === 1} className={`${btnBase} hidden sm:flex`} title="Premiere page">
          <ChevronsLeft className="h-4 w-4" />
        </button>
        <button onClick={() => onPageChange(safePage - 1)} disabled={safePage === 1} className={btnBase} title="Page precedente">
          <ChevronLeft className="h-4 w-4" />
        </button>

        {pageNumbers.map((p, i) =>
          p === '...' ? (
            <span key={`e-${i}`} className="hidden h-10 w-10 items-center justify-center text-xs text-slate-400 sm:flex">...</span>
          ) : (
            <button
              key={p}
              onClick={() => onPageChange(p as number)}
              className={`${safePage === p ? 'flex' : 'hidden sm:flex'} h-10 w-10 items-center justify-center rounded-lg text-xs font-semibold transition-colors ${
                safePage === p
                  ? 'bg-sky-900 text-white shadow-sm dark:bg-sky-600'
                  : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900 dark:text-slate-300 dark:hover:bg-slate-800'
              }`}
            >
              {p}
            </button>
          )
        )}

        <span className="text-xs font-semibold text-slate-500 sm:hidden">/ {totalPages}</span>

        <button onClick={() => onPageChange(safePage + 1)} disabled={safePage === totalPages} className={btnBase} title="Page suivante">
          <ChevronRight className="h-4 w-4" />
        </button>
        <button onClick={() => onPageChange(totalPages)} disabled={safePage === totalPages} className={`${btnBase} hidden sm:flex`} title="Derniere page">
          <ChevronsRight className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}
