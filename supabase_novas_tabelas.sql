-- ============================================================
-- POINT ERP/CRM — Tabelas financeiras + Usuários + Caixa
-- Cole TODO este conteúdo no SQL Editor do Supabase e clique RUN
-- ============================================================

-- Contas a Receber
CREATE TABLE IF NOT EXISTS contas_receber (
    id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    pedido_id        UUID,
    cliente_nome     TEXT NOT NULL,
    descricao        TEXT,
    valor            DECIMAL(12,2) NOT NULL DEFAULT 0,
    data_vencimento  DATE,
    data_recebimento TIMESTAMP WITH TIME ZONE,
    status           TEXT NOT NULL DEFAULT 'Aguardando',
    created_at       TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Contas a Pagar
CREATE TABLE IF NOT EXISTS contas_pagar (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    compra_id       UUID,
    fornecedor_nome TEXT NOT NULL,
    descricao       TEXT,
    valor           DECIMAL(12,2) NOT NULL DEFAULT 0,
    data_vencimento DATE,
    data_pagamento  TIMESTAMP WITH TIME ZONE,
    status          TEXT NOT NULL DEFAULT 'Aguardando',
    created_at      TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Controle de Caixa (lançamentos manuais de débito e crédito)
CREATE TABLE IF NOT EXISTS caixa (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tipo        TEXT NOT NULL CHECK (tipo IN ('credito','debito')),
    categoria   TEXT NOT NULL DEFAULT 'Outros',
    descricao   TEXT NOT NULL,
    valor       DECIMAL(12,2) NOT NULL DEFAULT 0,
    data        DATE NOT NULL DEFAULT CURRENT_DATE,
    observacoes TEXT,
    created_at  TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Usuários do sistema (login por email)
CREATE TABLE IF NOT EXISTS usuarios_sistema (
    id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    nome       TEXT NOT NULL,
    email      TEXT NOT NULL UNIQUE,
    senha_hash TEXT NOT NULL,
    role       TEXT NOT NULL DEFAULT 'colaborador' CHECK (role IN ('admin','colaborador')),
    ativo      BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Usuário admin padrão (senha: admin123)
INSERT INTO usuarios_sistema (nome, email, senha_hash, role)
VALUES ('Admin Point', 'admin@point.com', 'admin123', 'admin')
ON CONFLICT (email) DO NOTHING;

-- Confirme as tabelas criadas:
SELECT table_name FROM information_schema.tables
WHERE table_schema = 'public'
  AND table_name IN ('contas_receber','contas_pagar','caixa','usuarios_sistema')
ORDER BY table_name;
