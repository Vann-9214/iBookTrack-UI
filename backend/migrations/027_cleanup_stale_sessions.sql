CREATE OR REPLACE FUNCTION cleanup_stale_sessions()
RETURNS void AS $$
BEGIN
    -- This function cleans up abandoned sessions safely.
    -- Instead of deleting the session directly, it deletes the parent BOX.
    -- Because 'box_sessions' has 'ON DELETE CASCADE', the session is automatically deleted.
    -- Because of our trigger on 'boxes', the lot count is automatically decremented.
    DELETE FROM boxes
    WHERE id IN (
        SELECT box_id 
        FROM box_sessions 
        WHERE status = 'in_progress' 
        AND started_at < NOW() - INTERVAL '3 hours'
    );
END;
$$ LANGUAGE plpgsql;
