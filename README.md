# 🖨️ POINT ERP/CRM — Gestão de Gráficas

Sistema de gestão para gráficas rápidas e papelaria personalizada.
**Stack:** React + Vite + TypeScript + Supabase + Tailwind CSS

---

## ✅ Pré-requisitos

Você vai precisar de contas gratuitas em:
- [github.com](https://github.com) — repositório do código
- [supabase.com](https://supabase.com) — banco de dados
- [vercel.com](https://vercel.com) — hospedagem do site

Tudo feito pelo **Google Chrome**, sem instalar nada.

---

## PASSO 1 — Criar o banco no Supabase

1. Acesse [supabase.com](https://supabase.com) e faça login
2. Clique em **"New Project"**
3. Preencha:
   - **Name:** `point-erp-crm`
   - **Database Password:** crie uma senha forte e **anote ela**
   - **Region:** escolha `South America (São Paulo)`
4. Clique em **"Create new project"** e aguarde ~2 minutos

### Criar as tabelas

5. No menu esquerdo, clique em **"SQL Editor"**
6. Clique em **"New query"**
7. Abra o arquivo `supabase_schema.sql` que está neste projeto
8. Copie **todo o conteúdo** do arquivo
9. Cole na caixa de texto do SQL Editor
10. Clique no botão **"Run"** (ícone ▶ no canto superior direito)
11. Você verá uma lista de tabelas criadas na parte de baixo — isso confirma que funcionou

### Pegar as credenciais

12. No menu esquerdo, clique em **"Project Settings"** (ícone de engrenagem ⚙️)
13. Clique em **"API"** no submenu
14. Você vai ver dois valores — **copie e guarde os dois:**
    - **Project URL** → parece com `https://xxxxxxxxxxx.supabase.co`
    - **anon public** (em "Project API Keys") → começa com `eyJhbGci...`

---

## PASSO 2 — Criar o repositório no GitHub

1. Acesse [github.com](https://github.com) e faça login
2. Clique no **"+"** no canto superior direito → **"New repository"**
3. Preencha:
   - **Repository name:** `point-erp-crm`
   - Deixe marcado como **Public**
   - Marque **"Add a README file"**
4. Clique em **"Create repository"**

### Fazer upload dos arquivos do projeto

5. Na página do repositório recém-criado, clique em **"Add file"** → **"Upload files"**
6. Arraste **todos os arquivos e pastas** do ZIP para a área de upload:
   - `index.html`
   - `package.json`
   - `vite.config.ts`
   - `tsconfig.json`
   - `.gitignore`
   - `.env.example`
   - `supabase_schema.sql`
   - `README.md`
   - A pasta `src/` inteira (com todos os arquivos dentro)
7. Na parte de baixo, escreva a mensagem: `setup inicial Point ERP/CRM`
8. Clique em **"Commit changes"**

> ⚠️ **Importante:** o arquivo `.env` (com suas credenciais reais) **NÃO deve ser enviado**.
> Apenas o `.env.example` vai para o GitHub — ele não contém dados reais.

---

## PASSO 3 — Conectar GitHub na Vercel e fazer o deploy

1. Acesse [vercel.com](https://vercel.com) e faça login
2. Clique em **"Add New…"** → **"Project"**
3. Na seção **"Import Git Repository"**, você verá o repositório `point-erp-crm`
4. Clique em **"Import"** ao lado dele

### Configurar as variáveis de ambiente (OBRIGATÓRIO antes de fazer deploy)

5. Na tela de configuração, role até **"Environment Variables"**
6. Adicione a primeira variável:
   - **Name:** `VITE_SUPABASE_URL`
   - **Value:** cole o **Project URL** que você copiou do Supabase
   - Clique em **"Add"**
7. Adicione a segunda variável:
   - **Name:** `VITE_SUPABASE_ANON_KEY`
   - **Value:** cole a chave **anon public** que você copiou do Supabase
   - Clique em **"Add"**
8. Clique em **"Deploy"**

Aguarde ~2 minutos. Quando aparecer **"Congratulations!"**, está funcionando. ✅

9. Clique no link gerado (ex: `point-erp-crm.vercel.app`) para abrir o sistema

---

## Como atualizar o sistema no futuro

Sempre que quiser atualizar algum arquivo:

1. Acesse seu repositório no GitHub
2. Clique no arquivo que quer editar
3. Clique no ícone de **lápis** ✏️ para editar
4. Faça a alteração e clique em **"Commit changes"**

A Vercel detecta automaticamente e refaz o deploy em ~1 minuto.

Para **substituir um arquivo inteiro:**
1. No repositório, navegue até a pasta onde o arquivo está
2. Clique em **"Add file"** → **"Upload files"**
3. Envie o arquivo novo (com o mesmo nome) e clique em **"Commit changes"**

---

## Estrutura do Projeto

```
point-erp/
├── index.html
├── package.json
├── vite.config.ts
├── tsconfig.json
├── .env.example               → Modelo das variáveis (sem dados reais)
├── supabase_schema.sql        → Script para criar as tabelas
├── README.md                  → Este guia
└── src/
    ├── App.tsx                → Interface completa do sistema
    ├── main.tsx
    ├── index.css
    ├── lib/
    │   ├── supabase.ts        → Conexão com o banco + tipos TypeScript
    │   ├── costEngineering.ts → Cálculo de custos e depreciação
    │   ├── pdfGenerator.ts    → Geração de PDF do orçamento
    │   └── utils.ts
    └── hooks/
        ├── useSupabase.ts         → CRUD completo no banco
        └── useBudgetCalculator.ts → Cálculo de orçamento em tempo real
```

---

## O que o sistema faz

- **Kanban CRM** — Lead → Orçamento → Aprovação → Produção → Finalizado
- **Baixa automática de estoque** — ao mover para Produção, os insumos são descontados
- **Alerta de estoque baixo** — aviso visual quando insumo está abaixo do mínimo
- **Clientes** — cadastro com link direto para WhatsApp
- **Fornecedores** — cadastro com contato e WhatsApp
- **Insumos & Estoque** — papéis, tintas, fitas, colas, vinil
- **Orçamento em PDF** — gerado com um clique
- **WhatsApp** — botão para enviar mensagem de orçamento ao cliente

---

## Precificação Técnica

```
Custo/min máquina = (Valor ÷ Vida útil em meses + Manutenção mensal)
                    ÷ (Dias úteis × Horas/dia × 60)

Custo do kit      = Insumos com desperdício
                  + Tempo de máquina × custo/min
                  + Mão de obra (horas × valor/hora)

Preço de venda    = Custo total × Markup (padrão: 2,5×)
```
