# 📦 Instalação — Tarefas + Relatórios

## Arquivos novos (copiar para src/pages/)
- TarefasPage.tsx  →  src/pages/TarefasPage.tsx
- RelatoriosPage.tsx  →  src/pages/RelatoriosPage.tsx

## Arquivos substituídos
- Index.tsx  →  src/pages/Index.tsx  (substitui o original)

## 1. Adicionar ao src/lib/types.ts
Cole no FINAL do arquivo types.ts existente:

```ts
export interface Tarefa {
  id: string;
  titulo: string;
  descricao?: string;
  tipo: 'ligacao' | 'email' | 'reuniao' | 'proposta' | 'followup' | 'outro';
  prioridade: 'baixa' | 'media' | 'alta' | 'urgente';
  status: 'pendente' | 'concluida' | 'cancelada';
  negociacaoId?: string;
  negociacaoTitulo?: string;
  clienteId?: string;
  clienteNome?: string;
  responsavelId: string;
  responsavelNome: string;
  dataVencimento: string;
  dataConclusao?: string;
  criadoEm: string;
  criadoPor: string;
  lembrete?: boolean;
}
```

## 2. Adicionar ao menu de navegação (src/components/Layout.tsx)
Adicione os novos itens na lista de navegação do Layout:

```ts
{ key: 'tarefas',    label: 'Tarefas',    icon: '✅' },
{ key: 'relatorios', label: 'Relatórios', icon: '📊' },
```

## 3. Adicionar headerExtra ao Layout (src/components/Layout.tsx)
O Index.tsx passa uma prop `headerExtra` com o sino de notificações.
Adicione a prop no Layout e renderize-a no header:

```tsx
// No tipo de props do Layout:
headerExtra?: React.ReactNode;

// No JSX do header do Layout:
<div className="flex items-center gap-3">
  {headerExtra}
  {/* ...outros itens do header... */}
</div>
```

## 4. Verificar
npm run dev
Acesse: Tarefas (✅) e Relatórios (📊) no menu lateral.

## Funcionalidades entregues

### Tarefas / Follow-up
- Criar tarefas com tipo (ligação, e-mail, reunião, proposta, follow-up)
- Prioridade: baixa, média, alta, urgente
- Vínculo com negociação e cliente
- Marcar como concluída com um clique
- Filtros: Pendentes / Hoje / Atrasadas / Concluídas
- Badge de alerta na sidebar para tarefas atrasadas ou vencendo hoje
- Sino de notificação no header com painel de alertas
- Notificação do navegador (se permitido) ao abrir o sistema

### Relatórios
- 4 abas: Visão Geral / Por Vendedor / Evolução Mensal / Produtos
- KPIs: total, fechadas, faturado, ticket médio, pipeline, conversão
- Gráficos: barras, linhas, pizza (via recharts — já instalado)
- Tabelas detalhadas com ranking
- Exportação CSV com um clique (abre no Excel)
- Filtro por ano
