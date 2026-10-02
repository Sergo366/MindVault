'use client';

import {
  Upload,
  FileSpreadsheet,
  Loader2,
  AlertCircle,
} from 'lucide-react';
import { useState } from 'react';
import apiClient from '@/lib/api-client';
import { usePositions } from '@/hooks/usePositions';
import PositionsTable from '@/components/investments/PositionsTable';

export default function InvestmentsPage() {
  const [isUploading, setIsUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);

  const { data: positions, isLoading, isError, refetch } = usePositions();

  // The table / empty state is driven by real data fetched from
  // GET /investment/positions (via react-query).
  const hasData = !!positions && positions.length > 0;

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    setIsUploading(true);
    setUploadError(null);

    const formData = new FormData();
    for (let i = 0; i < files.length; i++) {
      formData.append('files', files[i]);
    }

    try {
      // API call to upload the CSV files to the backend
      await apiClient.post('/investment/upload-statements', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });

      // Re-fetch positions so the freshly uploaded statement is reflected
      await refetch();
    } catch (error: any) {
      console.error('Failed to upload CSV:', error);
      setUploadError(
        error?.response?.data?.message ||
          'Failed to upload files. Please try again.',
      );
    } finally {
      setIsUploading(false);
      // Reset input
      e.target.value = '';
    }
  };

  return (
    <div className="flex flex-col gap-8 max-w-[1400px] mx-auto pb-20 w-full animate-in fade-in duration-500 min-h-[60vh]">
      <div className="flex justify-between items-center mt-6">
        <h1 className="text-3xl font-bold tracking-tight">Investments</h1>

        {/* Upload Button */}
        {hasData && (
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
        <PositionsTable positions={positions} />
      )}
    </div>
  );
}
