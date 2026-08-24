import { createClient } from '@supabase/supabase-js'

const supabaseUrl = 'https://qqcjmriiabvfewsdjhnl.supabase.co'
const supabasePublishableKey = 'sb_publishable_OtruEOAUB5Xq8NI3F3_h4Q_j70ewcI1'

export const supabase = createClient(
  supabaseUrl,
  supabasePublishableKey
)