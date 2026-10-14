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

interface PortfolioCardProps {
  name: string;
  totalValue: number;
  selected: boolean;
  onToggle: () => void;
}

export function PortfolioCard({
  name,
  totalValue,
  selected,
  onToggle,
}: PortfolioCardProps) {
  return (
    <button
      type="button"
      onClick={onToggle}
      aria-pressed={selected}
      className={classNames(
        'group relative flex h-[120px] w-[250px] shrink-0 flex-col justify-between rounded-2xl border p-4 text-left transition-all',
        selected
          ? 'border-emerald-400/40 bg-emerald-400/[0.06] shadow-lg shadow-emerald-500/10'
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
              ? 'border-emerald-400 bg-emerald-400 text-stone-900'
              : 'border-white/20 bg-white/5',
          )}
        >
          {selected ? <Check className="h-3.5 w-3.5" strokeWidth={3} /> : null}
        </span>
      </div>

      <div className="min-w-0">
        <div className="truncate font-semibold text-white">{name}</div>
        <div className="mt-0.5 text-sm font-medium tabular-nums text-emerald-300">
          {currencyFormatter.format(totalValue)}
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
      className="group flex h-[120px] w-[250px] shrink-0 flex-col items-center justify-center gap-2 rounded-2xl border border-dashed border-white/15 bg-white/[0.01] text-stone-400 transition-all hover:border-emerald-400/40 hover:bg-emerald-400/[0.04] hover:text-emerald-300"
    >
      <span className="flex h-9 w-9 items-center justify-center rounded-full border border-white/10 bg-white/5 transition-colors group-hover:border-emerald-400/40 group-hover:bg-emerald-400/10">
        <Plus className="h-4 w-4" />
      </span>
      <span className="text-sm font-medium">Add portfolio</span>
    </Link>
  );
}
