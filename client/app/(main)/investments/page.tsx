'use client';

import {
  Upload,
  FileSpreadsheet,
  Loader2,
  AlertCircle,
} from 'lucide-react';
import { useEffect, useState } from 'react';
import { usePositions } from '@/hooks/usePositions';
import { usePortfolios } from '@/hooks/usePortfolios';
import { useUploadStatements } from '@/hooks/useUploadStatements';
import PositionsTable from '@/components/investments/PositionsTable';
import {
  AddPortfolioCard,
  PortfolioCard,
} from '@/components/investments/PortfolioCard';

function getUploadErrorMessage(error: unknown): string {
  const message = (
    error as { response?: { data?: { message?: string } } } | undefined
  )?.response?.data?.message;
  return message || 'Failed to upload files. Please try again.';
}

export default function InvestmentsPage() {
  // `null` means "not initialised yet" - we auto-select all portfolios once
  // they have loaded.
  const [selectedIds, setSelectedIds] = useState<string[] | null>(null);

  const portfoliosQuery = usePortfolios();
  const portfolios = portfoliosQuery.data ?? [];

  useEffect(() => {
    if (selectedIds === null && portfolios.length > 0) {
      setSelectedIds(portfolios.map((portfolio) => portfolio.id));
    }
  }, [portfolios, selectedIds]);

  // Fall back to "all" while the selection has not been initialised yet.
  const effectiveIds =
    selectedIds ?? portfolios.map((portfolio) => portfolio.id);

  const {
    data: portfolio,
    isLoading,
    isError,
    refetch,
  } = usePositions({
    enabled: !portfoliosQuery.isLoading,
    portfolioIds: effectiveIds,
  });

  // Loading / error state for the upload comes from the mutation; the hook also
  // invalidates the portfolios and positions queries on success.
  const uploadMutation = useUploadStatements();
  const isUploading = uploadMutation.isPending;
  const uploadError = uploadMutation.isError
    ? getUploadErrorMessage(uploadMutation.error)
    : null;

  const positions = portfolio?.positions ?? [];
  const hasData = positions.length > 0;

  const togglePortfolio = (id: string) => {
    setSelectedIds((prev) => {
      const current = prev ?? portfolios.map((portfolio) => portfolio.id);
      return current.includes(id)
        ? current.filter((value) => value !== id)
        : [...current, id];
    });
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    uploadMutation.mutate(Array.from(files), {
      onSettled: () => {
        // Reset the input so the same file can be picked again if needed.
        e.target.value = '';
      },
    });
  };

  return (
    <div className="flex flex-col gap-8 max-w-[1400px] mx-auto pb-20 w-full animate-in fade-in duration-500 min-h-[60vh]">
      <div className="flex justify-between items-center mt-6">
        <h1 className="text-3xl font-bold tracking-tight">Investments</h1>

        {/* Upload Button - available as soon as a portfolio exists */}
        {portfolios.length > 0 && (
          <label className="cursor-pointer bg-white/5 hover:bg-white/10 transition-colors border border-white/10 rounded-xl px-4 py-2 flex items-center gap-2 text-sm font-medium">
            {isUploading ? (
              <Loader2 className="w-4 h-4 text-stone-400 animate-spin" />
            ) : (
              <Upload className="w-4 h-4 text-stone-400" />
            )}
            <span>{isUploading ? 'Uploading...' : 'Upload IBKR CSV'}</span>
            <input
              type="file"
              multiple
              accept=".csv"
              className="hidden"
              onChange={handleFileUpload}
              disabled={isUploading}
            />
          </label>
        )}
      </div>

      {/* Portfolio cards */}
      <div className="flex flex-wrap gap-4">
        {portfolios.map((item) => (
          <PortfolioCard
            key={item.id}
            name={item.name}
            totalValue={item.totalValue}
            selected={effectiveIds.includes(item.id)}
            onToggle={() => togglePortfolio(item.id)}
          />
        ))}
        <AddPortfolioCard href="/settings/portfolio" />
      </div>

      {uploadError && (
        <div className="bg-red-500/10 border border-red-500/20 text-red-400 px-4 py-3 rounded-xl text-sm">
          {uploadError}
        </div>
      )}

      {isLoading ? (
        <div className="flex flex-col items-center justify-center flex-1 mt-10 p-10 border border-white/10 rounded-3xl bg-white/[0.01]">
          <Loader2 className="w-8 h-8 text-primary animate-spin mb-4" />
          <p className="text-stone-400 text-sm">Loading positions...</p>
        </div>
      ) : isError ? (
        <div className="flex flex-col items-center justify-center flex-1 mt-10 p-10 border border-red-500/20 rounded-3xl bg-red-500/[0.03]">
          <AlertCircle className="w-8 h-8 text-red-400 mb-4" />
          <h2 className="text-lg font-bold mb-2">Failed to load positions</h2>
          <p className="text-stone-400 text-center max-w-md mb-6">
            Something went wrong while fetching your portfolio. Please try
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
      ) : portfolios.length === 0 ? (
        <div className="flex flex-col items-center justify-center flex-1 mt-10 p-10 border border-dashed border-white/10 rounded-3xl bg-white/[0.01]">
          <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center mb-6">
            <FileSpreadsheet className="w-8 h-8 text-primary" />
          </div>
          <h2 className="text-xl font-bold mb-2">No portfolios yet</h2>
          <p className="text-stone-400 text-center max-w-md">
            Create a portfolio using the card above to start tracking your
            investments.
          </p>
        </div>
      ) : effectiveIds.length === 0 ? (
        <div className="flex flex-col items-center justify-center flex-1 mt-10 p-10 border border-dashed border-white/10 rounded-3xl bg-white/[0.01]">
          <h2 className="text-lg font-bold mb-2">No portfolio selected</h2>
          <p className="text-stone-400 text-center max-w-md">
            Select one or more portfolios above to see their positions.
          </p>
        </div>
      ) : !hasData ? (
        <div className="flex flex-col items-center justify-center flex-1 mt-10 p-10 border border-dashed border-white/10 rounded-3xl bg-white/[0.01]">
          <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center mb-6">
            <FileSpreadsheet className="w-8 h-8 text-primary" />
          </div>
          <h2 className="text-xl font-bold mb-2">No Portfolio Data</h2>
          <p className="text-stone-400 text-center max-w-md mb-8">
            Upload your Interactive Brokers (IBKR) Activity Statement in CSV
            format to start tracking your portfolio, performance, and
            allocations.
          </p>

          <label className="cursor-pointer bg-primary hover:bg-primary/90 text-primary-foreground transition-colors rounded-xl px-6 py-3 flex items-center gap-2 font-medium shadow-lg shadow-primary/20">
            {isUploading ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin" />
                <span>Uploading...</span>
              </>
            ) : (
              <>
                <Upload className="w-5 h-5" />
                <span>Upload CSV Files</span>
              </>
            )}
            <input
              type="file"
              multiple
              accept=".csv"
              className="hidden"
              onChange={handleFileUpload}
              disabled={isUploading}
            />
          </label>
        </div>
      ) : (
        <PositionsTable positions={positions} cash={portfolio?.cash} />
      )}
    </div>
  );
}
