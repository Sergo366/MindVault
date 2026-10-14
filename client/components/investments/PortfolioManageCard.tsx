'use client';

import { Check, MoreVertical, Pencil, Trash2, X } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { classNames } from '@/lib/styles/classNames';
import type { PortfolioSummary } from '@/api/investment';

const currencyFormatter = new Intl.NumberFormat('en-US', {
  style: 'currency',
  currency: 'USD',
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

interface PortfolioManageCardProps {
  portfolio: PortfolioSummary;
  onRename: (id: string, name: string) => void;
  onDelete: (id: string) => void;
  isRenamePending?: boolean;
  isDeletePending?: boolean;
}

/**
 * Portfolio card used on the settings page. Unlike the toggle card on the
 * investments page, this one cannot be a <button> because it hosts a menu with
 * its own buttons, so it is a plain <div>.
 */
export function PortfolioManageCard({
  portfolio,
  onRename,
  onDelete,
  isRenamePending = false,
  isDeletePending = false,
}: PortfolioManageCardProps) {
  const [menuOpen, setMenuOpen] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [name, setName] = useState(portfolio.name);

  const menuRef = useRef<HTMLDivElement>(null);

  // Keep the local input in sync when the server value changes (e.g. after a
  // successful rename).
  useEffect(() => {
    setName(portfolio.name);
  }, [portfolio.name]);

  // Close the menu when clicking anywhere outside of it.
  useEffect(() => {
    if (!menuOpen) return;

    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setMenuOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [menuOpen]);

  const submitRename = () => {
    const trimmed = name.trim();
    if (!trimmed || trimmed === portfolio.name) {
      setIsEditing(false);
      setName(portfolio.name);
      return;
    }
    onRename(portfolio.id, trimmed);
    setIsEditing(false);
  };

  const cancelRename = () => {
    setIsEditing(false);
    setName(portfolio.name);
  };

  return (
    <div className="relative flex h-[120px] w-[250px] shrink-0 flex-col justify-between rounded-2xl border border-white/10 bg-white/[0.02] p-4">
      <div className="flex items-start justify-between gap-2">
        <span className="text-[10px] font-semibold uppercase tracking-wider text-stone-500">
          Portfolio
        </span>

        {/* "Three dots" menu */}
        <div className="relative" ref={menuRef}>
          <button
            type="button"
            onClick={() => setMenuOpen((open) => !open)}
            aria-label="Portfolio actions"
            aria-haspopup="menu"
            aria-expanded={menuOpen}
            className="flex h-6 w-6 items-center justify-center rounded-md text-stone-400 transition-colors hover:bg-white/10 hover:text-white"
          >
            <MoreVertical className="h-4 w-4" />
          </button>

          {menuOpen && (
            <div
              role="menu"
              className="absolute right-0 top-7 z-10 w-36 overflow-hidden rounded-xl border border-white/10 bg-[#1c1917] shadow-xl"
            >
              <button
                type="button"
                role="menuitem"
                onClick={() => {
                  setMenuOpen(false);
                  setIsEditing(true);
                }}
                className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm text-stone-200 transition-colors hover:bg-white/10"
              >
                <Pencil className="h-3.5 w-3.5" />
                Rename
              </button>
              <button
                type="button"
                role="menuitem"
                disabled={isDeletePending}
                onClick={() => {
                  setMenuOpen(false);
                  onDelete(portfolio.id);
                }}
                className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm text-red-400 transition-colors hover:bg-red-500/10 disabled:cursor-not-allowed disabled:opacity-50"
              >
                <Trash2 className="h-3.5 w-3.5" />
                Delete
              </button>
            </div>
          )}
        </div>
      </div>

      {isEditing ? (
        <div className="flex items-center gap-1">
          <input
            value={name}
            onChange={(event) => setName(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === 'Enter') submitRename();
              if (event.key === 'Escape') cancelRename();
            }}
            autoFocus
            disabled={isRenamePending}
            className="min-w-0 flex-1 rounded-lg border border-white/15 bg-white/5 px-2 py-1 text-sm text-white outline-none focus:border-primary/50 disabled:opacity-50"
          />
          <button
            type="button"
            onClick={submitRename}
            disabled={isRenamePending}
            aria-label="Save name"
            className="flex h-7 w-7 items-center justify-center rounded-md text-primary transition-colors hover:bg-primary/10 disabled:opacity-50"
          >
            <Check className="h-4 w-4" />
          </button>
          <button
            type="button"
            onClick={cancelRename}
            disabled={isRenamePending}
            aria-label="Cancel"
            className="flex h-7 w-7 items-center justify-center rounded-md text-stone-400 transition-colors hover:bg-white/10 disabled:opacity-50"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      ) : (
        <div className="min-w-0">
          <div className="truncate font-semibold text-white">
            {portfolio.name}
          </div>
          <div
            className={classNames(
              'mt-0.5 text-sm font-medium tabular-nums text-primary',
              isRenamePending || isDeletePending ? 'opacity-60' : '',
            )}
          >
            {currencyFormatter.format(portfolio.totalValue)}
          </div>
        </div>
      )}
    </div>
  );
}
