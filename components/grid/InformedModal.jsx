'use client';

import React, { useEffect, useRef } from 'react';
import { useForm } from 'react-hook-form';
import { CircleXmark, CircleInfo } from '@gravity-ui/icons';

export default function InformedModal({ isOpen, onClose, onSubmit, memberName, sessionLabel }) {
  const dialogRef = useRef(null);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm({
    defaultValues: {
      reason: 'Exam',
      note: '',
      documentUrl: '',
    },
  });

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;

    if (isOpen) {
      // Open dialog using native top-layer API
      dialog.showModal();
    } else {
      dialog.close();
      reset(); // Clear form fields
    }
  }, [isOpen, reset]);

  // Handle escape key and backdrop clicks
  const handleDialogClick = (e) => {
    const rect = dialogRef.current.getBoundingClientRect();
    const isInDialog =
      e.clientX >= rect.left &&
      e.clientX <= rect.right &&
      e.clientY >= rect.top &&
      e.clientY <= rect.bottom;

    if (!isInDialog) {
      onClose();
    }
  };

  const onFormSubmit = (data) => {
    onSubmit(data);
    onClose();
  };

  return (
    <dialog
      ref={dialogRef}
      onClick={handleDialogClick}
      onClose={onClose}
      className="p-0 rounded-3xl border border-slate-100 bg-white shadow-2xl max-w-md w-full overflow-hidden"
    >
      <div className="flex flex-col">
        {/* Header */}
        <div className="bg-emerald-50 border-b border-emerald-100 px-6 py-4 flex items-center justify-between">
          <div>
            <h3 className="font-bold text-slate-800 text-sm">Mark Informed Absence</h3>
            <p className="text-[11px] text-emerald-700 font-semibold mt-0.5 uppercase tracking-wide">
              {memberName} &bull; {sessionLabel}
            </p>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 transition-colors p-1 rounded-full hover:bg-slate-200/50"
          >
            <CircleXmark className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit(onFormSubmit)} className="p-6 space-y-4">
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-slate-500 uppercase tracking-wider block">
              Reason <span className="text-red-500">*</span>
            </label>
            <select
              {...register('reason', { required: 'Please select a reason' })}
              className="w-full px-4 py-2.5 rounded-xl border border-slate-200 bg-slate-50 text-sm focus:outline-none focus:border-emerald-500 focus:bg-white focus:ring-4 focus:ring-emerald-100 transition-all"
            >
              <option value="Exam">Exam</option>
              <option value="Sickness">Sickness</option>
              <option value="Family Emergency">Family Emergency</option>
              <option value="Other">Other</option>
            </select>
            {errors.reason && (
              <span className="text-xs font-semibold text-red-500">{errors.reason.message}</span>
            )}
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-bold text-slate-500 uppercase tracking-wider block">
              Note / Explanation
            </label>
            <textarea
              {...register('note')}
              rows={3}
              placeholder="Provide a brief explanation..."
              className="w-full px-4 py-2.5 rounded-xl border border-slate-200 bg-slate-50 text-sm focus:outline-none focus:border-emerald-500 focus:bg-white focus:ring-4 focus:ring-emerald-100 transition-all resize-none"
            />
          </div>

          <div className="space-y-1.5">
            <div className="flex items-center gap-1">
              <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                Document URL
              </label>
              <span className="text-[10px] text-slate-400 font-semibold">(Google Drive, etc.)</span>
            </div>
            <input
              type="url"
              {...register('documentUrl', {
                pattern: {
                  value: /^(https?:\/\/)?([\da-z.-]+)\.([a-z.]{2,6})([\/\w .-]*)*\/?$/,
                  message: 'Please enter a valid URL',
                },
              })}
              placeholder="https://drive.google.com/..."
              className="w-full px-4 py-2.5 rounded-xl border border-slate-200 bg-slate-50 text-sm focus:outline-none focus:border-emerald-500 focus:bg-white focus:ring-4 focus:ring-emerald-100 transition-all"
            />
            {errors.documentUrl && (
              <span className="text-xs font-semibold text-red-500">{errors.documentUrl.message}</span>
            )}
          </div>

          {/* Action buttons */}
          <div className="flex justify-end gap-3 pt-3 border-t border-slate-100">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 border border-slate-200 hover:bg-slate-50 text-slate-600 rounded-xl text-sm font-semibold transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-sm font-semibold shadow-md shadow-emerald-600/10 transition-colors"
            >
              Submit
            </button>
          </div>
        </form>
      </div>
    </dialog>
  );
}
