/*
  # Mise à jour du calcul du chiffre d'affaires pour inclure les ventes en caisse
  
  1. Modifications
    - Modification de la fonction get_sales_stats pour inclure les ventes en caisse
    - Ajout des ventes en caisse dans tous les calculs (totaux, croissance, etc.)
*/

-- Recréer la fonction get_sales_stats avec le nouveau calcul
CREATE OR REPLACE FUNCTION get_sales_stats()
RETURNS jsonb AS $$
DECLARE
  result jsonb;
  total_revenue decimal;
  total_orders bigint;
  total_customers bigint;
  avg_order_value decimal;
BEGIN
  -- Calculer les totaux pour les commandes confirmées et les ventes en caisse
  WITH all_sales AS (
    -- Commandes en ligne confirmées
    SELECT
      o.id as order_id,
      o.email,
      o.created_at,
      COALESCE(SUM(oi.price * oi.quantity), 0) as total_amount
    FROM orders o
    JOIN order_items oi ON oi.order_id = o.id
    WHERE o.status IN ('confirmed', 'shipped', 'delivered')
    GROUP BY o.id, o.email, o.created_at
    
    UNION ALL
    
    -- Ventes en caisse
    SELECT
      o.id as order_id,
      o.email,
      o.created_at,
      COALESCE(SUM(oi.price * oi.quantity), 0) as total_amount
    FROM orders o
    JOIN order_items oi ON oi.order_id = o.id
    JOIN pos_transactions pt ON pt.order_id = o.id
    GROUP BY o.id, o.email, o.created_at
  )
  SELECT 
    COALESCE(SUM(total_amount), 0),
    COUNT(DISTINCT order_id),
    COUNT(DISTINCT email),
    CASE 
      WHEN COUNT(DISTINCT order_id) > 0 
      THEN COALESCE(SUM(total_amount) / COUNT(DISTINCT order_id), 0)
      ELSE 0
    END
  INTO total_revenue, total_orders, total_customers, avg_order_value
  FROM all_sales;

  -- Calculer les statistiques mensuelles
  WITH monthly_stats AS (
    SELECT
      date_trunc('month', s.created_at) as month,
      COUNT(DISTINCT s.order_id) as order_count,
      COALESCE(SUM(s.total_amount), 0) as revenue
    FROM (
      -- Commandes en ligne confirmées
      SELECT
        o.id as order_id,
        o.created_at,
        COALESCE(SUM(oi.price * oi.quantity), 0) as total_amount
      FROM orders o
      JOIN order_items oi ON oi.order_id = o.id
      WHERE o.status IN ('confirmed', 'shipped', 'delivered')
      GROUP BY o.id, o.created_at
      
      UNION ALL
      
      -- Ventes en caisse
      SELECT
        o.id as order_id,
        o.created_at,
        COALESCE(SUM(oi.price * oi.quantity), 0) as total_amount
      FROM orders o
      JOIN order_items oi ON oi.order_id = o.id
      JOIN pos_transactions pt ON pt.order_id = o.id
      GROUP BY o.id, o.created_at
    ) s
    WHERE s.created_at >= date_trunc('month', current_date - interval '1 year')
    GROUP BY month
  ),
  prev_month_stats AS (
    SELECT
      COUNT(DISTINCT s.order_id) as orders,
      COALESCE(SUM(s.total_amount), 0) as revenue,
      COUNT(DISTINCT s.email) as customers
    FROM (
      -- Commandes en ligne confirmées
      SELECT
        o.id as order_id,
        o.email,
        COALESCE(SUM(oi.price * oi.quantity), 0) as total_amount
      FROM orders o
      JOIN order_items oi ON oi.order_id = o.id
      WHERE o.status IN ('confirmed', 'shipped', 'delivered')
      AND o.created_at >= date_trunc('month', current_date - interval '1 month')
      AND o.created_at < date_trunc('month', current_date)
      GROUP BY o.id, o.email
      
      UNION ALL
      
      -- Ventes en caisse
      SELECT
        o.id as order_id,
        o.email,
        COALESCE(SUM(oi.price * oi.quantity), 0) as total_amount
      FROM orders o
      JOIN order_items oi ON oi.order_id = o.id
      JOIN pos_transactions pt ON pt.order_id = o.id
      WHERE o.created_at >= date_trunc('month', current_date - interval '1 month')
      AND o.created_at < date_trunc('month', current_date)
      GROUP BY o.id, o.email
    ) s
  ),
  current_month_stats AS (
    SELECT
      COUNT(DISTINCT s.order_id) as orders,
      COALESCE(SUM(s.total_amount), 0) as revenue,
      COUNT(DISTINCT s.email) as customers
    FROM (
      -- Commandes en ligne confirmées
      SELECT
        o.id as order_id,
        o.email,
        COALESCE(SUM(oi.price * oi.quantity), 0) as total_amount
      FROM orders o
      JOIN order_items oi ON oi.order_id = o.id
      WHERE o.status IN ('confirmed', 'shipped', 'delivered')
      AND o.created_at >= date_trunc('month', current_date)
      GROUP BY o.id, o.email
      
      UNION ALL
      
      -- Ventes en caisse
      SELECT
        o.id as order_id,
        o.email,
        COALESCE(SUM(oi.price * oi.quantity), 0) as total_amount
      FROM orders o
      JOIN order_items oi ON oi.order_id = o.id
      JOIN pos_transactions pt ON pt.order_id = o.id
      WHERE o.created_at >= date_trunc('month', current_date)
      GROUP BY o.id, o.email
    ) s
  ),
  top_products AS (
    SELECT
      p.name,
      COUNT(DISTINCT s.order_id) as total_sales,
      COALESCE(SUM(s.total_amount), 0) as revenue
    FROM (
      -- Commandes en ligne confirmées
      SELECT
        o.id as order_id,
        oi.product_id,
        COALESCE(SUM(oi.price * oi.quantity), 0) as total_amount
      FROM orders o
      JOIN order_items oi ON oi.order_id = o.id
      WHERE o.status IN ('confirmed', 'shipped', 'delivered')
      AND o.created_at >= date_trunc('month', current_date - interval '1 month')
      GROUP BY o.id, oi.product_id
      
      UNION ALL
      
      -- Ventes en caisse
      SELECT
        o.id as order_id,
        oi.product_id,
        COALESCE(SUM(oi.price * oi.quantity), 0) as total_amount
      FROM orders o
      JOIN order_items oi ON oi.order_id = o.id
      JOIN pos_transactions pt ON pt.order_id = o.id
      WHERE o.created_at >= date_trunc('month', current_date - interval '1 month')
      GROUP BY o.id, oi.product_id
    ) s
    JOIN products p ON p.id = s.product_id
    GROUP BY p.id, p.name
    ORDER BY revenue DESC
    LIMIT 5
  ),
  sales_by_category AS (
    SELECT
      c.name,
      COUNT(DISTINCT s.order_id) as total_sales,
      COALESCE(SUM(s.total_amount), 0) as revenue
    FROM (
      -- Commandes en ligne confirmées
      SELECT
        o.id as order_id,
        oi.product_id,
        COALESCE(SUM(oi.price * oi.quantity), 0) as total_amount
      FROM orders o
      JOIN order_items oi ON oi.order_id = o.id
      WHERE o.status IN ('confirmed', 'shipped', 'delivered')
      AND o.created_at >= date_trunc('month', current_date - interval '1 month')
      GROUP BY o.id, oi.product_id
      
      UNION ALL
      
      -- Ventes en caisse
      SELECT
        o.id as order_id,
        oi.product_id,
        COALESCE(SUM(oi.price * oi.quantity), 0) as total_amount
      FROM orders o
      JOIN order_items oi ON oi.order_id = o.id
      JOIN pos_transactions pt ON pt.order_id = o.id
      WHERE o.created_at >= date_trunc('month', current_date - interval '1 month')
      GROUP BY o.id, oi.product_id
    ) s
    JOIN products p ON p.id = s.product_id
    JOIN categories c ON c.id = p.category_id
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

-- Mettre à jour les index
CREATE INDEX IF NOT EXISTS idx_orders_status ON orders(status);
CREATE INDEX IF NOT EXISTS idx_orders_status_created_at ON orders(status, created_at);
CREATE INDEX IF NOT EXISTS idx_pos_transactions_order_id ON pos_transactions(order_id);

-- Accorder les permissions d'exécution
GRANT EXECUTE ON FUNCTION get_sales_stats() TO public;