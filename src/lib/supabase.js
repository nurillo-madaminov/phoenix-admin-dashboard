import { createClient } from "@supabase/supabase-js";

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_KEY

const DEBUG = import.meta.env.VITE_DEBUG_REALTIME === 'true'

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  realtime: {
    worker: true,
    heartbeatCallback: (status) => {
      if (DEBUG) {
        console.log(`[Realtime] Heartbeat status: ${status}`)
      }
      if (status === 'disconnected') {
        if (DEBUG) {
          console.log('[Realtime] Connection lost, attempting to reconnect...')
        }
        supabase.realtime.connect()
      }
    },
  },
})

