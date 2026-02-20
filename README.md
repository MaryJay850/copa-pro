# CopaPro - Padel League Manager

Sistema de gestao de ligas de padel com Round Robin, equipas de 2 e rankings individuais por epoca.

## Stack

- **Frontend + Backend**: Next.js 16 (App Router) + TypeScript
- **Styling**: Tailwind CSS 4
- **ORM**: Prisma 7 com PostgreSQL (via `@prisma/adapter-pg`)
- **Testes**: Vitest

## Pre-requisitos

- Node.js >= 20
- PostgreSQL >= 14

## Configuracao

1. **Clonar e instalar dependencias**

```bash
cd copa-pro
npm install
```

2. **Configurar base de dados**

Copiar `.env` e ajustar a URL do PostgreSQL:

```
DATABASE_URL="postgresql://postgres:postgres@localhost:5432/copapro?schema=public"
```

3. **Criar a base de dados**

```bash
createdb copapro
```

4. **Gerar o cliente Prisma e correr migracoes**

```bash
npm run db:generate
npm run db:push
```

5. **(Opcional) Seed com dados de exemplo**

```bash
npm run db:seed
```

## Comandos

| Comando | Descricao |
|---------|-----------|
| `npm run dev` | Iniciar servidor de desenvolvimento |
| `npm run build` | Build de producao |
| `npm run start` | Iniciar servidor de producao |
| `npm test` | Correr testes (44 testes) |
| `npm run test:watch` | Correr testes em modo watch |
| `npm run db:generate` | Gerar cliente Prisma |
| `npm run db:push` | Aplicar schema a BD |
| `npm run db:seed` | Popular BD com dados exemplo |
| `npm run db:migrate` | Correr migracoes Prisma |

## Estrutura do Projeto

```
copa-pro/
  prisma/
    schema.prisma          # Schema da base de dados
    seed.ts                # Dados de seed
  src/
    app/
      layout.tsx           # Layout principal
      page.tsx             # Redirect para /ligas
      globals.css          # Estilos globais + print
      ligas/
        page.tsx           # Lista de ligas
        create-league-form.tsx
        [leagueId]/
          page.tsx         # Liga + epocas
          create-season-form.tsx
          epocas/
            [seasonId]/
              page.tsx     # Ranking + torneios da epoca
              torneios/
                novo/
                  page.tsx   # Wizard de criacao
                  wizard.tsx # Componente wizard (4 passos)
      torneios/
        [tournamentId]/
          page.tsx         # Vista do torneio (rondas/jogos)
          actions-client.tsx
    components/
      match-card.tsx       # Card de jogo com input de sets
      ranking-table.tsx    # Tabela de ranking individual
      ui/
        badge.tsx
        button.tsx
        card.tsx
        empty-state.tsx
        input.tsx
        score-input.tsx
    lib/
      actions.ts           # Server actions (CRUD + logica)
      db.ts                # Cliente Prisma
      ranking.ts           # Calculo de pontos e ranking
      scheduling.ts        # Geracao Round Robin + equipas
      utils.ts             # Utilitarios
  __tests__/
    ranking.test.ts        # 28 testes de ranking
    scheduling.test.ts     # 16 testes de scheduling
```

## Sistema de Pontos

Para cada jogo terminado:

1. **Pontos de set**: +2 por cada set ganho pela equipa do jogador
2. **Resultado do jogo**:
   - Vitoria: +3
   - Empate: +1 (se ativo)
   - Derrota: +0
3. **Total** = pontos de set + pontos de resultado

### Desempate (por ordem)

1. Pontos totais
2. Vitorias
3. Diferenca de sets
4. Sets ganhos
5. Empates

## Fluxo Principal

1. **Criar Liga** → /ligas
2. **Criar Epoca** → /ligas/:id (com opcao de permitir empates)
3. **Criar Torneio** → Wizard de 4 passos:
   - Passo 1: Nome, campos, formato (RR simples/duplo), modo equipas
   - Passo 2: Selecionar jogadores (adicionar novos inline)
   - Passo 3: Formar equipas (fixas ou aleatorias com seed)
   - Passo 4: Confirmar e gerar calendario
4. **Registar Resultados** → /torneios/:id
5. **Ver Ranking** → /ligas/:leagueId/epocas/:seasonId

## Exportar / Imprimir

Clique em "Imprimir / Exportar" na pagina do torneio. Usa `window.print()` com estilos CSS dedicados para impressao limpa.
