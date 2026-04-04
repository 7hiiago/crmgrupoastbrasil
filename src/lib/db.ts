/* localStorage wrapper */
export const DB = {
  get: <T>(k: string): T[] => {
    try { return JSON.parse(localStorage.getItem('ast_' + k) || '[]'); }
    catch { return []; }
  },
  set: <T>(k: string, v: T[]) => localStorage.setItem('ast_' + k, JSON.stringify(v)),
  getObj: <T>(k: string): T => {
    try { return JSON.parse(localStorage.getItem('ast_' + k) || '{}'); }
    catch { return {} as T; }
  },
  setObj: <T>(k: string, v: T) => localStorage.setItem('ast_' + k, JSON.stringify(v)),
};

export const uid = () => 'id' + Date.now() + Math.random().toString(36).slice(2, 6);

export const fmt = (n: number) =>
  Number(n).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

export const fmtK = (n: number) =>
  n >= 1000 ? (n / 1000).toFixed(1) + 'k' : String(Math.round(n));

export const fmtDate = (d: string) =>
  d ? new Date(d + 'T12:00:00').toLocaleDateString('pt-BR') : '—';

export function nextNegCode(): string {
  const negs = DB.get<{ codigo: string }>('negociacoes');
  const nums = negs.map(n => parseInt((n.codigo || '').replace(/\D/g, '')) || 0);
  const next = nums.length ? Math.max(...nums) + 1 : 1;
  return 'AST-' + String(next).padStart(3, '0');
}

export function nextRecCode(): string {
  const recs = DB.get<{ codigo: string }>('recorrentes');
  return 'REC-' + String(recs.length + 1).padStart(3, '0');
}
