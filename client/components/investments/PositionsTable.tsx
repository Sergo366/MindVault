'use client';

import {
  ArrowDown,
  ArrowUp,
  ArrowUpDown,
  TrendingUp,
  Wallet,
} from 'lucide-react';
import { useMemo, useState } from 'react';
import { classNames } from '@/lib/styles/classNames';
import { usePositions } from '@/hooks/usePositions';
import type { PortfolioTotals, Position } from '@/api/investment';

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

/** Formats a signed amount, e.g. "+$2,585.86" / "-$120.00". */
function formatSignedCurrency(value: number | null | undefined): string {
  if (value === null || value === undefined || !Number.isFinite(value)) {
    return EMPTY_VALUE;
  }
  return `${value >= 0 ? '+' : '-'}${currencyFormatter.format(Math.abs(value))}`;
}

function formatQuantity(value: number | null | undefined): string {
  if (value === null || value === undefined) return EMPTY_VALUE;
  return quantityFormatter.format(value);
}

/** Formats a percentage with an explicit sign, e.g. "+16.09%". */
function formatPercent(value: number | null | undefined): string {
  if (value === null || value === undefined || !Number.isFinite(value)) {
    return EMPTY_VALUE;
  }
  return `${value >= 0 ? '+' : ''}${value.toFixed(2)}%`;
}

function pnlTextClass(value: number | null | undefined): string {
  if (value === null || value === undefined) return 'text-stone-500';
  if (value > 0) return 'text-primary';
  if (value < 0) return 'text-red-400';
  return 'text-stone-400';
}

/**
 * Total return of one position relative to its cost basis, in percent.
 *
 * This is NOT the daily change — it answers "how much am I up/down overall",
 * whereas `position.changePercent` is today's move against the previous close.
 *
 * The backend computes `unrealizedPnlPercent`, so that value is preferred
 * (single source of truth). The local calculation from `unrealizedPnl` /
 * `costBasis` remains as a fallback for older or cached payloads.
 *
 * Returns null when the cost basis is unknown or zero, so the cell renders a
 * dash instead of a misleading "+0.00%".
 */
function totalReturnPercent(position: Position): number | null {
  const costBasis = Number(position.costBasis ?? 0);
  if (!Number.isFinite(costBasis) || costBasis <= 0) return null;

  const fromApi = Number(position.unrealizedPnlPercent);
  if (Number.isFinite(fromApi)) return fromApi;

  const pnl = Number(position.unrealizedPnl ?? 0);
  if (!Number.isFinite(pnl)) return null;
  return (pnl / costBasis) * 100;
}

/**
 * Computes the aggregate P&L directly from the rows.
 *
 * Used only when the parent did not pass `totals` and the fetched payload has
 * no `totals` block (e.g. a response cached before the field existed). It
 * mirrors the backend filter: only positions we price (`price > 0`), with a
 * known cost basis and a non-negative allocation, contribute.
 */
function computeTotalsFromRows(rows: Position[]): PortfolioTotals {
  let costBasis = 0;
  let unrealizedPnl = 0;

  for (const position of rows) {
    const price = Number(position.price ?? 0);
    const basis = Number(position.costBasis ?? 0);
    const allocation = Number(position.allocation ?? 0);
    const pnl = Number(position.unrealizedPnl ?? 0);

    if (!(price > 0)) continue;
    if (!(basis > 0)) continue;
    if (!(allocation >= 0)) continue;
    if (!Number.isFinite(pnl)) continue;

    costBasis += basis;
    unrealizedPnl += pnl;
  }

  return {
    costBasis,
    unrealizedPnl,
    unrealizedPnlPercent: costBasis > 0 ? (unrealizedPnl / costBasis) * 100 : 0,
  };
}

// Deterministic accent per ticker so row avatars are not all the same colour.
const DEFAULT_AVATAR_COLOR =
  'from-sky-500/25 to-sky-500/5 text-sky-300 border-sky-400/20';
const AVATAR_COLORS = [
  DEFAULT_AVATAR_COLOR,
  'from-violet-500/25 to-violet-500/5 text-violet-300 border-violet-400/20',
  'from-indigo-500/25 to-indigo-500/5 text-indigo-300 border-indigo-400/20',
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
  | 'unrealizedPnlPercent'
  | 'allocation';

type SortDirection = 'asc' | 'desc';

interface ColumnDef {
  key: SortKey;
  label: string;
  align: 'left' | 'right';
  // Tooltip clarifying what the column actually measures (two different
  // percentages sit next to each other: daily change and total return).
  hint?: string;
}

// Column labels are kept short on purpose — the table stays readable without
// horizontal scrolling on typical laptop screens.
const COLUMNS: ColumnDef[] = [
  { key: 'name', label: 'Назва', align: 'left' },
  { key: 'quantity', label: 'К-сть', align: 'right' },
  { key: 'price', label: 'Ціна', align: 'right' },
  {
    key: 'changePercent',
    label: 'Зміна %',
    align: 'right',
    hint: 'Зміна ціни за сьогодні відносно попереднього закриття',
  },
  { key: 'dailyPnl', label: 'Ден. P&L', align: 'right' },
  { key: 'avgPrice', label: 'Сер. ціна', align: 'right' },
  { key: 'costBasis', label: 'Собів.', align: 'right' },
  { key: 'marketValue', label: 'Варт.', align: 'right' },
  { key: 'unrealizedPnl', label: 'P&L', align: 'right' },
  {
    key: 'unrealizedPnlPercent',
    label: 'P&L %',
    align: 'right',
    hint: 'Прибуток/збиток відносно собівартості за весь час',
  },
  { key: 'allocation', label: 'Алок.', align: 'right' },
];

// The "name" column sorts by ticker; "unrealizedPnlPercent" is derived from
// other fields; everything else sorts by its own numeric value.
function getSortValue(position: Position, key: SortKey): string | number {
  if (key === 'name') return position.ticker.toLowerCase();
  if (key === 'unrealizedPnlPercent') {
    return totalReturnPercent(position) ?? 0;
  }
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
  // Pre-computed aggregate P&L. Taken from the query when not passed, and
  // derived from the rows as a last resort.
  totals?: PortfolioTotals;
}

export default function PositionsTable({
  positions,
  cash,
  totals,
}: PositionsTableProps) {
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

  // Aggregate P&L for the footer: server-provided value first, local
  // computation only as a fallback so the row is never blank.
  const fallbackTotals = useMemo(() => computeTotalsFromRows(rows), [rows]);
  const effectiveTotals = totals ?? query.data?.totals ?? fallbackTotals;

  // With no counted positions there is nothing meaningful to show: render a
  // dash instead of a misleading "+$0.00 (+0.00%)".
  const hasTotals = effectiveTotals.costBasis > 0;
  const totalPnl = hasTotals ? effectiveTotals.unrealizedPnl : null;
  const totalPnlPercent = hasTotals ? effectiveTotals.unrealizedPnlPercent : null;

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
        <table className="w-full min-w-[960px] border-collapse text-[13px]">
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
                    title={column.hint}
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
              const pnlPercent = totalReturnPercent(position);
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

                  {/* Current market price */}
                  <td className="whitespace-nowrap px-3 py-2 text-right tabular-nums text-stone-200">
                    {formatCurrency(position.price)}
                  </td>

                  {/* Daily % change vs previous close (NOT the total return) */}
                  <td
                    className={classNames(
                      'whitespace-nowrap px-3 py-2 text-right font-medium tabular-nums',
                      pnlTextClass(position.changePercent),
                    )}
                  >
                    {formatPercent(position.changePercent)}
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

                  {/* Unrealized P&L as a percentage of cost basis */}
                  <td
                    className={classNames(
                      'whitespace-nowrap px-3 py-2 text-right font-medium tabular-nums',
                      pnlTextClass(pnlPercent),
                    )}
                  >
                    {formatPercent(pnlPercent)}
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

      {/*
        Summary footer: cash balance plus the aggregate P&L across the counted
        positions (same filter as the backend: priced positions with a known
        cost basis and a non-negative allocation).
      */}
      <div className="border-t border-white/10 bg-white/[0.03] px-4 py-2.5">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-sm text-stone-400">
            <Wallet className="h-4 w-4 text-primary" />
            <span>Cash</span>
          </div>
          <span className="text-sm font-semibold tabular-nums text-primary">
            {formatCurrency(cashValue)}
          </span>
        </div>

        <div className="mt-1.5 flex items-center justify-between">
          <div
            className="flex items-center gap-2 text-sm text-stone-400"
            title="Сумарний P&L лише за позиціями, для яких є актуальна ціна та відома собівартість"
          >
            <TrendingUp className="h-4 w-4 text-stone-400" />
            <span>Усього P&L</span>
          </div>
          <div className="flex items-baseline gap-2">
            <span
              className={classNames(
                'text-sm font-semibold tabular-nums',
                pnlTextClass(totalPnl),
              )}
            >
              {formatSignedCurrency(totalPnl)}
            </span>
            <span
              className={classNames(
                'text-xs font-medium tabular-nums',
                pnlTextClass(totalPnlPercent),
              )}
            >
              {formatPercent(totalPnlPercent)}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
