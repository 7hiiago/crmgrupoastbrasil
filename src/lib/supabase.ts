import { createClient } from '@supabase/supabase-js'

const supabaseUrl = 'https://bptlbzcofdzavozoelrl.supabase.co'
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJwdGxiemNvZmR6YXZvem9lbHJsIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzUyNzE2MTksImV4cCI6MjA5MDg0NzYxOX0.ClfB-Fa5iq27S8JEWehzO-HGBSz2t7b0QuXscUpshM0'

export const supabase = createClient(supabaseUrl, supabaseKey)
