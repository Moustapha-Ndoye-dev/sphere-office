/*
  # Add Statistics and Analytics Functions
  
  1. New Functions
    - get_sales_stats: Returns sales statistics including revenue, orders, customers
    - get_customer_stats: Returns customer statistics and purchase history
  
  2. Changes
    - Added functions for analytics dashboard
    - Added functions for customer insights
*/

-- Drop existing functions if they exist
DROP FUNCTION IF EXISTS get_sales_stats();
DROP FUNCTION IF EXISTS get_customer_stats();

-- Function to get sales statistics
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

-- Function to get customer statistics
CREATE OR REPLACE FUNCTION get_customer_stats()
RETURNS json AS $$
DECLARE
  result json;
BEGIN
  WITH customer_orders AS (
    SELECT
      email,
      customer_name,
      phone,
      address,
      COUNT(*) as total_orders,
      SUM(total) as total_spent,
      MAX(created_at) as last_order_date
    FROM orders
    GROUP BY email, customer_name, phone, address
  )
  SELECT json_agg(customer_orders) INTO result
  FROM customer_orders
  ORDER BY total_spent DESC;
  
  RETURN result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;