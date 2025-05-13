-- Create function to get customer statistics
CREATE OR REPLACE FUNCTION get_customer_stats()
RETURNS jsonb AS $$
DECLARE
  result jsonb;
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
    ORDER BY total_spent DESC
  )
  SELECT jsonb_agg(row_to_json(customer_orders))
  INTO result
  FROM customer_orders;
  
  RETURN COALESCE(result, '[]'::jsonb);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permission to public
GRANT EXECUTE ON FUNCTION get_customer_stats() TO PUBLIC;