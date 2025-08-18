
-- Fix notifications table to use creationdate instead of timestamp

-- First, check if timestamp column exists and creationdate doesn't
DO $$
BEGIN
    -- If timestamp column exists, rename it to creationdate
    IF EXISTS (SELECT 1 FROM information_schema.columns 
               WHERE table_name = 'notifications' AND column_name = 'timestamp') THEN
        -- If creationdate doesn't exist, rename timestamp to creationdate
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                       WHERE table_name = 'notifications' AND column_name = 'creationdate') THEN
            ALTER TABLE notifications RENAME COLUMN timestamp TO creationdate;
            RAISE NOTICE 'Renamed timestamp column to creationdate';
        ELSE
            -- If both exist, drop timestamp column
            ALTER TABLE notifications DROP COLUMN timestamp;
            RAISE NOTICE 'Dropped timestamp column as creationdate already exists';
        END IF;
    END IF;
    
    -- Ensure creationdate column exists with correct type
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'notifications' AND column_name = 'creationdate') THEN
        ALTER TABLE notifications ADD COLUMN creationdate timestamp with time zone DEFAULT now();
        RAISE NOTICE 'Added creationdate column';
    END IF;
END $$;

-- Update any NULL creationdate values
UPDATE notifications 
SET creationdate = now() 
WHERE creationdate IS NULL;
