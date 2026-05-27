-- supabase/migrations/001_schema.sql

CREATE TABLE perfiles (
  id          uuid PRIMARY KEY REFERENCES auth.users ON DELETE CASCADE,
  rol         text NOT NULL CHECK (rol IN ('admin','vendedor')),
  nombre      text NOT NULL,
  created_at  timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE clientes (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  nombre      text NOT NULL,
  nit         text,
  telefono    text,
  created_at  timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE productos (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  codigo          text UNIQUE NOT NULL,
  nombre          text NOT NULL,
  descripcion     text,
  costo           numeric(10,2) NOT NULL,
  precio_venta    numeric(10,2) NOT NULL,
  stock           integer NOT NULL DEFAULT 0,
  stock_minimo    integer NOT NULL DEFAULT 5,
  ubicacion       text,
  compatibilidad  text[] NOT NULL DEFAULT '{}',
  activo          boolean NOT NULL DEFAULT true,
  created_at      timestamptz NOT NULL DEFAULT now(),
  updated_at      timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE motos (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  codigo          text UNIQUE NOT NULL,
  marca           text NOT NULL,
  modelo          text NOT NULL,
  anio            integer,
  color           text,
  motor_cc        integer,
  numero_motor    text,
  numero_chasis   text,
  costo           numeric(10,2) NOT NULL,
  precio_venta    numeric(10,2) NOT NULL,
  stock           integer NOT NULL DEFAULT 0,
  stock_minimo    integer NOT NULL DEFAULT 1,
  descripcion     text,
  activo          boolean NOT NULL DEFAULT true,
  created_at      timestamptz NOT NULL DEFAULT now(),
  updated_at      timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE ventas (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  vendedor_id     uuid NOT NULL REFERENCES perfiles(id),
  cliente_id      uuid REFERENCES clientes(id),
  tipo_venta      text NOT NULL CHECK (tipo_venta IN ('repuesto','moto')),
  total           numeric(10,2) NOT NULL,
  ganancia_neta   numeric(10,2) NOT NULL,
  metodo_pago     text NOT NULL DEFAULT 'efectivo',
  estado          text NOT NULL DEFAULT 'completada',
  notas           text,
  created_at      timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE detalle_ventas (
  id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  venta_id          uuid NOT NULL REFERENCES ventas(id) ON DELETE CASCADE,
  producto_id       uuid NOT NULL REFERENCES productos(id),
  cantidad          integer NOT NULL,
  precio_unitario   numeric(10,2) NOT NULL,
  costo_unitario    numeric(10,2) NOT NULL,
  subtotal          numeric(10,2) GENERATED ALWAYS AS (cantidad * precio_unitario) STORED,
  ganancia_item     numeric(10,2) GENERATED ALWAYS AS (cantidad * (precio_unitario - costo_unitario)) STORED
);

CREATE TABLE detalle_ventas_motos (
  id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  venta_id          uuid NOT NULL REFERENCES ventas(id) ON DELETE CASCADE,
  moto_id           uuid NOT NULL REFERENCES motos(id),
  cantidad          integer NOT NULL DEFAULT 1,
  precio_unitario   numeric(10,2) NOT NULL,
  costo_unitario    numeric(10,2) NOT NULL,
  subtotal          numeric(10,2) GENERATED ALWAYS AS (cantidad * precio_unitario) STORED,
  ganancia_item     numeric(10,2) GENERATED ALWAYS AS (cantidad * (precio_unitario - costo_unitario)) STORED
);

-- Auto-create perfil on user signup
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  INSERT INTO perfiles (id, rol, nombre)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'rol', 'vendedor'),
    COALESCE(NEW.raw_user_meta_data->>'nombre', NEW.email)
  );
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();
