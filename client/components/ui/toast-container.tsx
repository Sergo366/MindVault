'use client';

import React from 'react';
import { useToast } from '@/hooks/useToast';
import { X, AlertCircle, CheckCircle2, Info } from 'lucide-react';

export const ToastContainer = () => {
    const { toasts, removeToast } = useToast();

    if (toasts.length === 0) return null;

    return (
        <div className="fixed bottom-6 right-6 z-[9999] flex flex-col gap-3 max-w-md w-full sm:w-auto">
            {toasts.map((toast) => (
                <div
                    key={toast.id}
                    className={`
                        group relative flex items-start gap-3 p-4 rounded-2xl border backdrop-blur-xl shadow-2xl
                        animate-in slide-in-from-right-full duration-500
                        ${toast.type === 'error' 
                            ? 'bg-red-500/10 border-red-500/20 text-red-200' 
                            : toast.type === 'success'
                                ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-200'
                                : 'bg-violet-500/10 border-violet-500/20 text-violet-200'
                        }
                    `}
                >
                    <div className="mt-0.5">
                        {toast.type === 'error' && <AlertCircle className="w-5 h-5 text-red-500" />}
                        {toast.type === 'success' && <CheckCircle2 className="w-5 h-5 text-emerald-500" />}
                        {toast.type === 'info' && <Info className="w-5 h-5 text-violet-500" />}
                    </div>
                    
                    <div className="flex-1 pr-6">
                        <p className="text-sm font-medium leading-relaxed">
                            {toast.message}
                        </p>
                    </div>

                    <button
                        onClick={() => removeToast(toast.id)}
                        className="absolute top-3 right-3 p-1 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity hover:bg-white/10"
                    >
                        <X className="w-4 h-4 opacity-70" />
                    </button>

                    {/* Progress bar for the 30s timeout */}
                    <div className="absolute bottom-0 left-0 h-1 bg-current opacity-20 rounded-full overflow-hidden w-full">
                        <div 
                            className="h-full bg-current animate-shrink"
                            style={{ animationDuration: '15s' }}
                        />
                    </div>
                </div>
            ))}
            
            <style jsx>{`
                @keyframes shrink {
                    from { width: 100%; }
                    to { width: 0%; }
                }
                .animate-shrink {
                    animation-name: shrink;
                    animation-timing-function: linear;
                    animation-fill-mode: forwards;
                }
            `}</style>
        </div>
    );
};
