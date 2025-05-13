-- Create payment_transactions table
CREATE TABLE payment_transactions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  reference text UNIQUE NOT NULL,
  amount decimal NOT NULL CHECK (amount > 0),
  payment_method text NOT NULL,
  customer_phone text NOT NULL,
  merchant_phone text NOT NULL,
  status text NOT NULL DEFAULT 'pending',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE payment_transactions ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
CREATE POLICY "Anyone can create payment transactions"
  ON payment_transactions FOR INSERT
  TO public
  WITH CHECK (true);

CREATE POLICY "Anyone can view their own transactions"
  ON payment_transactions FOR SELECT
  TO public
  USING (true);

-- Create indexes
CREATE INDEX idx_payment_transactions_reference ON payment_transactions(reference);
CREATE INDEX idx_payment_transactions_status ON payment_transactions(status);