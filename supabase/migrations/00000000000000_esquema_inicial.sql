-- ============================================================================
-- ESQUEMA DE BASE DE DATOS — App Finanzas Personales MX
-- PostgreSQL 15+ / Supabase
-- Convenciones: snake_case, UUID como PK, timestamps con zona horaria,
-- montos en NUMERIC(12,2) (nunca float), moneda implícita MXN.
-- ============================================================================

create extension if not exists "uuid-ossp";
create extension if not exists "pgcrypto";

-- ----------------------------------------------------------------------------
-- 1. USUARIOS
-- Supabase Auth maneja login (email/pass, Google, Apple) en auth.users.
-- Esta tabla extiende el perfil con datos financieros propios de la app.
-- ----------------------------------------------------------------------------
create table public.usuarios (
    id                  uuid primary key references auth.users(id) on delete cascade,
    nombre              text not null,
    ingreso_mensual     numeric(12,2),                -- ingreso neto declarado, usado para "gastable"
    dia_pago_nomina     smallint check (dia_pago_nomina between 1 and 31),
    moneda              text not null default 'MXN',
    tema_alertas        text not null default 'balanceado'
                        check (tema_alertas in ('conservador','balanceado','agresivo')),
    onboarding_completo boolean not null default false,
    creado_en           timestamptz not null default now(),
    actualizado_en      timestamptz not null default now()
);

-- ----------------------------------------------------------------------------
-- 2. CUENTAS Y TARJETAS
-- Cubre débito, crédito, efectivo y cuentas de ahorro/inversión (CETES/Sofipo).
-- Los campos de corte/límite de pago son el núcleo del dolor #2 del brief.
-- ----------------------------------------------------------------------------
create table public.cuentas (
    id                      uuid primary key default gen_random_uuid(),
    usuario_id              uuid not null references public.usuarios(id) on delete cascade,
    nombre                  text not null,                 -- "BBVA Oro", "Nu Platino"
    institucion             text,                           -- banco / fintech
    tipo                    text not null
                            check (tipo in ('debito','credito','efectivo','ahorro','inversion')),
    ultimos_4_digitos       char(4),
    limite_credito          numeric(12,2),                  -- solo tipo=credito
    tasa_interes_anual      numeric(6,3),                   -- % anual, tarjetas/deudas
    cat                     numeric(6,3),                   -- Costo Anual Total publicado
    dia_corte               smallint check (dia_corte between 1 and 31),      -- fecha de corte
    dias_para_limite_pago   smallint default 20,            -- días entre corte y fecha límite de pago
    saldo_actual            numeric(12,2) not null default 0,
    color_hex               text default '#2455A4',         -- para UI (identidad visual por tarjeta)
    activa                  boolean not null default true,
    creado_en               timestamptz not null default now()
);

-- ----------------------------------------------------------------------------
-- 3. DEUDAS
-- Una deuda puede o no estar ligada a una cuenta (ej. préstamo personal sin
-- tarjeta asociada). Aquí vive la lógica para Bola de Nieve / Avalancha.
-- ----------------------------------------------------------------------------
create table public.deudas (
    id                  uuid primary key default gen_random_uuid(),
    usuario_id          uuid not null references public.usuarios(id) on delete cascade,
    cuenta_id           uuid references public.cuentas(id) on delete set null,
    nombre              text not null,                      -- "TDC Nu", "Préstamo Kueski"
    tipo                text not null
                        check (tipo in ('tarjeta_credito','prestamo_personal','hipoteca','automotriz','otro')),
    monto_original      numeric(12,2) not null,
    saldo_actual        numeric(12,2) not null,
    tasa_interes_anual  numeric(6,3) not null,               -- para cálculo de intereses reales
    cat                 numeric(6,3),
    pago_minimo         numeric(12,2),
    fecha_inicio        date,
    fecha_meta_manual   date,                                -- meta opcional del usuario
    estrategia          text default 'ninguna'
                        check (estrategia in ('ninguna','bola_de_nieve','avalancha')),
    prioridad_manual    smallint,                            -- override manual del orden de pago
    activa              boolean not null default true,
    creado_en           timestamptz not null default now()
);

-- Simulaciones guardadas de aportaciones extraordinarias (para no recalcular
-- siempre en el cliente y poder mostrar historial de "qué hubiera pasado si...").
create table public.simulaciones_deuda (
    id                      uuid primary key default gen_random_uuid(),
    usuario_id              uuid not null references public.usuarios(id) on delete cascade,
    estrategia              text not null check (estrategia in ('bola_de_nieve','avalancha')),
    aportacion_extra_mensual numeric(12,2) not null default 0,
    meses_estimados         integer,
    interes_total_estimado  numeric(12,2),
    interes_ahorrado        numeric(12,2),                   -- vs. solo pagar mínimos
    meses_ahorrados         integer,
    creado_en               timestamptz not null default now()
);

-- ----------------------------------------------------------------------------
-- 4. COMPRAS A MESES SIN INTERESES (MSI)
-- Dolor #1. Cada compra genera N "cuotas" (msi_cuotas) para proyección exacta
-- del flujo mensual y detectar choques de MSI en un mismo corte.
-- ----------------------------------------------------------------------------
create table public.compras_msi (
    id                  uuid primary key default gen_random_uuid(),
    usuario_id          uuid not null references public.usuarios(id) on delete cascade,
    cuenta_id           uuid not null references public.cuentas(id) on delete cascade,
    comercio            text not null,
    monto_total         numeric(12,2) not null,
    num_meses           smallint not null check (num_meses in (3,6,9,12,18,24)),
    monto_mensualidad   numeric(12,2) not null,             -- monto_total / num_meses (o con comisión)
    comision_msi        numeric(12,2) default 0,            -- algunos bancos cobran comisión fija
    fecha_compra        date not null,
    recibo_id           uuid,                                -- fk lógico a recibos (ver abajo)
    creado_en           timestamptz not null default now()
);

create table public.msi_cuotas (
    id                  uuid primary key default gen_random_uuid(),
    compra_msi_id       uuid not null references public.compras_msi(id) on delete cascade,
    num_cuota           smallint not null,                  -- 1..num_meses
    fecha_estimada      date not null,                      -- corte donde aparecerá
    monto               numeric(12,2) not null,
    pagada              boolean not null default false,
    unique (compra_msi_id, num_cuota)
);

-- ----------------------------------------------------------------------------
-- 5. TRANSACCIONES
-- Movimientos normales (no-MSI) e ingresos. Categoría separada de servicios
-- recurrentes para permitir reportes por categoría libre.
-- ----------------------------------------------------------------------------
create table public.categorias (
    id          uuid primary key default gen_random_uuid(),
    usuario_id  uuid references public.usuarios(id) on delete cascade, -- null = categoría global/default
    nombre      text not null,
    tipo        text not null check (tipo in ('ingreso','gasto')),
    icono       text,
    color_hex   text
);

create table public.transacciones (
    id              uuid primary key default gen_random_uuid(),
    usuario_id      uuid not null references public.usuarios(id) on delete cascade,
    cuenta_id       uuid references public.cuentas(id) on delete set null,
    categoria_id    uuid references public.categorias(id) on delete set null,
    tipo            text not null check (tipo in ('ingreso','gasto')),
    monto           numeric(12,2) not null,
    descripcion     text,
    fecha           date not null,
    origen          text not null default 'manual'
                    check (origen in ('manual','xml_sat','ocr_ticket','open_banking')),
    recibo_id       uuid references public.recibos(id) on delete set null,
    creado_en       timestamptz not null default now()
);

-- ----------------------------------------------------------------------------
-- 6. RECIBOS (XML del SAT + OCR de tickets físicos)
-- Guarda el archivo crudo en Supabase Storage (storage_path) y los campos
-- extraídos para auditar/corregir la extracción automática.
-- ----------------------------------------------------------------------------
create table public.recibos (
    id                  uuid primary key default gen_random_uuid(),
    usuario_id          uuid not null references public.usuarios(id) on delete cascade,
    tipo_origen         text not null check (tipo_origen in ('xml_sat','ocr_foto')),
    storage_path        text not null,                      -- ruta en Supabase Storage
    -- Campos comunes extraídos
    emisor_nombre       text,
    emisor_rfc          text,
    receptor_rfc        text,
    monto_total         numeric(12,2),
    fecha_emision       date,
    -- Específicos CFDI (XML SAT)
    uuid_fiscal         uuid,                               -- folio fiscal del CFDI
    metodo_pago         text,                                -- PUE, PPD
    forma_pago          text,
    uso_cfdi            text,
    -- Específicos OCR
    confianza_ocr       numeric(4,3),                        -- 0.000–1.000
    texto_crudo_ocr     text,
    -- Estado de revisión
    estado              text not null default 'pendiente_revision'
                        check (estado in ('pendiente_revision','confirmado','descartado')),
    creado_en           timestamptz not null default now()
);

alter table public.transacciones
    add constraint fk_transacciones_recibo foreign key (recibo_id) references public.recibos(id) on delete set null;

-- ----------------------------------------------------------------------------
-- 7. SERVICIOS RECURRENTES (CFE, agua, internet, streaming, etc.)
-- ----------------------------------------------------------------------------
create table public.servicios_recurrentes (
    id                  uuid primary key default gen_random_uuid(),
    usuario_id          uuid not null references public.usuarios(id) on delete cascade,
    nombre              text not null,                      -- "CFE", "Netflix", "Telmex Infinitum"
    categoria           text not null
                        check (categoria in ('luz','agua','internet','telefonia','streaming','renta','seguro','otro')),
    monto_estimado      numeric(12,2),                      -- puede variar mes a mes (CFE, agua)
    monto_fijo          boolean not null default true,
    frecuencia          text not null default 'mensual'
                        check (frecuencia in ('mensual','bimestral','anual')),
    dia_vencimiento     smallint check (dia_vencimiento between 1 and 31),
    cuenta_cargo_id     uuid references public.cuentas(id) on delete set null,
    activo              boolean not null default true,
    creado_en           timestamptz not null default now()
);

-- Historial de pagos reales de cada servicio (para detectar variaciones/alzas)
create table public.pagos_servicio (
    id                      uuid primary key default gen_random_uuid(),
    servicio_id             uuid not null references public.servicios_recurrentes(id) on delete cascade,
    monto_pagado            numeric(12,2) not null,
    fecha_pago              date not null,
    recibo_id               uuid references public.recibos(id) on delete set null,
    creado_en               timestamptz not null default now()
);

-- ----------------------------------------------------------------------------
-- 8. CALENDARIO FINANCIERO Y ALERTAS
-- Vista unificada de vencimientos: se puede materializar desde deudas,
-- msi_cuotas y servicios_recurrentes, pero se persiste para alertas anti-mora.
-- ----------------------------------------------------------------------------
create table public.alertas (
    id                  uuid primary key default gen_random_uuid(),
    usuario_id          uuid not null references public.usuarios(id) on delete cascade,
    tipo_referencia     text not null
                        check (tipo_referencia in ('deuda','msi_cuota','servicio_recurrente','cuenta_corte')),
    referencia_id       uuid not null,                      -- id de la tabla correspondiente
    titulo              text not null,
    fecha_evento        date not null,                      -- fecha de corte / límite / vencimiento
    dias_aviso_previo   smallint not null default 3,
    monto_estimado      numeric(12,2),
    estado              text not null default 'pendiente'
                        check (estado in ('pendiente','enviada','pagada','vencida','descartada')),
    creado_en           timestamptz not null default now()
);

-- ----------------------------------------------------------------------------
-- ÍNDICES CLAVE
-- ----------------------------------------------------------------------------
create index idx_cuentas_usuario on public.cuentas(usuario_id);
create index idx_deudas_usuario on public.deudas(usuario_id) where activa = true;
create index idx_transacciones_usuario_fecha on public.transacciones(usuario_id, fecha desc);
create index idx_recibos_usuario_estado on public.recibos(usuario_id, estado);
create index idx_msi_cuotas_fecha on public.msi_cuotas(fecha_estimada) where pagada = false;
create index idx_alertas_usuario_fecha on public.alertas(usuario_id, fecha_evento) where estado = 'pendiente';
create index idx_servicios_usuario on public.servicios_recurrentes(usuario_id) where activo = true;

-- ----------------------------------------------------------------------------
-- ROW LEVEL SECURITY (Supabase) — cada usuario solo ve su propia información
-- ----------------------------------------------------------------------------
alter table public.usuarios enable row level security;
alter table public.cuentas enable row level security;
alter table public.deudas enable row level security;
alter table public.transacciones enable row level security;
alter table public.recibos enable row level security;
alter table public.servicios_recurrentes enable row level security;
alter table public.alertas enable row level security;

create policy "usuarios_propio_perfil" on public.usuarios
    for all using (auth.uid() = id);

create policy "acceso_propio_cuentas" on public.cuentas
    for all using (auth.uid() = usuario_id);

create policy "acceso_propio_deudas" on public.deudas
    for all using (auth.uid() = usuario_id);

create policy "acceso_propio_transacciones" on public.transacciones
    for all using (auth.uid() = usuario_id);

create policy "acceso_propio_recibos" on public.recibos
    for all using (auth.uid() = usuario_id);

create policy "acceso_propio_servicios" on public.servicios_recurrentes
    for all using (auth.uid() = usuario_id);

create policy "acceso_propio_alertas" on public.alertas
    for all using (auth.uid() = usuario_id);
