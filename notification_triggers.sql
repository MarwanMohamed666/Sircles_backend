
-- Database functions and triggers for automatic notification creation

-- Function to create join request notifications
CREATE OR REPLACE FUNCTION create_join_request_notification()
RETURNS TRIGGER AS $$
BEGIN
  -- Create notifications for circle creator
  INSERT INTO notifications (id, userid, type, content, linkeditemtype, linkeditemid, read, creationdate)
  SELECT 
    gen_random_uuid()::text,
    circles.creator,
    'join',
    'New join request for ' || circles.name,
    'circle',
    NEW.circleid,
    false,
    now()
  FROM circles
  WHERE circles.id = NEW.circleid;

  -- Create notifications for circle admins
  INSERT INTO notifications (id, userid, type, content, linkeditemtype, linkeditemid, read, creationdate)
  SELECT 
    gen_random_uuid()::text,
    ca.userid,
    'join',
    'New join request for ' || c.name,
    'circle',
    NEW.circleid,
    false,
    now()
  FROM circle_admins ca
  JOIN circles c ON c.id = ca.circleid
  WHERE ca.circleid = NEW.circleid;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Function to create accept join notifications
CREATE OR REPLACE FUNCTION create_accept_join_notification()
RETURNS TRIGGER AS $$
BEGIN
  -- Only trigger when status changes to 'accepted'
  IF NEW.status = 'accepted' AND OLD.status != 'accepted' THEN
    INSERT INTO notifications (id, userid, type, content, linkeditemtype, linkeditemid, read, creationdate)
    SELECT 
      gen_random_uuid()::text,
      NEW.userid,
      'accept_join',
      'Your join request for ' || circles.name || ' was accepted',
      'circle',
      NEW.circleid,
      false,
      now()
    FROM circles
    WHERE circles.id = NEW.circleid;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Function to create comment notifications
CREATE OR REPLACE FUNCTION create_comment_notification()
RETURNS TRIGGER AS $$
BEGIN
  -- Don't notify if commenting on own post
  IF NEW.userid != (SELECT userid FROM posts WHERE id = NEW.postid) THEN
    INSERT INTO notifications (id, userid, type, content, linkeditemtype, linkeditemid, read, creationdate)
    SELECT 
      gen_random_uuid()::text,
      posts.userid,
      'comment',
      'New comment on your post',
      'post',
      NEW.postid,
      false,
      now()
    FROM posts
    WHERE posts.id = NEW.postid;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Function to create new event notifications
CREATE OR REPLACE FUNCTION create_new_event_notification()
RETURNS TRIGGER AS $$
BEGIN
  -- Only for circle events, not general events
  IF NEW.circleid IS NOT NULL THEN
    INSERT INTO notifications (id, userid, type, content, linkeditemtype, linkeditemid, read, creationdate)
    SELECT 
      gen_random_uuid()::text,
      uc.userid,
      'new_event',
      'New event: ' || NEW.title || ' in ' || c.name,
      'event',
      NEW.id,
      false,
      now()
    FROM user_circles uc
    JOIN circles c ON c.id = uc.circleid
    WHERE uc.circleid = NEW.circleid
    AND uc.userid != NEW.createdby; -- Don't notify the event creator
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create triggers
DROP TRIGGER IF EXISTS trigger_join_request_notification ON circle_join_requests;
CREATE TRIGGER trigger_join_request_notification
  AFTER INSERT ON circle_join_requests
  FOR EACH ROW
  EXECUTE FUNCTION create_join_request_notification();

DROP TRIGGER IF EXISTS trigger_accept_join_notification ON circle_join_requests;
CREATE TRIGGER trigger_accept_join_notification
  AFTER UPDATE ON circle_join_requests
  FOR EACH ROW
  EXECUTE FUNCTION create_accept_join_notification();

DROP TRIGGER IF EXISTS trigger_comment_notification ON comments;
CREATE TRIGGER trigger_comment_notification
  AFTER INSERT ON comments
  FOR EACH ROW
  EXECUTE FUNCTION create_comment_notification();

DROP TRIGGER IF EXISTS trigger_new_event_notification ON events;
CREATE TRIGGER trigger_new_event_notification
  AFTER INSERT ON events
  FOR EACH ROW
  EXECUTE FUNCTION create_new_event_notification();
