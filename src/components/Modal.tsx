import React from 'react';

interface ModalProps {
  open: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
  footer?: React.ReactNode;
  wide?: boolean;
}

export default function Modal({ open, onClose, title, children, footer, wide }: ModalProps) {
  if (!open) return null;

  return (
    <div
      className="fixed inset-0 bg-black/70 z-[500] flex items-center justify-center p-4"
      onClick={e => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div className={`bg-card border border-border rounded-lg w-full ${wide ? 'max-w-[760px]' : 'max-w-[640px]'} max-h-[90vh] overflow-y-auto`}>
        <div className="px-5 py-4 border-b border-border flex items-center justify-between">
          <span className="text-sm font-bold text-foreground tracking-wider">{title}</span>
          <button onClick={onClose} className="text-ast-text3 hover:text-primary text-xl leading-none">×</button>
        </div>
        <div className="px-5 py-5">{children}</div>
        {footer && (
          <div className="px-5 py-3.5 border-t border-border flex justify-end gap-2.5">{footer}</div>
        )}
      </div>
    </div>
  );
}

export function FormSection({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="bg-card border border-border rounded-lg p-5 mb-4">
      <div className="text-[10px] text-primary tracking-[2px] uppercase mb-4 pb-2.5 border-b border-border">{title}</div>
      {children}
    </div>
  );
}

export function FormGrid({ cols = 2, children }: { cols?: 2 | 3; children: React.ReactNode }) {
  return (
    <div className={`grid gap-3 ${cols === 3 ? 'grid-cols-1 sm:grid-cols-3' : 'grid-cols-1 sm:grid-cols-2'}`}>
      {children}
    </div>
  );
}

export function FormGroup({ label, full, children }: { label: string; full?: boolean; children: React.ReactNode }) {
  return (
    <div className={`flex flex-col gap-1.5 ${full ? 'sm:col-span-full' : ''}`}>
      <label className="text-[10px] text-ast-text3 tracking-wider uppercase">{label}</label>
      {children}
    </div>
  );
}

export const inputClass = "bg-ast-bg3 border border-border rounded px-3 py-2 text-foreground text-[13px] focus:outline-none focus:border-primary w-full";
export const selectClass = inputClass;
export const textareaClass = inputClass + " resize-y min-h-[80px]";
