'use client';

import React, { createContext, useContext, useState, ReactNode } from 'react';
import { Dialog, DialogPanel, DialogTitle, Transition, TransitionChild } from '@headlessui/react';
import { AlertTriangle } from 'lucide-react';

interface ConfirmationOptions {
    title: string;
    content: string;
    onConfirm: () => void;
    confirmText?: string;
    cancelText?: string;
}

interface ConfirmationContextType {
    openConfirmation: (options: ConfirmationOptions) => void;
}

const ConfirmationContext = createContext<ConfirmationContextType | undefined>(undefined);

export const useConfirmation = () => {
    const context = useContext(ConfirmationContext);
    if (!context) {
        throw new Error('useConfirmation must be used within a ConfirmationProvider');
    }
    return context;
};

export const ConfirmationProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
    const [isOpen, setIsOpen] = useState(false);
    const [options, setOptions] = useState<ConfirmationOptions | null>(null);

    const openConfirmation = (newOptions: ConfirmationOptions) => {
        setOptions(newOptions);
        setIsOpen(true);
    };

    const handleConfirm = () => {
        if (options?.onConfirm) {
            options.onConfirm();
        }
        setIsOpen(false);
    };

    const handleClose = () => {
        setIsOpen(false);
    };

    return (
        <ConfirmationContext.Provider value={{ openConfirmation }}>
            {children}
            <Transition show={isOpen} as={React.Fragment}>
                <Dialog as="div" className="relative z-[110]" onClose={handleClose}>
                    <TransitionChild
                        as={React.Fragment}
                        enter="ease-out duration-300"
                        enterFrom="opacity-0"
                        enterTo="opacity-100"
                        leave="ease-in duration-200"
                        leaveFrom="opacity-100"
                        leaveTo="opacity-0"
                    >
                        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm" />
                    </TransitionChild>

                    <div className="fixed inset-0 overflow-y-auto">
                        <div className="flex min-h-full items-center justify-center p-4 text-center">
                            <TransitionChild
                                as={React.Fragment}
                                enter="ease-out duration-300"
                                enterFrom="opacity-0 scale-95 translate-y-4"
                                enterTo="opacity-100 scale-100 translate-y-0"
                                leave="ease-in duration-200"
                                leaveFrom="opacity-100 scale-100 translate-y-0"
                                leaveTo="opacity-0 scale-95 translate-y-4"
                            >
                                <DialogPanel className="w-full max-w-md transform overflow-hidden rounded-3xl bg-zinc-950 border border-zinc-800 p-8 text-left align-middle shadow-2xl transition-all">
                                    <div className="flex items-start gap-4">
                                        <div className="p-3 rounded-2xl bg-amber-500/10 border border-amber-500/20 text-amber-500">
                                            <AlertTriangle className="w-6 h-6" />
                                        </div>
                                        <div className="flex-1">
                                            <DialogTitle as="h3" className="text-xl font-light text-white mb-2">
                                                {options?.title}
                                            </DialogTitle>
                                            <p className="text-zinc-400 text-sm leading-relaxed">
                                                {options?.content}
                                            </p>
                                        </div>
                                    </div>

                                    <div className="mt-8 flex justify-end gap-3">
                                        <button
                                            onClick={handleClose}
                                            className="px-6 py-2.5 cursor-pointer rounded-xl font-medium text-zinc-400 hover:text-white hover:bg-white/5 transition-all text-sm"
                                        >
                                            {options?.cancelText || 'Cancel'}
                                        </button>
                                        <button
                                            onClick={handleConfirm}
                                            className="px-6 py-2.5 cursor-pointer rounded-xl font-semibold bg-primary text-background hover:bg-primary-hover shadow-lg shadow-primary/20 active:scale-95 transition-all text-sm"
                                        >
                                            {options?.confirmText || 'Ok'}
                                        </button>
                                    </div>
                                </DialogPanel>
                            </TransitionChild>
                        </div>
                    </div>
                </Dialog>
            </Transition>
        </ConfirmationContext.Provider>
    );
};
