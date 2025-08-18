
-- Comprehensive fix for notifications table schema issues

DO $$
DECLARE
    has_timestamp boolean := false;
    has_creationdate boolean := false;
BEGIN
    -- Check which columns exist
    SELECT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'notifications' AND column_name = 'timestamp'
    ) INTO has_timestamp;
    
    SELECT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'notifications' AND column_name = 'creationdate'
    ) INTO has_creationdate;
    
    RAISE NOTICE 'Has timestamp: %, Has creationdate: %', has_timestamp, has_creationdate;
    
    -- If both exist, migrate data from timestamp to creationdate and drop timestamp
    IF has_timestamp AND has_creationdate THEN
        -- Update any rows where creationdate is null but timestamp has data
        UPDATE notifications 
        SET creationdate = timestamp 
        WHERE creationdate IS NULL AND timestamp IS NOT NULL;
        
        -- Drop the timestamp column
        ALTER TABLE notifications DROP COLUMN timestamp;
        RAISE NOTICE 'Migrated data from timestamp to creationdate and dropped timestamp column';
        
    -- If only timestamp exists, rename it to creationdate
    ELSIF has_timestamp AND NOT has_creationdate THEN
        ALTER TABLE notifications RENAME COLUMN timestamp TO creationdate;
        RAISE NOTICE 'Renamed timestamp column to creationdate';
        
    -- If neither exists, add creationdate
    ELSIF NOT has_timestamp AND NOT has_creationdate THEN
        ALTER TABLE notifications ADD COLUMN creationdate timestamp with time zone DEFAULT now();
        RAISE NOTICE 'Added creationdate column';
    END IF;
    
    -- Ensure creationdate has proper type and default
    ALTER TABLE notifications ALTER COLUMN creationdate SET DEFAULT now();
    
    -- Update any null creationdate values
    UPDATE notifications 
    SET creationdate = now() 
    WHERE creationdate IS NULL;
    
    RAISE NOTICE 'Notifications table schema fix completed';
END $$;
