$sk = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRxc29kZ3dweGlrbHB5b2h3cWhnIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4MDk5MDgwOSwiZXhwIjoyMDk2NTY2ODA5fQ.WtmjYKWkIJtZJeK4qK0h_mbvHYw9HahMcuWzStj_w2A"
$h = @{ apikey = $sk; Authorization = "Bearer $sk"; "Content-Type" = "application/json" }

# Make hand column optional in athletes
$body1 = @{ query = "ALTER TABLE athletes ALTER COLUMN hand DROP NOT NULL; ALTER TABLE athletes DROP CONSTRAINT IF EXISTS athletes_hand_check; UPDATE athletes SET hand = '右手' WHERE hand IS NULL;" } | ConvertTo-Json
try { Invoke-RestMethod -Uri "https://api.supabase.com/v1/projects/dqsodgwpxiklpyohwqhg/sql" -Method Post -Headers @{ Authorization = "Bearer $env:SB_TOKEN" } -Body $body1 } catch {}

# Create announcements table
$body2 = @{ query = @"
CREATE TABLE IF NOT EXISTS announcements (id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY, title TEXT NOT NULL, content TEXT, created_by UUID REFERENCES auth.users(id), created_at TIMESTAMPTZ DEFAULT NOW());
ALTER TABLE announcements ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Anyone can read announcements" ON announcements;
CREATE POLICY "Anyone can read announcements" ON announcements FOR SELECT USING (true);
DROP POLICY IF EXISTS "Admins can manage announcements" ON announcements;
CREATE POLICY "Admins can manage announcements" ON announcements FOR INSERT WITH CHECK (EXISTS (SELECT 1 FROM admin_users WHERE user_id = auth.uid()));
CREATE POLICY "Admins can update announcements" ON announcements FOR UPDATE USING (EXISTS (SELECT 1 FROM admin_users WHERE user_id = auth.uid()));
CREATE POLICY "Admins can delete announcements" ON announcements FOR DELETE USING (EXISTS (SELECT 1 FROM admin_users WHERE user_id = auth.uid()));
"@ } | ConvertTo-Json
try { Invoke-RestMethod -Uri "https://api.supabase.com/v1/projects/dqsodgwpxiklpyohwqhg/sql" -Method Post -Headers @{ Authorization = "Bearer $env:SB_TOKEN" } -Body $body2 } catch {}

Write-Output "Done"
