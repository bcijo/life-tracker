-- Create a secure read-only SELECT query executor function
-- This function runs with SECURITY INVOKER which respects standard Row-Level Security policies.
-- It blocks destructive actions using a strict regex check.

CREATE OR REPLACE FUNCTION execute_read_only_query(query_text text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY INVOKER
AS $$
DECLARE
    result jsonb;
    lower_query text;
BEGIN
    lower_query := lower(query_text);
    
    -- Safety validation check: Only allow SELECT queries, block modifying/administrative DDL or DML
    IF lower_query ~ '\y(insert|update|delete|drop|alter|create|truncate|grant|revoke|replace|merge|upsert|call)\y' THEN
        RAISE EXCEPTION 'Access Denied: Only read-only SELECT statements are allowed.';
    END IF;
    
    -- Execute query safely and parse as jsonb array
    EXECUTE 'SELECT json_agg(t) FROM (' || query_text || ') t' INTO result;
    RETURN coalesce(result, '[]'::jsonb);
END;
$$;
