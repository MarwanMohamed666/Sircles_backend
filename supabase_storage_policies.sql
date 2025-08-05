-- WARNING: This schema is for context only and is not meant to be run.
-- Table order and constraints may not be valid for execution.

CREATE TABLE public.circle_admins (
  circleid text NOT NULL,
  userid text NOT NULL,
  CONSTRAINT circle_admins_pkey PRIMARY KEY (circleid, userid),
  CONSTRAINT circle_admins_circleid_fkey FOREIGN KEY (circleid) REFERENCES public.circles(id),
  CONSTRAINT circle_admins_userid_fkey FOREIGN KEY (userid) REFERENCES public.users(id)
);
CREATE TABLE public.circle_interests (
  circleid text NOT NULL,
  interestid text NOT NULL,
  CONSTRAINT circle_interests_pkey PRIMARY KEY (circleid, interestid),
  CONSTRAINT circle_interests_interestid_fkey FOREIGN KEY (interestid) REFERENCES public.interests(id),
  CONSTRAINT circle_interests_circleid_fkey FOREIGN KEY (circleid) REFERENCES public.circles(id)
);
CREATE TABLE public.circle_messages (
  id text NOT NULL,
  circleid text,
  senderid text,
  content text,
  type text,
  attachment text,
  timestamp timestamp without time zone,
  creationdate timestamp with time zone,
  CONSTRAINT circle_messages_pkey PRIMARY KEY (id),
  CONSTRAINT circle_messages_senderid_fkey FOREIGN KEY (senderid) REFERENCES public.users(id),
  CONSTRAINT circle_messages_circleid_fkey FOREIGN KEY (circleid) REFERENCES public.circles(id)
);
CREATE TABLE public.circles (
  id text NOT NULL,
  name text,
  description text,
  privacy text,
  creationdate timestamp with time zone,
  circle_profile_url text,
  creator text NOT NULL DEFAULT '00b6a31f-81b1-43fe-a365-9cb61d231fb5'::text,
  CONSTRAINT circles_pkey PRIMARY KEY (id),
  CONSTRAINT circles_creator_fkey FOREIGN KEY (creator) REFERENCES public.users(id)
);
CREATE TABLE public.comments (
  id text NOT NULL,
  postid text,
  userid text,
  text text,
  timestamp timestamp without time zone,
  creationdate timestamp with time zone,
  CONSTRAINT comments_pkey PRIMARY KEY (id),
  CONSTRAINT comments_userid_fkey FOREIGN KEY (userid) REFERENCES public.users(id),
  CONSTRAINT comments_postid_fkey FOREIGN KEY (postid) REFERENCES public.posts(id)
);
CREATE TABLE public.event_interests (
  eventid text NOT NULL,
  interestid text NOT NULL,
  CONSTRAINT event_interests_pkey PRIMARY KEY (eventid, interestid),
  CONSTRAINT event_interests_eventid_fkey FOREIGN KEY (eventid) REFERENCES public.events(id),
  CONSTRAINT event_interests_interestid_fkey FOREIGN KEY (interestid) REFERENCES public.interests(id)
);
CREATE TABLE public.events (
  id text NOT NULL,
  title text,
  date timestamp without time zone,
  time text,
  location text,
  circleid text,
  visibility text,
  description text,
  createdby text,
  creationdate timestamp with time zone,
  CONSTRAINT events_pkey PRIMARY KEY (id),
  CONSTRAINT events_createdby_fkey FOREIGN KEY (createdby) REFERENCES public.users(id),
  CONSTRAINT events_circleid_fkey FOREIGN KEY (circleid) REFERENCES public.circles(id)
);
CREATE TABLE public.interests (
  id text NOT NULL,
  title text,
  category text,
  creationdate timestamp with time zone,
  CONSTRAINT interests_pkey PRIMARY KEY (id)
);
CREATE TABLE public.notifications (
  id text NOT NULL,
  userid text,
  type text,
  content text,
  read boolean,
  timestamp timestamp without time zone,
  linkeditemid text,
  linkeditemtype text,
  creationdate timestamp with time zone,
  CONSTRAINT notifications_pkey PRIMARY KEY (id),
  CONSTRAINT notifications_userid_fkey FOREIGN KEY (userid) REFERENCES public.users(id)
);
CREATE TABLE public.post_likes (
  postid text NOT NULL,
  userid text NOT NULL,
  CONSTRAINT post_likes_pkey PRIMARY KEY (postid, userid),
  CONSTRAINT post_likes_postid_fkey FOREIGN KEY (postid) REFERENCES public.posts(id),
  CONSTRAINT post_likes_userid_fkey FOREIGN KEY (userid) REFERENCES public.users(id)
);
CREATE TABLE public.posts (
  id text NOT NULL,
  userid text,
  content text,
  image text,
  circleid text,
  createdat timestamp without time zone,
  creationdate timestamp with time zone,
  CONSTRAINT posts_pkey PRIMARY KEY (id),
  CONSTRAINT posts_circleid_fkey FOREIGN KEY (circleid) REFERENCES public.circles(id),
  CONSTRAINT posts_userid_fkey FOREIGN KEY (userid) REFERENCES public.users(id)
);
CREATE TABLE public.reports (
  id text NOT NULL,
  userid text,
  type text,
  targetid text,
  message text,
  status text,
  adminresponse text,
  timestamp timestamp without time zone,
  creationdate timestamp with time zone,
  CONSTRAINT reports_pkey PRIMARY KEY (id),
  CONSTRAINT reports_userid_fkey FOREIGN KEY (userid) REFERENCES public.users(id)
);
CREATE TABLE public.user_circles (
  userid text NOT NULL,
  circleid text NOT NULL,
  CONSTRAINT user_circles_pkey PRIMARY KEY (userid, circleid),
  CONSTRAINT user_circles_userid_fkey FOREIGN KEY (userid) REFERENCES public.users(id),
  CONSTRAINT user_circles_circleid_fkey FOREIGN KEY (circleid) REFERENCES public.circles(id)
);
CREATE TABLE public.user_interests (
  userid text NOT NULL,
  interestid text NOT NULL,
  CONSTRAINT user_interests_pkey PRIMARY KEY (userid, interestid),
  CONSTRAINT user_interests_userid_fkey FOREIGN KEY (userid) REFERENCES public.users(id),
  CONSTRAINT user_interests_interestid_fkey FOREIGN KEY (interestid) REFERENCES public.interests(id)
);
CREATE TABLE public.users (
  id text NOT NULL,
  name text,
  email text,
  dob timestamp without time zone,
  gender text,
  language text,
  avatar_url text,
  phone text,
  address_apartment text,
  address_building text,
  address_block text,
  role text,
  creationdate timestamp with time zone,
  auth_id uuid UNIQUE,
  CONSTRAINT users_pkey PRIMARY KEY (id)
);

-- RLS Policy for creating circles
alter policy "Authenticated users can create circles"
on "public"."circles"
to authenticated
with check (
  creator IN (SELECT id FROM users WHERE auth_id = auth.uid())
);