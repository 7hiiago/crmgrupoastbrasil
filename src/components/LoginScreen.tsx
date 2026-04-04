import React, { useState } from 'react';
import { useAuth } from '@/lib/auth';

export default function LoginScreen() {
  const { login } = useAuth();
  const [email, setEmail] = useState('');
  const [pass, setPass] = useState('');
  const [error, setError] = useState(false);

  const handleLogin = () => {
    if (!login(email.trim(), pass)) {
      setError(true);
    }
  };

  return (
    <div className="fixed inset-0 bg-background flex items-center justify-center z-[1000]">
      <div className="bg-card border border-border rounded-lg p-11 w-[360px] max-w-[90vw] text-center">
        <div className="font-condensed text-[38px] font-black tracking-[4px] mb-1">
          GRUPO<span className="text-primary">AST</span>
        </div>
        <div className="text-[11px] text-ast-text3 tracking-[2px] uppercase mb-8">CRM Comercial</div>
        <input
          type="email"
          placeholder="E-mail"
          value={email}
          onChange={e => { setEmail(e.target.value); setError(false); }}
          onKeyDown={e => e.key === 'Enter' && handleLogin()}
          className="w-full bg-ast-bg3 border border-border rounded px-3.5 py-2.5 text-foreground text-sm mb-2.5 focus:outline-none focus:border-primary placeholder:text-ast-text3"
        />
        <input
          type="password"
          placeholder="Senha"
          value={pass}
          onChange={e => { setPass(e.target.value); setError(false); }}
          onKeyDown={e => e.key === 'Enter' && handleLogin()}
          className="w-full bg-ast-bg3 border border-border rounded px-3.5 py-2.5 text-foreground text-sm mb-2.5 focus:outline-none focus:border-primary placeholder:text-ast-text3"
        />
        <button
          onClick={handleLogin}
          className="w-full py-3 bg-primary hover:bg-ast-red-dark text-primary-foreground rounded font-bold text-[13px] tracking-[2px] uppercase mt-1 transition-colors"
        >
          Entrar
        </button>
        {error && <p className="text-primary text-xs mt-2.5">E-mail ou senha incorretos.</p>}
      </div>
    </div>
  );
}
