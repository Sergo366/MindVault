'use client';

import { Wallet } from 'lucide-react';
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

interface ColumnDef {
  key: string;
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
                  <span
                    className={classNames(
                      'inline-flex items-center gap-1',
                      column.align === 'right' ? 'flex-row-reverse' : '',
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
            {rows.map((position, index) => {
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
