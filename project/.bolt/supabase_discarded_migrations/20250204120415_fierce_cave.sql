/*
  # Système de vente en local

  1. Nouvelles Tables
    - `pos_sessions` : Sessions de caisse
      - `id` (uuid, primary key)
      - `cashier_id` (uuid, foreign key)
      - `opening_balance` (decimal)
      - `closing_balance` (decimal)
      - `status` (enum: 'open', 'closed')
      - `opened_at` (timestamptz)
      - `closed_at` (timestamptz)
      
    - `pos_transactions` : Transactions en caisse
      - `id` (uuid, primary key)
      - `session_id` (uuid, foreign key)
      - `order_id` (uuid, foreign key)
      - `payment_method` (enum: 'cash', 'card', 'other')
      - `amount` (decimal)
      - `created_at` (timestamptz)

    - `invoices` : Factures
      - `id` (uuid, primary key)
      - `order_id` (uuid, foreign key)
      - `invoice_number` (text, unique)
      - `customer_details` (jsonb)
      - `created_at` (timestamptz)

  2. Sécurité
    - Enable RLS sur toutes les tables
    - Policies pour les caissiers et admins
*/

-- Create enums
CREATE TYPE pos_session_status AS ENUM ('open', 'closed');
CREATE TYPE payment_method AS ENUM ('cash', 'card', 'other');

-- Create tables
CREATE TABLE pos_sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  cashier_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  opening_balance decimal NOT NULL CHECK (opening_balance >= 0),
  closing_balance decimal CHECK (closing_balance >= 0),
  status pos_session_status NOT NULL DEFAULT 'open',
  opened_at timestamptz DEFAULT now(),
  closed_at timestamptz,
  notes text
);

CREATE TABLE pos_transactions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id uuid REFERENCES pos_sessions(id) ON DELETE CASCADE,
  order_id uuid REFERENCES orders(id) ON DELETE CASCADE,
  payment_method payment_method NOT NULL,
  amount decimal NOT NULL CHECK (amount >= 0),
  created_at timestamptz DEFAULT now()
);

CREATE TABLE invoices (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id uuid REFERENCES orders(id) ON DELETE CASCADE,
  invoice_number text UNIQUE NOT NULL,
  customer_details jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE pos_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE pos_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE invoices ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
CREATE POLICY "Cashiers can view their own sessions"
  ON pos_sessions FOR SELECT
  TO authenticated
  USING (
    cashier_id = auth.uid() OR
    EXISTS (
      SELECT 1 FROM auth.users
      WHERE auth.users.id = auth.uid()
      AND auth.users.email IN ('youneshachami9@gmail.com', 'ibrahimadiawo582@gmail.com')
    )
  );

CREATE POLICY "Cashiers can create sessions"
  ON pos_sessions FOR INSERT
  TO authenticated
  WITH CHECK (
    cashier_id = auth.uid()
  );

CREATE POLICY "Cashiers can update their own sessions"
  ON pos_sessions FOR UPDATE
  TO authenticated
  USING (
    cashier_id = auth.uid()
  );

CREATE POLICY "Transactions are viewable by session cashier and admins"
  ON pos_transactions FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM pos_sessions
      WHERE pos_sessions.id = session_id
      AND (pos_sessions.cashier_id = auth.uid() OR
        EXISTS (
          SELECT 1 FROM auth.users
          WHERE auth.users.id = auth.uid()
          AND auth.users.email IN ('youneshachami9@gmail.com', 'ibrahimadiawo582@gmail.com')
        )
      )
    )
  );

CREATE POLICY "Transactions can be created by session cashier"
  ON pos_transactions FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM pos_sessions
      WHERE pos_sessions.id = session_id
      AND pos_sessions.cashier_id = auth.uid()
      AND pos_sessions.status = 'open'
    )
  );

CREATE POLICY "Invoices are viewable by everyone"
  ON invoices FOR SELECT
  TO PUBLIC
  USING (true);

CREATE POLICY "Invoices can be created by authenticated users"
  ON invoices FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- Create functions
CREATE OR REPLACE FUNCTION generate_invoice_number()
RETURNS text AS $$
DECLARE
  year text;
  sequence int;
  invoice_number text;
BEGIN
  year := to_char(current_date, 'YYYY');
  
  -- Get the next sequence number for this year
  SELECT COALESCE(MAX(CAST(SUBSTRING(invoice_number FROM 6) AS integer)), 0) + 1
  INTO sequence
  FROM invoices
  WHERE invoice_number LIKE year || '-%';
  
  invoice_number := year || '-' || LPAD(sequence::text, 6, '0');
  
  RETURN invoice_number;
END;
$$ LANGUAGE plpgsql;

-- Create function to close session
CREATE OR REPLACE FUNCTION close_pos_session(session_id uuid, closing_balance decimal)
RETURNS pos_sessions AS $$
DECLARE
  session_record pos_sessions;
BEGIN
  -- Check if session exists and is open
  SELECT * INTO session_record
  FROM pos_sessions
  WHERE id = session_id AND status = 'open'
  FOR UPDATE;
  
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Session not found or already closed';
  END IF;
  
  -- Update session
  UPDATE pos_sessions
  SET
    status = 'closed',
    closing_balance = close_pos_session.closing_balance,
    closed_at = now()
  WHERE id = session_id
  RETURNING * INTO session_record;
  
  RETURN session_record;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create indexes
CREATE INDEX idx_pos_sessions_cashier ON pos_sessions(cashier_id);
CREATE INDEX idx_pos_transactions_session ON pos_transactions(session_id);
CREATE INDEX idx_pos_transactions_order ON pos_transactions(order_id);
CREATE INDEX idx_invoices_order ON invoices(order_id);
CREATE INDEX idx_invoices_number ON invoices(invoice_number);