-- Drop existing function if it exists
DROP FUNCTION IF EXISTS get_sales_stats();

-- Create function to get sales statistics
CREATE OR REPLACE FUNCTION get_sales_stats()
RETURNS jsonb AS $$
DECLARE
  result jsonb;
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
      COALESCE(SUM(total), 0) as revenue,
      COUNT(DISTINCT email) as customers
    FROM orders
    WHERE created_at >= date_trunc('month', current_date - interval '1 month')
    AND created_at < date_trunc('month', current_date)
  ),
  current_month_stats AS (
    SELECT
      COUNT(*) as orders,
      COALESCE(SUM(total), 0) as revenue,
      COUNT(DISTINCT email) as customers
    FROM orders
    WHERE created_at >= date_trunc('month', current_date)
  ),
  top_products AS (
    SELECT
      p.name,
      COUNT(*) as total_sales,
      COALESCE(SUM(oi.price * oi.quantity), 0) as revenue
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
      COALESCE(SUM(oi.price * oi.quantity), 0) as revenue
    FROM order_items oi
    JOIN products p ON p.id = oi.product_id
    JOIN categories c ON c.id = p.category_id
    GROUP BY c.id, c.name
    ORDER BY revenue DESC
  )
  SELECT jsonb_build_object(
    'total_revenue', COALESCE((SELECT SUM(total) FROM orders), 0),
    'total_orders', COALESCE((SELECT COUNT(*) FROM orders), 0),
    'total_customers', COALESCE((SELECT COUNT(DISTINCT email) FROM orders), 0),
    'average_order_value', COALESCE(
      (SELECT CASE 
        WHEN COUNT(*) > 0 THEN SUM(total) / COUNT(*)
        ELSE 0
      END
      FROM orders),
      0
    ),
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

-- Grant execute permission to public
GRANT EXECUTE ON FUNCTION get_sales_stats() TO PUBLIC;