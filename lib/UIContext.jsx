'use client';

import React, { createContext, useContext, useState, useEffect, useRef } from 'react';
import { CircleCheck, CircleXmark, CircleInfo, TriangleExclamation } from '@gravity-ui/icons';

const UIContext = createContext({
  toast: () => {},
  alert: () => {},
  confirm: () => {},
});

export function UIProvider({ children }) {
  const [toasts, setToasts] = useState([]);
  const [modal, setModal] = useState(null); // { type: 'alert'|'confirm', title: '', message: '', resolve: fn }
  const dialogRef = useRef(null);

  // 1. Toast Notification Logic
  const toast = (message, type = 'success') => {
    const id = Math.random().toString(36).substring(2, 9);
    setToasts((prev) => [...prev, { id, message, type }]);

    // Auto-remove after 4 seconds
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 4000);
  };

  const removeToast = (id) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  };

  // 2. Custom Dialog Alert/Confirm Logic
  const alertModal = (title, message) => {
    return new Promise((resolve) => {
      setModal({ type: 'alert', title, message, resolve });
    });
  };

  const confirmModal = (title, message) => {
    return new Promise((resolve) => {
      setModal({ type: 'confirm', title, message, resolve });
    });
  };

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;

    if (modal) {
      dialog.showModal();
    } else {
      dialog.close();
    }
  }, [modal]);

  const handleConfirm = (value) => {
    if (modal) {
      modal.resolve(value);
      setModal(null);
    }
  };

  const handleDialogClick = (e) => {
    const rect = dialogRef.current.getBoundingClientRect();
    const isInDialog =
      e.clientX >= rect.left &&
      e.clientX <= rect.right &&
      e.clientY >= rect.top &&
      e.clientY <= rect.bottom;

    if (!isInDialog && modal?.type === 'alert') {
      handleConfirm(true);
    }
  };

  return (
    <UIContext.Provider value={{ toast, alert: alertModal, confirm: confirmModal }}>
      {children}

      {/* Floating Toast Notification Stack (Bottom-Right) */}
      <div className="fixed bottom-6 right-6 z-50 flex flex-col gap-3 max-w-sm w-full pointer-events-none">
        {toasts.map((t) => {
          let bgClass = 'bg-emerald-50 border-emerald-100 text-emerald-800';
          let Icon = CircleCheck;
          let iconColor = 'text-emerald-600';

          if (t.type === 'error') {
            bgClass = 'bg-red-50 border-red-100 text-red-800';
            Icon = CircleXmark;
            iconColor = 'text-red-500';
          } else if (t.type === 'info') {
            bgClass = 'bg-blue-50 border-blue-100 text-blue-800';
            Icon = CircleInfo;
            iconColor = 'text-blue-500';
          } else if (t.type === 'warning') {
            bgClass = 'bg-amber-50 border-amber-100 text-amber-800';
            Icon = TriangleExclamation;
            iconColor = 'text-amber-500';
          }

          return (
            <div
              key={t.id}
              className={`p-4 rounded-2xl border shadow-lg flex items-start gap-3 pointer-events-auto transition-all duration-350 animate-scale-in ${bgClass}`}
            >
              <Icon className={`w-5 h-5 flex-shrink-0 mt-0.5 ${iconColor}`} />
              <div className="flex-1 text-xs font-semibold leading-normal">{t.message}</div>
              <button
                onClick={() => removeToast(t.id)}
                className="text-slate-400 hover:text-slate-600 text-xs font-bold leading-none p-0.5 rounded-full hover:bg-black/5"
              >
                &times;
              </button>
            </div>
          );
        })}
      </div>

      {/* Custom Promise-based Alert/Confirm Modal Dialog */}
      <dialog
        ref={dialogRef}
        onClick={handleDialogClick}
        onClose={() => handleConfirm(false)}
        className="p-0 rounded-3xl border border-slate-100 bg-white shadow-2xl max-w-md w-full overflow-hidden"
      >
        {modal && (
          <div className="flex flex-col animate-scale-in">
            {/* Header */}
            <div className="bg-emerald-50/40 border-b border-emerald-100/50 px-6 py-4 flex items-center gap-2">
              <TriangleExclamation className="w-5 h-5 text-emerald-700" />
              <h3 className="font-bold text-slate-800 text-sm">{modal.title}</h3>
            </div>

            {/* Message Body */}
            <div className="p-6">
              <p className="text-xs text-slate-600 leading-relaxed font-semibold">
                {modal.message}
              </p>
            </div>

            {/* Action buttons */}
            <div className="flex justify-end gap-3 px-6 pb-6 pt-3 border-t border-slate-50">
              {modal.type === 'confirm' && (
                <button
                  onClick={() => handleConfirm(false)}
                  className="px-4 py-2 border border-slate-200 hover:bg-slate-50 text-slate-600 rounded-xl text-xs font-bold uppercase tracking-wider transition-colors"
                >
                  Cancel
                </button>
              )}
              <button
                onClick={() => handleConfirm(true)}
                className="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold uppercase tracking-wider shadow-md shadow-emerald-600/10 transition-colors"
              >
                {modal.type === 'confirm' ? 'Confirm' : 'OK'}
              </button>
            </div>
          </div>
        )}
      </dialog>
    </UIContext.Provider>
  );
}

export const useUI = () => useContext(UIContext);
