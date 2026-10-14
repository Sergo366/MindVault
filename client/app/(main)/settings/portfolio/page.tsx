'use client';

import { AlertCircle, ArrowLeft, Loader2, Plus, X } from 'lucide-react';
import Link from 'next/link';
import { useState } from 'react';
import {
  useCreatePortfolio,
  useDeletePortfolio,
  usePortfolios,
  useUpdatePortfolio,
} from '@/hooks/usePortfolios';
import { PortfolioManageCard } from '@/components/investments/PortfolioManageCard';

function getErrorMessage(error: unknown): string {
  const message = (
    error as { response?: { data?: { message?: string } } } | undefined
  )?.response?.data?.message;
  return message || 'Something went wrong. Please try again.';
}

export default function PortfolioSettingsPage() {
  const {
    data: portfolios = [],
    isLoading,
    isError,
    refetch,
  } = usePortfolios();

  const createMutation = useCreatePortfolio();
  const updateMutation = useUpdatePortfolio();
  const deleteMutation = useDeletePortfolio();

  const [isAdding, setIsAdding] = useState(false);
  const [newName, setNewName] = useState('');
  const [actionError, setActionError] = useState<string | null>(null);

  const resetForm = () => {
    setIsAdding(false);
    setNewName('');
  };

  const handleCreate = () => {
    const name = newName.trim();
    if (!name) return;

    setActionError(null);
    createMutation.mutate(name, {
      onSuccess: resetForm,
      onError: (error) => setActionError(getErrorMessage(error)),
    });
  };

  const handleRename = (id: string, name: string) => {
    setActionError(null);
    updateMutation.mutate(
      { id, name },
      { onError: (error) => setActionError(getErrorMessage(error)) },
    );
  };

  const handleDelete = (id: string) => {
    if (
      !window.confirm(
        'Delete this portfolio? All of its statement records will be deleted too.',
      )
    ) {
      return;
    }

    setActionError(null);
    deleteMutation.mutate(id, {
      onError: (error) => setActionError(getErrorMessage(error)),
    });
  };

  return (
    <div className="flex flex-col gap-8 max-w-[1400px] mx-auto pb-20 w-full animate-in fade-in duration-500 min-h-[60vh]">
      <div className="mt-6 flex flex-col gap-4">
        <Link
          href="/investments"
          className="flex w-fit items-center gap-2 text-sm text-stone-400 transition-colors hover:text-white"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to investments
        </Link>
        <h1 className="text-3xl font-bold tracking-tight">Portfolios</h1>
        <p className="max-w-2xl text-sm text-stone-400">
          Create and manage your portfolios. Each statement you upload is
          imported into a portfolio.
        </p>
      </div>

      {actionError && (
        <div className="bg-red-500/10 border border-red-500/20 text-red-400 px-4 py-3 rounded-xl text-sm">
          {actionError}
        </div>
      )}

      {isLoading ? (
        <div className="flex flex-col items-center justify-center flex-1 mt-10 p-10 border border-white/10 rounded-3xl bg-white/[0.01]">
          <Loader2 className="w-8 h-8 text-primary animate-spin mb-4" />
          <p className="text-stone-400 text-sm">Loading portfolios...</p>
        </div>
      ) : isError ? (
        <div className="flex flex-col items-center justify-center flex-1 mt-10 p-10 border border-red-500/20 rounded-3xl bg-red-500/[0.03]">
          <AlertCircle className="w-8 h-8 text-red-400 mb-4" />
          <h2 className="text-lg font-bold mb-2">Failed to load portfolios</h2>
          <p className="text-stone-400 text-center max-w-md mb-6">
            Something went wrong while fetching your portfolios. Please try
            again.
          </p>
          <button
            type="button"
            onClick={() => refetch()}
            className="bg-white/5 hover:bg-white/10 transition-colors border border-white/10 rounded-xl px-5 py-2.5 text-sm font-medium"
          >
            Retry
          </button>
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          {portfolios.map((portfolio) => (
            <PortfolioManageCard
              key={portfolio.id}
              portfolio={portfolio}
              onRename={handleRename}
              onDelete={handleDelete}
              isRenamePending={
                updateMutation.isPending &&
                updateMutation.variables?.id === portfolio.id
              }
              isDeletePending={
                deleteMutation.isPending &&
                deleteMutation.variables === portfolio.id
              }
            />
          ))}

          {/* Full-width add-portfolio bar. Clicking it swaps in an editable row
              on the same width, instead of opening a small square card. */}
          {isAdding ? (
            <div className="flex w-full items-center gap-2 rounded-2xl border border-primary/40 bg-primary/[0.06] px-4 py-3">
              <Plus className="h-4 w-4 shrink-0 text-primary/80" />
              <input
                value={newName}
                onChange={(event) => setNewName(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === 'Enter') handleCreate();
                  if (event.key === 'Escape') resetForm();
                }}
                placeholder="Portfolio name"
                autoFocus
                disabled={createMutation.isPending}
                className="min-w-0 flex-1 border-none bg-transparent text-sm text-white outline-none placeholder:text-stone-500 focus:border-primary/50 disabled:opacity-50"
              />
              <button
                type="button"
                onClick={handleCreate}
                disabled={createMutation.isPending || !newName.trim()}
                className="rounded-lg bg-primary px-4 py-1.5 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {createMutation.isPending ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  'Add'
                )}
              </button>
              <button
                type="button"
                onClick={resetForm}
                disabled={createMutation.isPending}
                aria-label="Cancel"
                className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md text-stone-400 transition-colors hover:bg-white/10 disabled:opacity-50"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => setIsAdding(true)}
              className="group flex w-full items-center justify-center gap-2 rounded-2xl border border-dashed border-white/15 bg-white/[0.01] py-3 text-stone-400 transition-all hover:border-primary/40 hover:bg-primary/[0.04] hover:text-primary"
            >
              <span className="flex h-6 w-6 items-center justify-center rounded-full border border-white/10 bg-white/5 transition-colors group-hover:border-primary/40 group-hover:bg-primary/10">
                <Plus className="h-3.5 w-3.5" />
              </span>
              <span className="text-sm font-medium">Add portfolio</span>
            </button>
          )}
        </div>
      )}
    </div>
  );
}
