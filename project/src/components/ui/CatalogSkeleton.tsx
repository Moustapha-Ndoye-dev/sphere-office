
interface CatalogSkeletonProps {
  title?: string;
  subtitle?: string;
  withFilters?: boolean;
  count?: number;
}

export function CatalogSkeleton({
  title = 'Chargement de la vitrine',
  subtitle = 'Nous preparons une selection claire et bien proportionnee.',
  withFilters = false,
  count = 8,
}: CatalogSkeletonProps) {
  return (
    <div className="mx-auto w-full max-w-[1800px] px-4 py-8 sm:px-6 sm:py-12 lg:px-8 2xl:px-12">
      <div className="mb-8 overflow-hidden rounded-[28px] border border-slate-200 bg-white shadow-[0_24px_80px_-50px_rgba(15,23,42,0.45)] dark:border-slate-800 dark:bg-slate-900">
        <div className="grid gap-6 p-5 sm:p-7 lg:grid-cols-[minmax(0,1fr)_360px] lg:items-center">
          <div>
            <div className="skeleton h-3 w-40 rounded-full" />
            <div className="skeleton mt-5 h-9 w-full max-w-xl rounded-2xl" />
            <div className="skeleton mt-3 h-9 w-4/5 max-w-lg rounded-2xl" />
            <div className="skeleton mt-6 h-4 w-full max-w-md rounded-full" />
            <div className="skeleton mt-2 h-4 w-2/3 max-w-sm rounded-full" />
            <p className="mt-6 text-sm font-semibold text-slate-500 dark:text-slate-400">{title}</p>
            <p className="mt-1 text-sm text-slate-400 dark:text-slate-500">{subtitle}</p>
          </div>
          <div className="hidden rounded-[24px] bg-slate-50 p-4 lg:block dark:bg-slate-950">
            <div className="skeleton aspect-[4/3] rounded-[20px]" />
          </div>
        </div>
      </div>

      <div className={withFilters ? 'grid gap-6 lg:grid-cols-[280px_minmax(0,1fr)]' : ''}>
        {withFilters ? (
          <aside className="hidden rounded-[24px] border border-slate-200 bg-white p-5 shadow-sm lg:block dark:border-slate-800 dark:bg-slate-900">
            <div className="skeleton h-3 w-24 rounded-full" />
            <div className="mt-6 space-y-3">
              {Array.from({ length: 6 }).map((_, index) => (
                <div key={index} className="skeleton h-11 rounded-2xl" />
              ))}
            </div>
            <div className="skeleton mt-8 h-28 rounded-2xl" />
          </aside>
        ) : null}

        <div className="grid grid-cols-2 gap-3 sm:gap-4 md:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5">
          {Array.from({ length: count }).map((_, index) => (
            <div key={index} className="rounded-[24px] border border-slate-200 bg-white p-2 shadow-sm dark:border-slate-800 dark:bg-slate-900">
              <div className="skeleton aspect-[4/3] rounded-[18px]" />
              <div className="px-2 pb-2 pt-4">
                <div className="skeleton h-3 w-24 rounded-full" />
                <div className="skeleton mt-3 h-4 w-full rounded-full" />
                <div className="skeleton mt-2 h-4 w-3/4 rounded-full" />
                <div className="mt-5 flex items-center justify-between">
                  <div className="skeleton h-5 w-24 rounded-full" />
                  <div className="skeleton h-11 w-11 rounded-full" />
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
