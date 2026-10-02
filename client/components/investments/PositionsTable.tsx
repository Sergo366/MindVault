'use client';

import { classNames } from '@/lib/styles/classNames';
import { usePositions } from '@/hooks/usePositions';
import type { Position } from '@/api/investment';

export type { Position };

const currencyFormatter = new Intl.NumberFormat('en-US', {
  style: 'currency',
  currency: 'USD',
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

const quantityFormatter = new Intl.NumberFormat('en-US');

const EMPTY_VALUE = '—';

function formatCurrency(value: number | null | undefined): string {
  if (value === null || value === undefined) return EMPTY_VALUE;
  return currencyFormatter.format(value);
}

function formatQuantity(value: number | null | undefined): string {
  if (value === null || value === undefined) return EMPTY_VALUE;
  return quantityFormatter.format(value);
}

function formatChange(value: number | null | undefined): string {
  if (value === null || value === undefined) return EMPTY_VALUE;
  return `${value >= 0 ? '+' : ''}${value.toFixed(2)}%`;
}

function pnlTextClass(value: number | null | undefined): string {
  if (value === null || value === undefined) return 'text-stone-500';
  if (value > 0) return 'text-emerald-400';
  if (value < 0) return 'text-red-400';
  return 'text-stone-400';
}

interface ColumnDef {
  key: string;
  label: string;
  align: 'left' | 'right';
}

// Columns, left to right, exactly as specified. Names are in Ukrainian except
// for the P&L ones which mix $ / % to keep them short.
const COLUMNS: ColumnDef[] = [
  { key: 'name', label: 'Назва', align: 'left' },
  { key: 'quantity', label: 'Кількість', align: 'right' },
  { key: 'price', label: 'Ціна', align: 'right' },
  { key: 'changePercent', label: '% Зміна', align: 'right' },
  { key: 'dailyPnl', label: 'Денний P&L', align: 'right' },
  { key: 'avgPrice', label: 'Сер. ціна', align: 'right' },
  { key: 'costBasis', label: 'Собівартість', align: 'right' },
  { key: 'marketValue', label: 'Ринкова вартість', align: 'right' },
  { key: 'unrealizedPnl', label: 'Нереалізований P&L', align: 'right' },
  { key: 'unrealizedPnlAllocation', label: 'Нереалізований P&L, %', align: 'right' },
];

function SortChevron() {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 20 20"
      fill="currentColor"
      aria-hidden="true"
      className="h-3 w-3 shrink-0 text-stone-500"
    >
      <path
        fillRule="evenodd"
        d="M10 3a.75.75 0 0 1 .55.24l3.25 3.5a.75.75 0 1 1-1.1 1.02L10 4.852 7.3 7.76a.75.75 0 0 1-1.1-1.02l3.25-3.5A.75.75 0 0 1 10 3Zm-3.76 9.2a.75.75 0 0 1 1.06.04l2.7 2.908 2.7-2.908a.75.75 0 1 1 1.1 1.02l-3.25 3.5a.75.75 0 0 1-1.1 0l-3.25-3.5a.75.75 0 0 1 .04-1.06Z"
        clipRule="evenodd"
      />
    </svg>
  );
}

interface PositionsTableProps {
  // When provided, these rows are used instead of fetching from the API
  // (useful for tests / storybooks).
  positions?: Position[];
}

export default function PositionsTable({ positions }: PositionsTableProps) {
  const shouldFetch = positions === undefined;
  const query = usePositions({ enabled: shouldFetch });

  const rows = positions ?? query.data ?? [];

  if (shouldFetch && query.isLoading) {
    return (
      <div className="w-full rounded-2xl border border-white/10 bg-white/[0.02] p-8 text-center text-sm text-stone-400">
        Завантаження позицій…
      </div>
    );
  }

  if (shouldFetch && query.isError) {
    return (
      <div className="w-full rounded-2xl border border-red-400/20 bg-red-400/[0.03] p-8 text-center text-sm text-red-400">
        Не вдалося завантажити позиції. Спробуйте оновити сторінку.
      </div>
    );
  }

  if (rows.length === 0) {
    return (
      <div className="w-full rounded-2xl border border-white/10 bg-white/[0.02] p-8 text-center text-sm text-stone-400">
        Немає відкритих позицій. Завантажте виписку IBKR, щоб побачити дані.
      </div>
    );
  }

  return (
    <div className="w-full overflow-x-auto rounded-2xl border border-white/10 bg-white/[0.02]">
      <table className="w-full min-w-[1100px] border-collapse text-sm">
        <thead>
          <tr className="border-b border-white/10 text-xs font-medium uppercase tracking-wider text-stone-400">
            {COLUMNS.map((column) => (
              <th
                key={column.key}
                scope="col"
                className={classNames(
                  'whitespace-nowrap px-4 py-3',
                  column.align === 'right' ? 'text-right' : 'text-left',
                )}
              >
                <span
                  className={classNames(
                    'inline-flex items-center gap-1',
                    column.align === 'right' && 'flex-row-reverse',
                  )}
                >
                  {column.label}
                  <SortChevron />
                </span>
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((position) => (
            <tr
              key={position.ticker}
              className="border-b border-white/5 transition-colors last:border-b-0 hover:bg-white/[0.03]"
            >
              {/* Name + ticker */}
              <td className="px-4 py-3 text-left">
                <div className="flex items-center gap-3">
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-white/10 bg-white/5 text-xs font-semibold text-white">
                    {position.ticker.slice(0, 4)}
                  </div>
                  <div className="min-w-0">
                    <div className="truncate font-semibold text-white">
                      {position.ticker}
                    </div>
                    <div className="truncate text-xs text-stone-400">
                      {position.name}
                    </div>
                  </div>
                </div>
              </td>

              {/* Quantity */}
              <td className="whitespace-nowrap px-4 py-3 text-right text-stone-200">
                {formatQuantity(position.quantity)}
              </td>

              {/* Current market price (0 until a quotes API exists) */}
              <td className="whitespace-nowrap px-4 py-3 text-right text-stone-200">
                {formatCurrency(position.price)}
              </td>

              {/* % change */}
              <td
                className={classNames(
                  'whitespace-nowrap px-4 py-3 text-right font-medium',
                  pnlTextClass(position.changePercent),
                )}
              >
                {formatChange(position.changePercent)}
              </td>

              {/* Daily P&L */}
              <td
                className={classNames(
                  'whitespace-nowrap px-4 py-3 text-right font-medium',
                  pnlTextClass(position.dailyPnl),
                )}
              >
                {formatCurrency(position.dailyPnl)}
              </td>

              {/* Avg price */}
              <td className="whitespace-nowrap px-4 py-3 text-right text-stone-200">
                {formatCurrency(position.avgPrice)}
              </td>

              {/* Cost basis */}
              <td className="whitespace-nowrap px-4 py-3 text-right text-stone-200">
                {formatCurrency(position.costBasis)}
              </td>

              {/* Market value */}
              <td className="whitespace-nowrap px-4 py-3 text-right font-medium text-white">
                {formatCurrency(position.marketValue)}
              </td>

              {/* Unrealized P&L */}
              <td
                className={classNames(
                  'whitespace-nowrap px-4 py-3 text-right font-medium',
                  pnlTextClass(position.unrealizedPnl),
                )}
              >
                {formatCurrency(position.unrealizedPnl)}
              </td>

              {/* Unrealized P&L allocation (%) */}
              <td
                className={classNames(
                  'whitespace-nowrap px-4 py-3 text-right font-medium',
                  pnlTextClass(position.unrealizedPnlAllocation),
                )}
              >
                {formatChange(position.unrealizedPnlAllocation)}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
