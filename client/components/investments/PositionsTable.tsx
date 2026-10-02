'use client';

import { ArrowDown, ArrowUp, ArrowUpDown, Wallet } from 'lucide-react';
import { useMemo, useState } from 'react';
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

// Deterministic accent per ticker so row avatars are not all the same colour.
const DEFAULT_AVATAR_COLOR =
  'from-sky-500/25 to-sky-500/5 text-sky-300 border-sky-400/20';
const AVATAR_COLORS = [
  DEFAULT_AVATAR_COLOR,
  'from-violet-500/25 to-violet-500/5 text-violet-300 border-violet-400/20',
  'from-emerald-500/25 to-emerald-500/5 text-emerald-300 border-emerald-400/20',
  'from-amber-500/25 to-amber-500/5 text-amber-300 border-amber-400/20',
  'from-rose-500/25 to-rose-500/5 text-rose-300 border-rose-400/20',
  'from-cyan-500/25 to-cyan-500/5 text-cyan-300 border-cyan-400/20',
  'from-fuchsia-500/25 to-fuchsia-500/5 text-fuchsia-300 border-fuchsia-400/20',
];

function avatarColor(ticker: string): string {
  let hash = 0;
  for (let i = 0; i < ticker.length; i++) {
    hash = (hash * 31 + ticker.charCodeAt(i)) >>> 0;
  }
  return AVATAR_COLORS[hash % AVATAR_COLORS.length] ?? DEFAULT_AVATAR_COLOR;
}

type SortKey =
  | 'name'
  | 'quantity'
  | 'price'
  | 'changePercent'
  | 'dailyPnl'
  | 'avgPrice'
  | 'costBasis'
  | 'marketValue'
  | 'unrealizedPnl'
  | 'allocation';

type SortDirection = 'asc' | 'desc';

interface ColumnDef {
  key: SortKey;
  label: string;
  align: 'left' | 'right';
}

// Column labels are kept short on purpose — the table stays readable without
// horizontal scrolling on typical laptop screens.
const COLUMNS: ColumnDef[] = [
  { key: 'name', label: 'Назва', align: 'left' },
  { key: 'quantity', label: 'К-сть', align: 'right' },
  { key: 'price', label: 'Ціна', align: 'right' },
  { key: 'changePercent', label: 'Зміна %', align: 'right' },
  { key: 'dailyPnl', label: 'Ден. P&L', align: 'right' },
  { key: 'avgPrice', label: 'Сер. ціна', align: 'right' },
  { key: 'costBasis', label: 'Собів.', align: 'right' },
  { key: 'marketValue', label: 'Варт.', align: 'right' },
  { key: 'unrealizedPnl', label: 'P&L', align: 'right' },
  { key: 'allocation', label: 'Алок.', align: 'right' },
];

// The "name" column sorts by ticker; everything else sorts by its numeric value.
function getSortValue(position: Position, key: SortKey): string | number {
  if (key === 'name') return position.ticker.toLowerCase();
  const value = position[key];
  return value ?? 0;
}

function compareValues(a: string | number, b: string | number): number {
  if (typeof a === 'string' && typeof b === 'string') {
    return a.localeCompare(b);
  }
  return Number(a) - Number(b);
}

function SortIcon({
  active,
  direction,
}: {
  active: boolean;
  direction: SortDirection;
}) {
  const className = classNames(
    'h-3 w-3 shrink-0',
    active ? 'text-white' : 'text-stone-500',
  );

  if (!active) {
    return <ArrowUpDown className={className} aria-hidden="true" />;
  }

  return direction === 'desc' ? (
    <ArrowDown className={className} aria-hidden="true" />
  ) : (
    <ArrowUp className={className} aria-hidden="true" />
  );
}

interface PositionsTableProps {
  // When provided, these rows are used instead of fetching from the API
  // (useful when the parent page already owns the query).
  positions?: Position[];
  // Free cash to display below the table. Taken from the query when not passed.
  cash?: number;
}

export default function PositionsTable({ positions, cash }: PositionsTableProps) {
  const shouldFetch = positions === undefined;
  const query = usePositions({ enabled: shouldFetch });

  const rows = positions ?? query.data?.positions ?? [];
  const cashValue = cash ?? query.data?.cash ?? 0;

  // Sorting: no sort by default (keeps the order returned by the API). The
  // first click on a header sorts descending, the next click flips to ascending.
  const [sortKey, setSortKey] = useState<SortKey | null>(null);
  const [sortDirection, setSortDirection] = useState<SortDirection>('desc');

  const handleSort = (key: SortKey) => {
    if (sortKey === key) {
      setSortDirection((prev) => (prev === 'desc' ? 'asc' : 'desc'));
    } else {
      setSortKey(key);
      setSortDirection('desc');
    }
  };

  const sortedRows = useMemo(() => {
    if (!sortKey) return rows;
    const sorted = [...rows].sort((a, b) => {
      const result = compareValues(
        getSortValue(a, sortKey),
        getSortValue(b, sortKey),
      );
      return sortDirection === 'desc' ? -result : result;
    });
    return sorted;
  }, [rows, sortKey, sortDirection]);

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
    <div className="w-full overflow-hidden rounded-2xl border border-white/10 bg-white/[0.02]">
      <div className="overflow-x-auto">
        <table className="w-full min-w-[900px] border-collapse text-[13px]">
          <thead>
            <tr className="border-b border-white/10 bg-white/[0.04] text-[11px] font-semibold uppercase tracking-wider text-stone-400">
              {COLUMNS.map((column) => (
                <th
                  key={column.key}
                  scope="col"
                  className={classNames(
                    'whitespace-nowrap px-3 py-2',
                    column.align === 'right' ? 'text-right' : 'text-left',
                  )}
                >
                  <button
                    type="button"
                    onClick={() => handleSort(column.key)}
                    className={classNames(
                      'inline-flex items-center gap-1 transition-colors hover:text-white',
                      column.align === 'right' ? 'flex-row-reverse' : '',
                      sortKey === column.key ? 'text-white' : 'text-stone-400',
                    )}
                  >
                    {column.label}
                    <SortIcon
                      active={sortKey === column.key}
                      direction={sortDirection}
                    />
                  </button>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {sortedRows.map((position, index) => {
              const allocation = position.allocation ?? 0;
              return (
                <tr
                  key={position.ticker}
                  className={classNames(
                    'border-b border-white/5 transition-colors last:border-b-0 hover:bg-white/[0.06]',
                    index % 2 === 1 ? 'bg-white/[0.015]' : '',
                  )}
                >
                  {/* Name (ticker + company name when available) */}
                  <td className="px-3 py-2 text-left">
                    <div className="flex items-center gap-2.5">
                      <div
                        className={classNames(
                          'flex h-7 w-7 shrink-0 items-center justify-center rounded-lg border bg-gradient-to-br text-[10px] font-bold',
                          avatarColor(position.ticker),
                        )}
                      >
                        {position.ticker.slice(0, 3)}
                      </div>
                      <div className="min-w-0">
                        <div className="truncate font-semibold text-white">
                          {position.ticker}
                        </div>
                        {position.name && position.name !== position.ticker ? (
                          <div className="truncate text-[11px] text-stone-500">
                            {position.name}
                          </div>
                        ) : null}
                      </div>
                    </div>
                  </td>

                  {/* Quantity */}
                  <td className="whitespace-nowrap px-3 py-2 text-right tabular-nums text-stone-200">
                    {formatQuantity(position.quantity)}
                  </td>

                  {/* Current market price (0 until a quotes API exists) */}
                  <td className="whitespace-nowrap px-3 py-2 text-right tabular-nums text-stone-200">
                    {formatCurrency(position.price)}
                  </td>

                  {/* % change */}
                  <td
                    className={classNames(
                      'whitespace-nowrap px-3 py-2 text-right font-medium tabular-nums',
                      pnlTextClass(position.changePercent),
                    )}
                  >
                    {formatChange(position.changePercent)}
                  </td>

                  {/* Daily P&L */}
                  <td
                    className={classNames(
                      'whitespace-nowrap px-3 py-2 text-right font-medium tabular-nums',
                      pnlTextClass(position.dailyPnl),
                    )}
                  >
                    {formatCurrency(position.dailyPnl)}
                  </td>

                  {/* Avg price */}
                  <td className="whitespace-nowrap px-3 py-2 text-right tabular-nums text-stone-200">
                    {formatCurrency(position.avgPrice)}
                  </td>

                  {/* Cost basis */}
                  <td className="whitespace-nowrap px-3 py-2 text-right tabular-nums text-stone-200">
                    {formatCurrency(position.costBasis)}
                  </td>

                  {/* Market value */}
                  <td className="whitespace-nowrap px-3 py-2 text-right font-medium tabular-nums text-white">
                    {formatCurrency(position.marketValue)}
                  </td>

                  {/* Unrealized P&L */}
                  <td
                    className={classNames(
                      'whitespace-nowrap px-3 py-2 text-right font-medium tabular-nums',
                      pnlTextClass(position.unrealizedPnl),
                    )}
                  >
                    {formatCurrency(position.unrealizedPnl)}
                  </td>

                  {/* Allocation (% of portfolio) with a small bar */}
                  <td className="whitespace-nowrap px-3 py-2 text-right">
                    <div className="flex items-center justify-end gap-2">
                      <span
                        className={classNames(
                          'tabular-nums',
                          allocation > 0 ? 'text-indigo-300' : 'text-stone-500',
                        )}
                      >
                        {allocation > 0
                          ? `${allocation.toFixed(1)}%`
                          : EMPTY_VALUE}
                      </span>
                      <div className="h-1 w-8 overflow-hidden rounded-full bg-white/10">
                        <div
                          className="h-full rounded-full bg-indigo-400"
                          style={{ width: `${Math.min(100, allocation)}%` }}
                        />
                      </div>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Cash footer: shown as a value below the table, not a data row */}
      <div className="flex items-center justify-between border-t border-white/10 bg-white/[0.03] px-4 py-2.5">
        <div className="flex items-center gap-2 text-sm text-stone-400">
          <Wallet className="h-4 w-4 text-emerald-400" />
          <span>Cash</span>
        </div>
        <span className="text-sm font-semibold tabular-nums text-emerald-300">
          {formatCurrency(cashValue)}
        </span>
      </div>
    </div>
  );
}
