
-- Drop and recreate notifications table with correct schema
DROP TABLE IF EXISTS public.notifications CASCADE;

CREATE TABLE public.notifications (
  id text NOT NULL,
  userid text,
  content text,
  read boolean DEFAULT false,
  linkeditemid text,
  linkeditemtype text,
  creationdate timestamp with time zone DEFAULT now(),
  type text,
  CONSTRAINT notifications_pkey PRIMARY KEY (id),
  CONSTRAINT notifications_userid_fkey FOREIGN KEY (userid) REFERENCES public.users(id)
);

-- Enable RLS
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;
