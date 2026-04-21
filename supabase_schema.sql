-- ============================================================
-- POINT ERP/CRM — Schema Completo para Supabase (PostgreSQL)
-- Versão: 2.0 — Produção-Ready
-- ============================================================
-- Como usar:
--   Supabase Dashboard → SQL Editor → New Query → Cole e Execute
-- ============================================================

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 1. KANBAN STATUS (deve existir antes de pedidos)
CREATE TABLE IF NOT EXISTS kanban_status (
    id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    nome       TEXT NOT NULL UNIQUE,
    ordem      INTEGER NOT NULL,
    cor_hex    TEXT DEFAULT '#94a3b8',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

INSERT INTO kanban_status (nome, ordem, cor_hex) VALUES
    ('Lead',       1, '#94a3b8'),
    ('Orçamento',  2, '#fbbf24'),
    ('Aprovação',  3, '#60a5fa'),
    ('Produção',   4, '#f87171'),
    ('Finalizado', 5, '#4ade80')
ON CONFLICT (nome) DO NOTHING;

-- 2. CLIENTES
CREATE TABLE IF NOT EXISTS clientes (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    nome        TEXT NOT NULL,
    cpf_cnpj    TEXT,
    email       TEXT,
    telefone    TEXT,
    whatsapp    TEXT,
    cidade      TEXT,
    estado      TEXT,
    observacoes TEXT,
    created_at  TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at  TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_clientes_nome ON clientes (nome);

-- 3. FORNECEDORES
CREATE TABLE IF NOT EXISTS fornecedores (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    nome        TEXT NOT NULL,
    cnpj        TEXT,
    contato     TEXT,
    telefone    TEXT,
    whatsapp    TEXT,
    email       TEXT,
    cidade      TEXT,
    observacoes TEXT,
    created_at  TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at  TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_fornecedores_nome ON fornecedores (nome);

-- 4. INSUMOS
CREATE TABLE IF NOT EXISTS insumos (
    id                 UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    nome               TEXT NOT NULL,
    tipo               TEXT NOT NULL CHECK (tipo IN ('papel','tinta','fita','cola','vinil','embalagem','outro')),
    unidade_medida     TEXT NOT NULL CHECK (unidade_medida IN ('folha','ml','metro','unidade','kg','litro')),
    custo_unitario     DECIMAL(12, 4) NOT NULL CHECK (custo_unitario >= 0),
    estoque_atual      DECIMAL(12, 3) DEFAULT 0 CHECK (estoque_atual >= 0),
    estoque_minimo     DECIMAL(12, 3) DEFAULT 0 CHECK (estoque_minimo >= 0),
    fornecedor_id      UUID REFERENCES fornecedores(id) ON DELETE SET NULL,
    gramatura          DECIMAL(6, 1),
    cor                TEXT,
    referencia_interna TEXT,
    observacoes        TEXT,
    ativo              BOOLEAN DEFAULT TRUE,
    created_at         TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at         TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_insumos_nome ON insumos (nome);
CREATE INDEX IF NOT EXISTS idx_insumos_tipo ON insumos (tipo);

-- 5. MÁQUINAS
CREATE TABLE IF NOT EXISTS maquinas (
    id                     UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    nome                   TEXT NOT NULL,
    tipo                   TEXT DEFAULT 'plotter' CHECK (tipo IN ('plotter','impressora','guilhotina','laminadora','outro')),
    valor_compra           DECIMAL(12, 2) NOT NULL CHECK (valor_compra > 0),
    vida_util_meses        INTEGER NOT NULL CHECK (vida_util_meses > 0),
    custo_manutencao_anual DECIMAL(10, 2) DEFAULT 0,
    horas_uso_dia          DECIMAL(4, 1) DEFAULT 8.0,
    dias_uteis_mes         INTEGER DEFAULT 22,
    ativo                  BOOLEAN DEFAULT TRUE,
    observacoes            TEXT,
    created_at             TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at             TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- View: custo por minuto calculado
CREATE OR REPLACE VIEW vw_custo_maquinas AS
SELECT
    id, nome, tipo, valor_compra, vida_util_meses,
    custo_manutencao_anual, horas_uso_dia, dias_uteis_mes, ativo,
    ROUND(
        ((valor_compra / vida_util_meses) + (custo_manutencao_anual / 12.0))
        / (dias_uteis_mes * horas_uso_dia * 60.0),
        6
    ) AS custo_por_minuto
FROM maquinas;

-- 6. PRODUTOS
CREATE TABLE IF NOT EXISTS produtos (
    id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    nome                TEXT NOT NULL,
    descricao           TEXT,
    categoria           TEXT DEFAULT 'kit',
    markup_sugerido     DECIMAL(6, 3) DEFAULT 2.500 CHECK (markup_sugerido > 0),
    custo_mao_obra_hora DECIMAL(8, 2) DEFAULT 25.00,
    imagem_url          TEXT,
    ativo               BOOLEAN DEFAULT TRUE,
    created_at          TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at          TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_produtos_nome ON produtos (nome);

-- 7. COMPOSIÇÃO DE PRODUTOS (BOM)
CREATE TABLE IF NOT EXISTS composicao_produtos (
    id                     UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    produto_id             UUID NOT NULL REFERENCES produtos(id) ON DELETE CASCADE,
    insumo_id              UUID REFERENCES insumos(id) ON DELETE RESTRICT,
    maquina_id             UUID REFERENCES maquinas(id) ON DELETE RESTRICT,
    quantidade_insumo      DECIMAL(12, 4) DEFAULT 0,
    percentual_desperdicio DECIMAL(5, 2) DEFAULT 5.00,
    tempo_maquina_minutos  DECIMAL(8, 2) DEFAULT 0,
    observacoes            TEXT,
    created_at             TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    CONSTRAINT chk_insumo_ou_maquina CHECK (
        (insumo_id IS NOT NULL AND maquina_id IS NULL) OR
        (insumo_id IS NULL AND maquina_id IS NOT NULL)
    )
);
CREATE INDEX IF NOT EXISTS idx_composicao_produto_id ON composicao_produtos (produto_id);

-- 8. PEDIDOS
CREATE SEQUENCE IF NOT EXISTS seq_pedidos START 1;

CREATE TABLE IF NOT EXISTS pedidos (
    id                     UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    codigo                 TEXT UNIQUE,
    cliente_id             UUID REFERENCES clientes(id) ON DELETE SET NULL,
    cliente_nome_avulso    TEXT,
    cliente_contato_avulso TEXT,
    status_id              UUID NOT NULL REFERENCES kanban_status(id),
    valor_total            DECIMAL(12, 2) DEFAULT 0,
    desconto               DECIMAL(12, 2) DEFAULT 0,
    data_entrega           TIMESTAMP WITH TIME ZONE,
    observacoes            TEXT,
    arte_aprovada          BOOLEAN DEFAULT FALSE,
    pagamento_confirmado   BOOLEAN DEFAULT FALSE,
    created_at             TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at             TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_pedidos_status_id ON pedidos (status_id);
CREATE INDEX IF NOT EXISTS idx_pedidos_created_at ON pedidos (created_at DESC);

-- Trigger: código automático ex. 2024-0001
CREATE OR REPLACE FUNCTION gerar_codigo_pedido()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.codigo IS NULL THEN
        NEW.codigo := TO_CHAR(NOW(), 'YYYY') || '-' || LPAD(NEXTVAL('seq_pedidos')::TEXT, 4, '0');
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_gerar_codigo_pedido ON pedidos;
CREATE TRIGGER trg_gerar_codigo_pedido
    BEFORE INSERT ON pedidos
    FOR EACH ROW EXECUTE FUNCTION gerar_codigo_pedido();

-- 9. ITENS DO PEDIDO
CREATE TABLE IF NOT EXISTS itens_pedido (
    id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    pedido_id        UUID NOT NULL REFERENCES pedidos(id) ON DELETE CASCADE,
    produto_id       UUID NOT NULL REFERENCES produtos(id) ON DELETE RESTRICT,
    quantidade       INTEGER NOT NULL CHECK (quantidade > 0),
    preco_unitario   DECIMAL(12, 2) NOT NULL CHECK (preco_unitario >= 0),
    custo_unitario   DECIMAL(12, 4) DEFAULT 0,
    descricao_custom TEXT,
    created_at       TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_itens_pedido_pedido_id ON itens_pedido (pedido_id);

-- Trigger: recalcular total do pedido automaticamente
CREATE OR REPLACE FUNCTION recalcular_total_pedido()
RETURNS TRIGGER AS $$
BEGIN
    UPDATE pedidos
    SET valor_total = (
        SELECT COALESCE(SUM(quantidade * preco_unitario), 0)
        FROM itens_pedido
        WHERE pedido_id = COALESCE(NEW.pedido_id, OLD.pedido_id)
    ),
    updated_at = NOW()
    WHERE id = COALESCE(NEW.pedido_id, OLD.pedido_id);
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_recalcular_total ON itens_pedido;
CREATE TRIGGER trg_recalcular_total
    AFTER INSERT OR UPDATE OR DELETE ON itens_pedido
    FOR EACH ROW EXECUTE FUNCTION recalcular_total_pedido();

-- 10. FUNÇÃO: BAIXA ATÔMICA DE ESTOQUE
CREATE OR REPLACE FUNCTION baixar_estoque_pedido(p_pedido_id UUID)
RETURNS JSONB AS $$
DECLARE
    v_item               RECORD;
    v_composicao         RECORD;
    v_qtd_necessaria     DECIMAL;
    v_erros              JSONB := '[]'::JSONB;
BEGIN
    FOR v_item IN
        SELECT produto_id, quantidade FROM itens_pedido WHERE pedido_id = p_pedido_id
    LOOP
        FOR v_composicao IN
            SELECT cp.insumo_id, cp.quantidade_insumo, cp.percentual_desperdicio,
                   i.nome AS insumo_nome, i.estoque_atual
            FROM composicao_produtos cp
            JOIN insumos i ON i.id = cp.insumo_id
            WHERE cp.produto_id = v_item.produto_id AND cp.insumo_id IS NOT NULL
        LOOP
            v_qtd_necessaria := v_composicao.quantidade_insumo * v_item.quantidade
                                * (1 + v_composicao.percentual_desperdicio / 100.0);

            IF v_composicao.estoque_atual < v_qtd_necessaria THEN
                v_erros := v_erros || jsonb_build_object(
                    'insumo', v_composicao.insumo_nome,
                    'necessario', v_qtd_necessaria,
                    'disponivel', v_composicao.estoque_atual
                );
            ELSE
                UPDATE insumos
                SET estoque_atual = estoque_atual - v_qtd_necessaria,
                    updated_at = NOW()
                WHERE id = v_composicao.insumo_id;
            END IF;
        END LOOP;
    END LOOP;

    IF jsonb_array_length(v_erros) > 0 THEN
        RETURN jsonb_build_object('sucesso', false, 'erros', v_erros);
    END IF;
    RETURN jsonb_build_object('sucesso', true, 'erros', '[]'::JSONB);
END;
$$ LANGUAGE plpgsql;

-- 11. HISTÓRICO DE ESTOQUE (Auditoria)
CREATE TABLE IF NOT EXISTS movimentacoes_estoque (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    insumo_id       UUID NOT NULL REFERENCES insumos(id) ON DELETE CASCADE,
    pedido_id       UUID REFERENCES pedidos(id) ON DELETE SET NULL,
    tipo            TEXT NOT NULL CHECK (tipo IN ('entrada','saida','ajuste')),
    quantidade      DECIMAL(12, 3) NOT NULL,
    saldo_anterior  DECIMAL(12, 3),
    saldo_posterior DECIMAL(12, 3),
    observacao      TEXT,
    created_at      TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 12. COMPRAS (registro de entrada de insumos)
CREATE TABLE IF NOT EXISTS compras (
    id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    fornecedor_id    UUID REFERENCES fornecedores(id) ON DELETE SET NULL,
    fornecedor_nome  TEXT NOT NULL,
    data             DATE NOT NULL DEFAULT CURRENT_DATE,
    nota_fiscal      TEXT,
    total            DECIMAL(12, 2) DEFAULT 0,
    status           TEXT DEFAULT 'Recebido' CHECK (status IN ('Recebido','Pendente','Cancelado')),
    itens            JSONB DEFAULT '[]',
    observacoes      TEXT,
    created_at       TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_compras_fornecedor ON compras (fornecedor_id);
CREATE INDEX IF NOT EXISTS idx_compras_data ON compras (data DESC);

-- ============================================================
-- DADOS DE EXEMPLO (remova em produção se preferir)
-- ============================================================
INSERT INTO insumos (nome, tipo, unidade_medida, custo_unitario, estoque_atual, estoque_minimo, gramatura)
VALUES
    ('Papel Offset 90g A4',     'papel',     'folha',   0.0850, 5000, 500,  90.0),
    ('Papel Couché 150g A3',    'papel',     'folha',   0.3200, 2000, 200,  150.0),
    ('Vinil Adesivo Branco',    'vinil',     'metro',   8.5000, 100,  20,   NULL),
    ('Tinta Ciano Epson 664',   'tinta',     'ml',      0.0650, 500,  100,  NULL),
    ('Tinta Magenta Epson 664', 'tinta',     'ml',      0.0650, 500,  100,  NULL),
    ('Tinta Preta Epson 664',   'tinta',     'ml',      0.0480, 800,  150,  NULL),
    ('Fita Cetim 3cm',          'fita',      'metro',   0.1800, 200,  30,   NULL),
    ('Cola Bastão UHU',         'cola',      'unidade', 4.5000, 50,   10,   NULL),
    ('Envelope Kraft A5',       'embalagem', 'unidade', 0.4500, 300,  50,   NULL)
ON CONFLICT DO NOTHING;

INSERT INTO maquinas (nome, tipo, valor_compra, vida_util_meses, custo_manutencao_anual, horas_uso_dia)
VALUES
    ('Epson L1800',       'impressora', 3500.00,  60, 480.00,  8.0),
    ('Plotter Roland BN-20', 'plotter', 22000.00, 84, 2400.00, 8.0)
ON CONFLICT DO NOTHING;

-- ============================================================
-- VERIFICAÇÃO: lista tabelas criadas
-- ============================================================
SELECT table_name FROM information_schema.tables
WHERE table_schema = 'public' AND table_type = 'BASE TABLE'
ORDER BY table_name;
