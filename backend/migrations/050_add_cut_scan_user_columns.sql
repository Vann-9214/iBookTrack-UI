ALTER TABLE box_sessions ADD COLUMN cut_user_received uuid REFERENCES profiles(id) ON DELETE SET NULL;
ALTER TABLE box_sessions ADD COLUMN cut_time_received timestamp with time zone;
ALTER TABLE box_sessions ADD COLUMN cut_user_send uuid REFERENCES profiles(id) ON DELETE SET NULL;
ALTER TABLE box_sessions ADD COLUMN cut_time_send timestamp with time zone;
ALTER TABLE box_sessions ADD COLUMN scan_user_received uuid REFERENCES profiles(id) ON DELETE SET NULL;
ALTER TABLE box_sessions ADD COLUMN scan_time_received timestamp with time zone;
