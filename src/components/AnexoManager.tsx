import React from 'react';
import { uid } from '@/lib/db';
import type { Anexo } from '@/lib/types';

interface AnexoManagerProps {
  anexos: Anexo[];
  onChange: (anexos: Anexo[]) => void;
}

export default function AnexoManager({ anexos, onChange }: AnexoManagerProps) {
  const handleFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files) return;
    Array.from(files).forEach(file => {
      const reader = new FileReader();
      reader.onload = () => {
        const newAnexo: Anexo = {
          id: uid(),
          nome: file.name,
          tipo: file.type,
          dataUrl: reader.result as string,
          data: new Date().toISOString().split('T')[0],
        };
        onChange([...anexos, newAnexo]);
      };
      reader.readAsDataURL(file);
    });
    e.target.value = '';
  };

  const remove = (id: string) => onChange(anexos.filter(a => a.id !== id));

  return (
    <div>
      <label className="text-[10px] text-ast-text3 tracking-wider uppercase block mb-1.5">Anexos</label>
      <div className="flex flex-wrap gap-2 mb-2">
        {anexos.map(a => (
          <div key={a.id} className="bg-ast-bg3 border border-border rounded px-3 py-1.5 text-xs flex items-center gap-2">
            <span className="text-foreground">{a.nome}</span>
            <button onClick={() => {
              const link = document.createElement('a');
              link.href = a.dataUrl;
              link.download = a.nome;
              link.click();
            }} className="text-ast-blue hover:underline">↓</button>
            <button onClick={() => remove(a.id)} className="text-primary hover:text-ast-red-dark">×</button>
          </div>
        ))}
      </div>
      <label className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-ast-bg3 border border-border rounded text-xs text-ast-text2 cursor-pointer hover:bg-ast-bg4 hover:text-foreground transition-all">
        📎 Anexar arquivo
        <input type="file" multiple className="hidden" onChange={handleFile} />
      </label>
    </div>
  );
}
