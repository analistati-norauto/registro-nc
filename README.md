# Norauto | Gestão de Não Conformidades e Ações Corretivas (POL.QUA-013)

Aplicação web (Next.js + Supabase) para digitalizar o fluxo completo do
Anexo I: registro, triagem, análise de causa, plano de ação, replicação,
verificação de eficácia e encerramento.

**Status: Fase 1 concluída** (banco de dados, autenticação, perfis, regras
de acesso via RLS, formulário completo A–I, fluxo de status, painel por
perfil, pesquisa/listagem, histórico). PDF e dashboards avançados entram
nas Fases 2–3.

---

## 1. O que falta para os colaboradores acessarem pela URL

Este pacote contém o **código completo**. Para virar `https://sistema.norauto.com.br`
funcionando no navegador, alguém (você ou o TI) precisa fazer **uma vez** os
passos abaixo — tudo por interface web, sem terminal.

### Passo 1 — Criar o projeto no Supabase (banco + login)
1. Acesse https://supabase.com e crie uma conta/organização da Norauto.
2. Crie um novo projeto (escolha a região mais próxima, ex.: São Paulo).
3. No painel do projeto, vá em **SQL Editor** e execute, nesta ordem, o
   conteúdo dos arquivos da pasta `supabase/`:
   - `01_schema.sql`
   - `02_rls.sql`
   - `03_auth_trigger.sql`
4. Em **Authentication → Providers**, deixe "Email" habilitado.
5. Em **Authentication → Users**, crie o primeiro usuário (será o admin de TI)
   com e-mail e senha.
6. Volte ao **SQL Editor** e rode:
   ```sql
   update usuarios set perfil = 'admin_ti', ativo = true
   where email = 'coloque-o-email-criado@norauto.com.br';
   ```
7. Em **Project Settings → API**, copie:
   - `Project URL`
   - `anon public key`

### Passo 2 — Publicar o site no Vercel
1. Acesse https://vercel.com e crie uma conta (pode usar login com GitHub).
2. Suba este código para um repositório no GitHub (arraste a pasta pelo
   próprio site do GitHub, em "Upload files" — não precisa de terminal).
3. No Vercel, clique em **Add New → Project** e selecione o repositório.
4. Em **Environment Variables**, adicione:
   - `NEXT_PUBLIC_SUPABASE_URL` = (Project URL do passo 1)
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY` = (anon public key do passo 1)
   - `SUPABASE_SERVICE_ROLE_KEY` = (Project Settings → API → "service_role" key,
     no Supabase — necessária para o TI conseguir criar novos usuários pela
     tela de Administração. **Nunca** exponha essa chave no navegador; ela só
     é usada dentro de `app/api/admin/usuarios/route.ts`, no servidor.)
5. Clique em **Deploy**. Em poucos minutos o Vercel gera uma URL pública
   (ex.: `norauto-nc.vercel.app`).
6. Opcional: em **Project Settings → Domains**, aponte seu domínio
   próprio (`sistema.norauto.com.br`) seguindo as instruções de DNS
   exibidas na tela.

Pronto: qualquer colaborador abre o navegador, acessa a URL, faz login e
usa o sistema — sem instalar nada.

### Passo 3 — Cadastrar setores e usuários
- Os setores padrão (Operação, Manutenção, RH, Financeiro, Comercial,
  Administrativo) já são criados pelo `01_schema.sql`.
- Para cada colaborador: crie o login em **Authentication → Users** no
  Supabase (ou, na Fase 2, pela própria tela de Administração), depois
  em **Table Editor → usuarios** defina `setor_id`, `perfil` e `ativo = true`.

---

## 2. Perfis de acesso implementados

| Perfil | Descrição |
|---|---|
| `admin_ti` | Acesso total: administra usuários/setores e também cria/edita NC e preenche as etapas E–I. |
| `diretoria` | Acesso total: vê tudo, cria NC, edita e preenche as etapas E–I (comunicação, causa raiz, plano de ação, replicação, encerramento). |
| `controladoria` | Acesso total: mesmas permissões de diretoria/TI sobre os registros (triagem, análise, plano de ação, encerramento). |
| `setor` | Vê e edita apenas os registros do próprio setor, preenche as etapas A–D, envia para a Controladoria. |

Todas as regras acima são aplicadas por **Row Level Security no Postgres**
(`supabase/02_rls.sql`) — não apenas escondendo botões na tela.

## 3. Estrutura do projeto

```
app/
  login/            tela de login
  dashboard/         painel adaptado por perfil
  nc/new/             novo registro (etapas A-D)
  nc/[id]/            detalhe, edição, plano de ação, histórico, status
  admin/usuarios/    administração (TI)
  api/nc/[id]/pdf/    geração de PDF (stub — Fase 3)
lib/                clientes Supabase (browser/server) e helpers de dados
types/db.ts         tipos e regras de permissão compartilhadas com o front
supabase/           schema SQL, RLS e trigger de autenticação
middleware.ts       protege rotas exigindo login
```

## 4. Rodando localmente (opcional, apenas para desenvolvimento)

Isto é opcional — só quem for editar o código precisa disso, não os
usuários finais.

```
npm install
cp .env.local.example .env.local   # preencha com as chaves do Supabase
npm run dev
```

## 5. Próximas fases

- **Fase 2**: upload de evidências (Supabase Storage), refinar histórico,
  alertas de prazo nas ações.
- **Fase 3**: geração real de PDF (layout A–I, tabela do plano de ação),
  dashboard da Diretoria com indicadores e gráficos, notificações
  automáticas de vencimento.
