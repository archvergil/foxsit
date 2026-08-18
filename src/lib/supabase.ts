import { createClient } from '@supabase/supabase-js'

import { supabaseEnvironment } from '@/config/env'
import type { Database } from '@/types/database.generated'

export const supabase = supabaseEnvironment.configured
  ? createClient<Database>(
      supabaseEnvironment.url,
      supabaseEnvironment.publishableKey,
      {
        auth: {
          persistSession: true,
          autoRefreshToken: true,
          detectSessionInUrl: true,
        },
      },
    )
  : null
