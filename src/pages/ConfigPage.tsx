import React, { useState } from 'react';
import { DB } from '@/lib/db';
import { useAuth } from '@/lib/auth';
import type { User, PropConfig } from '@/lib/types';
import { PageHeader, Tabs, Btn } from '@/components/UIComponents';
import { FormSection, FormGrid, FormGroup, inputClass } from '@/components/Modal';

export default function ConfigPage() {
  const { user, updateUser } = useAuth();
  const [tab, setTab] = useState('perfil');
  const [nome, setNome] = useState(user?.nome || '');
  const [tel, setTel] = useState(user?.tel || '');
  const [cargo, setCargo] = useState(user?.cargo || '');
  const [propEmpresa, setPropEmpresa] = useState('');
  const [propCnpj, setPropCnpj] = useState('');
  const [propEnd, setPropEnd] = useState('');
  const [propTel, setPropTel] = useState('');
  const [oldPass, setOldPass] = useState('');
  const [newPass, setNewPass] = useState('');
  const [confPass, setConfPass] = useState('');
  const [msg, setMsg] = useState('');

  React.useEffect(() => {
    const cfg = DB.getObj<PropConfig>('propConfig');
    setPropEmpresa(cfg.empresa || 'GRUPO AST');
    setPropCnpj(cfg.cnpj || '35.794.626/0001-00');
    setPropEnd(cfg.end || 'Av. Adjar da Silva Casé, 800, Indianópolis, Caruaru — Sala 17');
    setPropTel(cfg.tel || '81 4042.3084');
  }, []);

  const saveProfile = () => {
    const users = DB.get<User>('users');
    const idx = users.findIndex(u => u.id === user?.id);
    if (idx < 0) return;
    users[idx].nome = nome; users[idx].tel = tel; users[idx].cargo = cargo;
    DB.set('users', users);
    updateUser(users[idx]);
    setMsg('Perfil salvo!');
    setTimeout(() => setMsg(''), 2000);
  };

  const savePropConfig = () => {
    DB.setObj('propConfig', { empresa: propEmpresa, cnpj: propCnpj, end: propEnd, tel: propTel });
    setMsg('Configurações de proposta salvas!');
    setTimeout(() => setMsg(''), 2000);
  };

  const changePassword = () => {
    if (!oldPass || !newPass) { setMsg('Preencha todos os campos'); return; }
    const users = DB.get<User>('users');
    const idx = users.findIndex(u => u.id === user?.id);
    if (users[idx].senha !== oldPass) { setMsg('Senha atual incorreta'); return; }
    if (newPass !== confPass) { setMsg('As senhas não coincidem'); return; }
    if (newPass.length < 6) { setMsg('Mínimo 6 caracteres'); return; }
    users[idx].senha = newPass;
    DB.set('users', users);
    setMsg('Senha alterada!');
    setOldPass(''); setNewPass(''); setConfPass('');
    setTimeout(() => setMsg(''), 2000);
  };

  const TABS = [
    { key: 'perfil', label: 'Perfil' },
    { key: 'proposta', label: 'Padrão de proposta' },
    { key: 'senha', label: 'Senha' },
  ];

  return (
    <div>
      <PageHeader title="CONFIGU" titleEm="RAÇÕES" sub="Perfil e preferências" />
      <Tabs tabs={TABS} active={tab} onChange={setTab} />
      {msg && <div className="mb-4 text-sm text-ast-green">{msg}</div>}

      {tab === 'perfil' && (
        <>
          <FormSection title="Dados pessoais">
            <FormGrid>
              <FormGroup label="Nome completo"><input className={inputClass} value={nome} onChange={e => setNome(e.target.value)} /></FormGroup>
              <FormGroup label="E-mail"><input className={inputClass} value={user?.email || ''} readOnly /></FormGroup>
              <FormGroup label="Telefone"><input className={inputClass} value={tel} onChange={e => setTel(e.target.value)} /></FormGroup>
              <FormGroup label="Cargo"><input className={inputClass} value={cargo} onChange={e => setCargo(e.target.value)} /></FormGroup>
            </FormGrid>
          </FormSection>
          <Btn onClick={saveProfile}>Salvar perfil</Btn>
        </>
      )}

      {tab === 'proposta' && (
        <>
          <FormSection title="Dados padrão da empresa nas propostas">
            <FormGrid>
              <FormGroup label="Nome empresa"><input className={inputClass} value={propEmpresa} onChange={e => setPropEmpresa(e.target.value)} /></FormGroup>
              <FormGroup label="CNPJ"><input className={inputClass} value={propCnpj} onChange={e => setPropCnpj(e.target.value)} /></FormGroup>
              <FormGroup label="Endereço" full><input className={inputClass} value={propEnd} onChange={e => setPropEnd(e.target.value)} /></FormGroup>
              <FormGroup label="Telefone"><input className={inputClass} value={propTel} onChange={e => setPropTel(e.target.value)} /></FormGroup>
            </FormGrid>
          </FormSection>
          <Btn onClick={savePropConfig}>Salvar</Btn>
        </>
      )}

      {tab === 'senha' && (
        <>
          <FormSection title="Alterar senha">
            <FormGrid>
              <FormGroup label="Senha atual"><input type="password" className={inputClass} value={oldPass} onChange={e => setOldPass(e.target.value)} /></FormGroup>
              <FormGroup label="Nova senha"><input type="password" className={inputClass} value={newPass} onChange={e => setNewPass(e.target.value)} /></FormGroup>
              <FormGroup label="Confirmar nova senha"><input type="password" className={inputClass} value={confPass} onChange={e => setConfPass(e.target.value)} /></FormGroup>
            </FormGrid>
          </FormSection>
          <Btn onClick={changePassword}>Alterar senha</Btn>
        </>
      )}
    </div>
  );
}
