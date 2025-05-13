-- Create enums
CREATE TYPE discount_type AS ENUM ('percentage', 'fixed', 'manual');
CREATE TYPE cash_adjustment_type AS ENUM ('add', 'remove');

-- Create tables
CREATE TABLE pos_discounts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id uuid REFERENCES pos_sessions(id) ON DELETE CASCADE,
  order_id uuid REFERENCES orders(id) ON DELETE CASCADE,
  type discount_type NOT NULL,
  value decimal NOT NULL CHECK (value >= 0),
  reason text,
  created_at timestamptz DEFAULT now()
);

CREATE TABLE cash_adjustments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id uuid REFERENCES pos_sessions(id) ON DELETE CASCADE,
  type cash_adjustment_type NOT NULL,
  amount decimal NOT NULL CHECK (amount >= 0),
  reason text NOT NULL,
  created_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE pos_discounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE cash_adjustments ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
CREATE POLICY "Discounts are viewable by session cashier and admins"
  ON pos_discounts FOR SELECT
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

CREATE POLICY "Discounts can be created by session cashier"
  ON pos_discounts FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM pos_sessions
      WHERE pos_sessions.id = session_id
      AND pos_sessions.cashier_id = auth.uid()
      AND pos_sessions.status = 'open'
    )
  );

CREATE POLICY "Cash adjustments are viewable by admins only"
  ON cash_adjustments FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM auth.users
      WHERE auth.users.id = auth.uid()
      AND auth.users.email IN ('youneshachami9@gmail.com', 'ibrahimadiawo582@gmail.com')
    )
  );

CREATE POLICY "Cash adjustments can be created by admins only"
  ON cash_adjustments FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM auth.users
      WHERE auth.users.id = auth.uid()
      AND auth.users.email IN ('youneshachami9@gmail.com', 'ibrahimadiawo582@gmail.com')
    )
  );

-- Create functions
CREATE OR REPLACE FUNCTION calculate_session_balance(session_id uuid)
RETURNS decimal AS $$
DECLARE
  opening_balance decimal;
  transactions_total decimal;
  adjustments_total decimal;
BEGIN
  -- Get opening balance
  SELECT pos_sessions.opening_balance INTO opening_balance
  FROM pos_sessions
  WHERE pos_sessions.id = session_id;

  -- Calculate transactions total
  SELECT COALESCE(SUM(amount), 0) INTO transactions_total
  FROM pos_transactions
  WHERE pos_transactions.session_id = session_id;

  -- Calculate adjustments total
  SELECT COALESCE(SUM(
    CASE
      WHEN type = 'add' THEN amount
      WHEN type = 'remove' THEN -amount
    END
  ), 0) INTO adjustments_total
  FROM cash_adjustments
  WHERE cash_adjustments.session_id = session_id;

  -- Return current balance
  RETURN opening_balance + transactions_total + adjustments_total;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create indexes
CREATE INDEX idx_pos_discounts_session ON pos_discounts(session_id);
CREATE INDEX idx_pos_discounts_order ON pos_discounts(order_id);
CREATE INDEX idx_cash_adjustments_session ON cash_adjustments(session_id);