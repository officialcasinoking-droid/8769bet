import { forwardRef, type HTMLAttributes, type ReactNode } from 'react';
import { cn } from '../utils/cn';

export interface Column<T = any> {
  key: string;
  header: string;
  render?: (row: T, index: number) => ReactNode;
  className?: string;
  width?: string;
  align?: 'left' | 'center' | 'right';
}

export interface TableProps<T = any> extends HTMLAttributes<HTMLTableElement> {
  columns: Column<T>[];
  data: T[];
  keyExtractor: (row: T) => string;
  striped?: boolean;
  hoverable?: boolean;
  bordered?: boolean;
  compact?: boolean;
  emptyMessage?: string;
  emptyAction?: ReactNode;
  loading?: boolean;
  rowClassName?: (row: T, index: number) => string;
  onRowClick?: (row: T) => void;
}

export const Table = forwardRef<HTMLTableElement, TableProps<any>>(
  (
    {
      columns,
      data,
      keyExtractor,
      striped = true,
      hoverable = true,
      bordered = true,
      compact = false,
      emptyMessage = 'No data available',
      emptyAction,
      loading = false,
      rowClassName,
      onRowClick,
      className = '',
      ...props
    },
    ref
  ) => {
    if (loading) {
      return (
        <div className="flex items-center justify-center py-12">
          <div className="w-8 h-8 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin" />
        </div>
      );
    }

    if (data.length === 0) {
      return (
        <div className="py-12 text-center">
          <div className="w-16 h-16 mx-auto mb-4 text-gray-600">
            <svg fill="none" stroke="currentColor" viewBox="0 0 24 24" className="w-full h-full">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
          </div>
          <p className="text-gray-400">{emptyMessage}</p>
          {emptyAction && <div className="mt-4">{emptyAction}</div>}
        </div>
      );
    }

    return (
      <div className="overflow-x-auto">
        <table
          ref={ref}
          className={cn('w-full text-sm', bordered && 'border-collapse', className)}
          {...props}
        >
          <thead className="bg-dark-300/50">
            <tr>
              {columns.map((column) => (
                <th
                  key={column.key}
                  scope="col"
                  className={cn(
                    'px-4 py-3 text-left text-xs font-semibold text-gray-400 uppercase tracking-wider',
                    column.align === 'center' && 'text-center',
                    column.align === 'right' && 'text-right',
                    column.className
                  )}
                  style={{ width: column.width }}
                >
                  {column.header}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-dark-100">
            {data.map((row, index) => (
              <tr
                key={keyExtractor(row)}
                onClick={() => onRowClick?.(row)}
                className={cn(
                  'transition-colors',
                  striped && index % 2 === 0 && 'bg-dark-300/30',
                  hoverable && 'hover:bg-dark-300/50',
                  onRowClick && 'cursor-pointer',
                  rowClassName?.(row, index)
                )}
              >
                {columns.map((column) => (
                  <td
                    key={column.key}
                    className={cn(
                      'px-4 py-3 text-gray-300',
                      compact && 'py-2',
                      column.align === 'center' && 'text-center',
                      column.align === 'right' && 'text-right',
                      column.className
                    )}
                  >
                    {column.render
                      ? column.render(row, index)
                      : (row as any)[column.key]?.toString() ?? '—'}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
  }
);

Table.displayName = 'Table';

export interface PaginationProps {
  currentPage: number;
  totalPages: number;
  totalItems: number;
  itemsPerPage: number;
  onPageChange: (page: number) => void;
  onItemsPerPageChange?: (itemsPerPage: number) => void;
  itemsPerPageOptions?: number[];
  showItemsPerPage?: boolean;
  className?: string;
}

export const Pagination = ({
  currentPage,
  totalPages,
  totalItems,
  itemsPerPage,
  onPageChange,
  onItemsPerPageChange,
  itemsPerPageOptions = [10, 20, 50, 100],
  showItemsPerPage = true,
  className = ''
}: PaginationProps) => {
  if (totalPages <= 1) return null;

  const pages = Array.from({ length: totalPages }, (_, i) => i + 1);
  const visiblePages = pages.filter(
    page => page === 1 || page === totalPages || (page >= currentPage - 1 && page <= currentPage + 1)
  );

  return (
    <div className={cn('flex flex-col sm:flex-row items-center justify-between gap-4 p-4', className)}>
      <div className="text-sm text-gray-400">
        Showing {((currentPage - 1) * itemsPerPage) + 1} to{' '}
        {Math.min(currentPage * itemsPerPage, totalItems)} of {totalItems} results
      </div>

      <div className="flex items-center gap-2 flex-wrap">
        <select
          value={itemsPerPage}
          onChange={e => onItemsPerPageChange?.(Number(e.target.value))}
          className="px-3 py-1.5 text-sm bg-dark-300 border border-dark-100 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
        >
          {itemsPerPageOptions.map(opt => (
            <option key={opt} value={opt}>
              {opt} per page
            </option>
          ))}
        </select>

        <button
          onClick={() => onPageChange(1)}
          disabled={currentPage === 1}
          className="px-3 py-1.5 text-sm bg-dark-300 text-white rounded-lg hover:bg-dark-200 disabled:opacity-50 disabled:cursor-not-allowed"
          aria-label="First page"
        >
          ««
        </button>

        <button
          onClick={() => onPageChange(currentPage - 1)}
          disabled={currentPage === 1}
          className="px-3 py-1.5 text-sm bg-dark-300 text-white rounded-lg hover:bg-dark-200 disabled:opacity-50 disabled:cursor-not-allowed"
          aria-label="Previous page"
        >
          «
        </button>

        {visiblePages.map((page, i) => (
          <button
            key={page}
            onClick={() => onPageChange(page)}
            disabled={page === currentPage}
            className={cn(
              'px-3 py-1.5 text-sm rounded-lg',
              page === currentPage
                ? 'bg-emerald-500 text-white'
                : 'bg-dark-300 text-white hover:bg-dark-200'
            )}
            aria-label={`Page ${page}`}
            aria-current={page === currentPage ? 'page' : undefined}
          >
            {page}
          </button>
        ))}

        <button
          onClick={() => onPageChange(currentPage + 1)}
          disabled={currentPage === totalPages}
          className="px-3 py-1.5 text-sm bg-dark-300 text-white rounded-lg hover:bg-dark-200 disabled:opacity-50 disabled:cursor-not-allowed"
          aria-label="Next page"
        >
          »
        </button>

        <button
          onClick={() => onPageChange(totalPages)}
          disabled={currentPage === totalPages}
          className="px-3 py-1.5 text-sm bg-dark-300 text-white rounded-lg hover:bg-dark-200 disabled:opacity-50 disabled:cursor-not-allowed"
          aria-label="Last page"
        >
          »»
        </button>
      </div>
    </div>
  );
};