'use client';

import { TooltipWrapper } from '@/components/ui/TooltipWrapper';

type ToastMessage = {
  message: string;
  details?: string;
  type?: 'success' | 'error';
};

interface NetworkToastsProps {
  errorToast: ToastMessage | null;
  setErrorToast: (toast: ToastMessage | null) => void;
  connectionError: string | null;
  t: {
    close: string;
  };
}

export function NetworkToasts({ errorToast, setErrorToast, connectionError, t }: NetworkToastsProps) {
  return (
    <>
      {/* Persistent Error Toast - ping başarısız olduğunda göster, kullanıcı kapatana kadar açık kalır */}
      {errorToast && (
        <div className="fixed bottom-20 left-1/2 transform -translate-x-1/2 z-50">
          <div className="px-4 py-3 rounded-lg shadow-2xl shadow-black/25 flex items-start gap-2 bg-error-600 text-white max-w-md">
            <svg className="w-5 h-5 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <div className="flex flex-col flex-grow">
              <span className="text-sm font-medium">{errorToast.message}</span>
              {errorToast.details && (
                <span className="text-xs opacity-90 mt-0.5">{errorToast.details}</span>
              )}
            </div>
            <TooltipWrapper title={t.close}>
              <button
                onClick={() => setErrorToast(null)}
                className="flex-shrink-0 ml-2 hover:bg-error-700 rounded p-1 transition-colors"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </TooltipWrapper>
          </div>
        </div>
      )}

      {/* Connection Error Toast */}
      {connectionError && (
        <div className="fixed bottom-20 left-1/2 transform -translate-x-1/2 z-50">
          <div className="px-4 py-3 rounded-lg shadow-2xl shadow-black/25 flex items-center gap-2 bg-error-600 text-white">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
            <span className="text-sm font-medium">{connectionError}</span>
          </div>
        </div>
      )}
    </>
  );
}
