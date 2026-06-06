import React from 'react';
import { FiAlertTriangle, FiX } from 'react-icons/fi';

const ConfirmModal = ({
  isOpen,
  title = "Confirm Action",
  message = "Are you sure you want to proceed?",
  confirmText = "Confirm",
  cancelText = "Cancel",
  type = "primary", // 'primary', 'danger'
  onConfirm,
  onCancel,
  loading = false
}) => {
  if (!isOpen) return null;

  const confirmBtnBg = type === 'danger' 
    ? 'bg-red-600 hover:bg-red-700 text-white' 
    : 'bg-[var(--gold)] text-black hover:bg-yellow-500';

  const confirmBorder = type === 'danger'
    ? 'border-red-900/50'
    : 'border-[var(--gold)]/30';

  return (
    <div 
      className="fixed inset-0 z-[10000] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4"
      style={{ zIndex: 10000 }}
    >
      <div 
        className={`w-full max-w-md bg-zinc-950 border ${confirmBorder} rounded-2xl p-6 shadow-2xl overflow-hidden`}
        style={{ zIndex: 10001 }}
      >
        {/* Header */}
        <div className="flex justify-between items-start mb-4">
          <div className="flex items-center gap-2.5">
            {type === 'danger' && <FiAlertTriangle size={20} className="text-red-500" />}
            <h3 className="text-lg font-bold text-white leading-none">{title}</h3>
          </div>
          <button
            onClick={onCancel}
            disabled={loading}
            className="text-zinc-500 hover:text-white transition-colors"
          >
            <FiX size={20} />
          </button>
        </div>

        {/* Message */}
        <p className="text-zinc-400 text-sm mb-6 leading-relaxed">
          {message}
        </p>

        {/* Action Buttons */}
        <div className="flex items-center justify-end gap-3">
          <button
            type="button"
            onClick={onCancel}
            disabled={loading}
            className="px-4 py-2 border border-zinc-850 hover:border-zinc-700 hover:bg-zinc-900 text-zinc-300 rounded-lg text-sm transition-colors font-medium"
          >
            {cancelText}
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={loading}
            className={`px-5 py-2 font-bold rounded-lg text-sm shadow-md transition-all flex items-center gap-1.5 disabled:opacity-50 ${confirmBtnBg}`}
          >
            {loading ? "Processing..." : confirmText}
          </button>
        </div>
      </div>
    </div>
  );
};

export default ConfirmModal;
