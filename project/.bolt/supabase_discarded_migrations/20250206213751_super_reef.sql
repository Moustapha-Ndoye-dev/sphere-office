-- Create notifications table
CREATE TABLE notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  type text NOT NULL,
  title text NOT NULL,
  content text NOT NULL,
  recipient_email text NOT NULL,
  is_read boolean DEFAULT false,
  metadata jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for notifications
CREATE POLICY "Users can view their own notifications"
  ON notifications FOR SELECT
  TO PUBLIC
  USING (recipient_email = current_user OR current_user IS NULL);

-- Create function to get sales statistics
CREATE OR REPLACE FUNCTION get_sales_stats()
RETURNS json AS $$
DECLARE
  result json;
BEGIN
  WITH monthly_stats AS (
    SELECT
      date_trunc('month', created_at) as month,
      COUNT(*) as order_count,
      SUM(total) as revenue
    FROM orders
    WHERE created_at >= date_trunc('month', current_date - interval '1 year')
    GROUP BY month
  ),
  prev_month_stats AS (
    SELECT
      COUNT(*) as orders,
      SUM(total) as revenue,
      COUNT(DISTINCT email) as customers
    FROM orders
    WHERE created_at >= date_trunc('month', current_date - interval '1 month')
    AND created_at < date_trunc('month', current_date)
  ),
  current_month_stats AS (
    SELECT
      COUNT(*) as orders,
      SUM(total) as revenue,
      COUNT(DISTINCT email) as customers
    FROM orders
    WHERE created_at >= date_trunc('month', current_date)
  ),
  top_products AS (
    SELECT
      p.name,
      COUNT(*) as total_sales,
      SUM(oi.price * oi.quantity) as revenue
    FROM order_items oi
    JOIN products p ON p.id = oi.product_id
    GROUP BY p.id, p.name
    ORDER BY revenue DESC
    LIMIT 5
  ),
  sales_by_category AS (
    SELECT
      c.name,
      COUNT(*) as total_sales,
      SUM(oi.price * oi.quantity) as revenue
    FROM order_items oi
    JOIN products p ON p.id = oi.product_id
    JOIN categories c ON c.id = p.category_id
    GROUP BY c.id, c.name
    ORDER BY revenue DESC
  )
  SELECT json_build_object(
    'total_revenue', COALESCE((SELECT SUM(total) FROM orders), 0),
    'total_orders', COALESCE((SELECT COUNT(*) FROM orders), 0),
    'total_customers', COALESCE((SELECT COUNT(DISTINCT email) FROM orders), 0),
    'average_order_value', COALESCE((SELECT AVG(total) FROM orders), 0),
    'revenue_growth', CASE
      WHEN (SELECT revenue FROM prev_month_stats) > 0
      THEN round(((SELECT revenue FROM current_month_stats) - (SELECT revenue FROM prev_month_stats)) / (SELECT revenue FROM prev_month_stats) * 100)
      ELSE 0
    END,
    'orders_growth', CASE
      WHEN (SELECT orders FROM prev_month_stats) > 0
      THEN round(((SELECT orders FROM current_month_stats) - (SELECT orders FROM prev_month_stats)) / (SELECT orders FROM prev_month_stats) * 100)
      ELSE 0
    END,
    'customers_growth', CASE
      WHEN (SELECT customers FROM prev_month_stats) > 0
      THEN round(((SELECT customers FROM current_month_stats) - (SELECT customers FROM prev_month_stats)) / (SELECT customers FROM prev_month_stats) * 100)
      ELSE 0
    END,
    'top_products', (SELECT json_agg(top_products) FROM top_products),
    'sales_by_category', (SELECT json_agg(sales_by_category) FROM sales_by_category)
  ) INTO result;
  
  RETURN result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;