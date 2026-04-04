import React from 'react';

export function Badge({ variant, children }: { variant: 'green' | 'red' | 'amber' | 'blue' | 'gray'; children: React.ReactNode }) {
  const colors = {
    green: 'bg-ast-green/15 text-ast-green',
    red: 'bg-primary/15 text-primary',
    amber: 'bg-ast-amber/15 text-ast-amber',
    blue: 'bg-ast-blue/15 text-ast-blue',
    gray: 'bg-ast-bg4 text-ast-text3',
  };
  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-bold tracking-wider uppercase ${colors[variant]}`}>
      {children}
    </span>
  );
}

export function StatusBadge({ status }: { status: string }) {
  const map: Record<string, { variant: 'green' | 'red' | 'amber' | 'blue' | 'gray'; label: string }> = {
    contato: { variant: 'gray', label: 'Contato' },
    levantamento: { variant: 'blue', label: 'Levantamento' },
    proposta: { variant: 'amber', label: 'Proposta' },
    negociacao: { variant: 'blue', label: 'Negociação' },
    fechada: { variant: 'green', label: 'Fechada ✓' },
    perdida: { variant: 'red', label: 'Perdida' },
  };
  const s = map[status] || { variant: 'gray' as const, label: '—' };
  return <Badge variant={s.variant}>{s.label}</Badge>;
}

export function LeadBadge({ status }: { status: string }) {
  const map: Record<string, { variant: 'green' | 'red' | 'amber' | 'gray'; label: string }> = {
    novo: { variant: 'red', label: 'Novo' },
    qualificado: { variant: 'amber', label: 'Qualificado' },
    convertido: { variant: 'green', label: 'Convertido' },
    descartado: { variant: 'gray', label: 'Descartado' },
  };
  const s = map[status] || { variant: 'gray' as const, label: '—' };
  return <Badge variant={s.variant}>{s.label}</Badge>;
}

export function Btn({
  variant = 'primary',
  sm,
  onClick,
  children,
  className = '',
}: {
  variant?: 'primary' | 'secondary' | 'icon';
  sm?: boolean;
  onClick?: () => void;
  children: React.ReactNode;
  className?: string;
}) {
  const base = "inline-flex items-center gap-1.5 rounded font-bold tracking-wider uppercase cursor-pointer transition-all text-[12px] border-none";
  const variants = {
    primary: 'bg-primary text-primary-foreground hover:bg-ast-red-dark px-4 py-2.5',
    secondary: 'bg-ast-bg3 text-ast-text2 border border-border hover:bg-ast-bg4 hover:text-foreground px-4 py-2.5',
    icon: 'w-8 h-8 p-0 justify-center bg-ast-bg3 border border-border text-ast-text3 hover:text-primary hover:border-primary',
  };
  const size = sm ? 'px-3 py-1.5 text-[11px]' : '';
  return (
    <button onClick={onClick} className={`${base} ${variants[variant]} ${size} ${className}`}>
      {children}
    </button>
  );
}

export function PageHeader({ title, titleEm, sub, children }: { title: string; titleEm: string; sub: string; children?: React.ReactNode }) {
  return (
    <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
      <div>
        <div className="font-condensed text-[28px] font-black tracking-wider uppercase">
          {title}<span className="text-primary">{titleEm}</span>
        </div>
        <div className="text-xs text-ast-text3 tracking-wider mt-0.5">{sub}</div>
      </div>
      {children && <div className="flex gap-2 flex-wrap">{children}</div>}
    </div>
  );
}

export function TableCard({ title, headerRight, children }: { title?: string; headerRight?: React.ReactNode; children: React.ReactNode }) {
  return (
    <div className="bg-card border border-border rounded-lg overflow-hidden mb-5">
      {(title || headerRight) && (
        <div className="px-4 py-3.5 border-b border-border flex flex-wrap items-center justify-between gap-2.5">
          {title && <span className="text-[11px] text-ast-text3 tracking-[1.5px] uppercase">{title}</span>}
          {headerRight}
        </div>
      )}
      <div className="overflow-x-auto">{children}</div>
    </div>
  );
}

export function DataTable({ children }: { children: React.ReactNode }) {
  return <table className="w-full border-collapse text-[13px]">{children}</table>;
}

export function Th({ children }: { children?: React.ReactNode }) {
  return (
    <th className="bg-ast-bg3 text-ast-text3 text-[10px] tracking-wider px-3.5 py-2.5 text-left font-medium uppercase whitespace-nowrap">
      {children}
    </th>
  );
}

export function Td({ children, className = '' }: { children?: React.ReactNode; className?: string }) {
  return (
    <td className={`px-3.5 py-2.5 border-b border-border text-ast-text2 align-middle ${className}`}>
      {children}
    </td>
  );
}

export function EmptyRow({ cols, text = 'Nenhum registro' }: { cols: number; text?: string }) {
  return (
    <tr>
      <td colSpan={cols} className="text-center text-ast-text3 py-8">{text}</td>
    </tr>
  );
}

export function Tabs({ tabs, active, onChange }: { tabs: { key: string; label: string }[]; active: string; onChange: (k: string) => void }) {
  return (
    <div className="flex gap-0 border-b border-border mb-5 overflow-x-auto">
      {tabs.map(t => (
        <button
          key={t.key}
          onClick={() => onChange(t.key)}
          className={`px-5 py-2.5 text-xs font-semibold tracking-wider uppercase border-b-2 transition-all whitespace-nowrap ${
            active === t.key ? 'text-foreground border-b-primary' : 'text-ast-text3 border-b-transparent hover:text-foreground'
          }`}
        >
          {t.label}
        </button>
      ))}
    </div>
  );
}
