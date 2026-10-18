'use client';

import { Check, Plus } from 'lucide-react';
import Link from 'next/link';
import { classNames } from '@/lib/styles/classNames';

const currencyFormatter = new Intl.NumberFormat('en-US', {
  style: 'currency',
  currency: 'USD',
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

const EMPTY_VALUE = '—';

/** Formats a percentage with an explicit sign, e.g. "+16.09%". */
function formatPercent(value: number | null | undefined): string {
  if (value === null || value === undefined || !Number.isFinite(value)) {
    return EMPTY_VALUE;
  }
  return `${value >= 0 ? '+' : ''}${value.toFixed(2)}%`;
}

/** Formats a signed amount, e.g. "+$2,585.86" / "-$120.00". */
function formatSignedCurrency(value: number | null | undefined): string {
  if (value === null || value === undefined || !Number.isFinite(value)) {
    return EMPTY_VALUE;
  }
  return `${value >= 0 ? '+' : '-'}${currencyFormatter.format(Math.abs(value))}`;
}

/** Green for profit, red for loss, muted when the value is unknown. */
function pnlTextClass(value: number | null | undefined): string {
  if (value === null || value === undefined || !Number.isFinite(value)) {
    return 'text-stone-500';
  }
  if (value > 0) return 'text-primary';
  if (value < 0) return 'text-red-400';
  return 'text-stone-400';
}

interface PortfolioCardProps {
  name: string;
  totalValue: number;
  selected: boolean;
  onToggle: () => void;

  // Total return of the portfolio against its cost basis. Optional so callers
  // that do not have the aggregate numbers keep working; the card renders a
  // dash instead of a misleading "+0.00%".
  unrealizedPnl?: number | null;
  unrealizedPnlPercent?: number | null;
}

export function PortfolioCard({
  name,
  totalValue,
  selected,
  onToggle,
  unrealizedPnl,
  unrealizedPnlPercent,
}: PortfolioCardProps) {
  const hasReturn =
    unrealizedPnlPercent !== null &&
    unrealizedPnlPercent !== undefined &&
    Number.isFinite(unrealizedPnlPercent);

  const returnTitle = hasReturn
    ? `Дохідність відносно собівартості: ${formatSignedCurrency(
        unrealizedPnl,
      )} (${formatPercent(unrealizedPnlPercent)})`
    : 'Дохідність недоступна: немає актуальних котирувань';

  return (
    <button
      type="button"
      onClick={onToggle}
      aria-pressed={selected}
      className={classNames(
        'group relative flex h-[120px] w-[250px] shrink-0 flex-col justify-between rounded-2xl border p-4 text-left transition-all',
        selected
          ? 'border-primary/40 bg-primary/[0.06] shadow-lg shadow-primary/10'
          : 'border-white/10 bg-white/[0.02] hover:border-white/20 hover:bg-white/[0.04]',
      )}
    >
      <div className="flex items-center justify-between">
        <span className="text-[10px] font-semibold uppercase tracking-wider text-stone-500">
          Portfolio
        </span>
        <span
          className={classNames(
            'flex h-5 w-5 items-center justify-center rounded-md border transition-colors',
            selected
              ? 'border-primary bg-primary text-primary-foreground'
              : 'border-white/20 bg-white/5',
          )}
        >
          {selected ? <Check className="h-3.5 w-3.5" strokeWidth={3} /> : null}
        </span>
      </div>

      <div className="min-w-0">
        <div className="truncate font-semibold text-white">{name}</div>
        <div className="mt-0.5 flex items-baseline justify-between gap-2">
          <span className="truncate text-sm font-medium tabular-nums text-primary">
            {currencyFormatter.format(totalValue)}
          </span>
          <span
            title={returnTitle}
            className={classNames(
              'shrink-0 text-[11px] font-semibold tabular-nums',
              pnlTextClass(hasReturn ? unrealizedPnlPercent : null),
            )}
          >
            {formatPercent(hasReturn ? unrealizedPnlPercent : null)}
          </span>
        </div>
      </div>
    </button>
  );
}

interface AddPortfolioCardProps {
  href: string;
}

export function AddPortfolioCard({ href }: AddPortfolioCardProps) {
  return (
    <Link
      href={href}
      className="group flex h-[120px] w-[250px] shrink-0 flex-col items-center justify-center gap-2 rounded-2xl border border-dashed border-white/15 bg-white/[0.01] text-stone-400 transition-all hover:border-primary/40 hover:bg-primary/[0.04] hover:text-primary"
    >
      <span className="flex h-9 w-9 items-center justify-center rounded-full border border-white/10 bg-white/5 transition-colors group-hover:border-primary/40 group-hover:bg-primary/10">
        <Plus className="h-4 w-4" />
      </span>
      <span className="text-sm font-medium">Add portfolio</span>
    </Link>
  );
}
