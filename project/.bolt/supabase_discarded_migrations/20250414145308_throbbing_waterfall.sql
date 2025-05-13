-- Drop the existing function first
DROP FUNCTION IF EXISTS get_sales_stats();

-- Create improved function with fixed calculations
CREATE OR REPLACE FUNCTION get_sales_stats()
RETURNS jsonb AS $$
DECLARE
  result jsonb;
  total_revenue decimal;
  total_orders bigint;
  total_customers bigint;
  avg_order_value decimal;
BEGIN
  -- Calculate overall totals from order_items for more accurate revenue
  SELECT 
    COALESCE(SUM(oi.price * oi.quantity), 0),
    COUNT(DISTINCT oi.order_id),
    COUNT(DISTINCT o.email),
    CASE 
      WHEN COUNT(DISTINCT oi.order_id) > 0 
      THEN COALESCE(SUM(oi.price * oi.quantity) / COUNT(DISTINCT oi.order_id), 0)
      ELSE 0
    END
  INTO total_revenue, total_orders, total_customers, avg_order_value
  FROM order_items oi
  JOIN orders o ON o.id = oi.order_id;

  -- Calculate monthly stats using order_items for revenue
  WITH monthly_stats AS (
    SELECT
      date_trunc('month', o.created_at) as month,
      COUNT(DISTINCT o.id) as order_count,
      COALESCE(SUM(oi.price * oi.quantity), 0) as revenue
    FROM orders o
    JOIN order_items oi ON oi.order_id = o.id
    WHERE o.created_at >= date_trunc('month', current_date - interval '1 year')
    GROUP BY month
  ),
  prev_month_stats AS (
    SELECT
      COUNT(DISTINCT o.id) as orders,
      COALESCE(SUM(oi.price * oi.quantity), 0) as revenue,
      COUNT(DISTINCT o.email) as customers
    FROM orders o
    JOIN order_items oi ON oi.order_id = o.id
    WHERE o.created_at >= date_trunc('month', current_date - interval '1 month')
    AND o.created_at < date_trunc('month', current_date)
  ),
  current_month_stats AS (
    SELECT
      COUNT(DISTINCT o.id) as orders,
      COALESCE(SUM(oi.price * oi.quantity), 0) as revenue,
      COUNT(DISTINCT o.email) as customers
    FROM orders o
    JOIN order_items oi ON oi.order_id = o.id
    WHERE o.created_at >= date_trunc('month', current_date)
  ),
  top_products AS (
    SELECT
      p.name,
      COUNT(DISTINCT oi.order_id) as total_sales,
      COALESCE(SUM(oi.price * oi.quantity), 0) as revenue
    FROM order_items oi
    JOIN products p ON p.id = oi.product_id
    JOIN orders o ON o.id = oi.order_id
    WHERE o.created_at >= date_trunc('month', current_date - interval '1 month')
    GROUP BY p.id, p.name
    ORDER BY revenue DESC
    LIMIT 5
  ),
  sales_by_category AS (
    SELECT
      c.name,
      COUNT(DISTINCT oi.order_id) as total_sales,
      COALESCE(SUM(oi.price * oi.quantity), 0) as revenue
    FROM order_items oi
    JOIN products p ON p.id = oi.product_id
    JOIN categories c ON c.id = p.category_id
    JOIN orders o ON o.id = oi.order_id
    WHERE o.created_at >= date_trunc('month', current_date - interval '1 month')
    GROUP BY c.id, c.name
    ORDER BY revenue DESC
  )
  SELECT jsonb_build_object(
    'total_revenue', total_revenue,
    'total_orders', total_orders,
    'total_customers', total_customers,
    'average_order_value', avg_order_value,
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
    'top_products', COALESCE((SELECT jsonb_agg(row_to_json(top_products)) FROM top_products), '[]'),
    'sales_by_category', COALESCE((SELECT jsonb_agg(row_to_json(sales_by_category)) FROM sales_by_category), '[]')
  ) INTO result;
  
  RETURN result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Ensure all necessary indexes exist
CREATE INDEX IF NOT EXISTS idx_orders_created_at ON orders(created_at);
CREATE INDEX IF NOT EXISTS idx_order_items_created_at ON order_items(created_at);
CREATE INDEX IF NOT EXISTS idx_orders_email ON orders(email);
CREATE INDEX IF NOT EXISTS idx_order_items_order_id ON order_items(order_id);
CREATE INDEX IF NOT EXISTS idx_order_items_product_id ON order_items(product_id);

-- Grant execute permission
GRANT EXECUTE ON FUNCTION get_sales_stats() TO public;