import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing Supabase environment variables')
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey)

// Types for our data structures
export interface Campaign {
  id: string
  user_id: string
  name: string
  type: 'email' | 'sms' | 'push'
  status: 'draft' | 'active' | 'paused' | 'completed'
  subject?: string
  content: string
  target_segment?: string
  scheduled_at?: string
  sent_count?: number
  open_rate?: number
  click_rate?: number
  revenue?: number
  created_at: string
  updated_at: string
}

export interface Segment {
  id: string
  user_id: string
  name: string
  description: string
  type: 'behavioral' | 'predictive'
  criteria: Record<string, any>
  customer_count: number
  growth_rate?: number
  created_at: string
  updated_at: string
}

export interface AnalyticsData {
  id: string
  metric_name: string
  metric_value: number
  period: string
  date: string
  metadata?: Record<string, any>
}

export interface ChatMessage {
  id: string
  content: string
  role: 'user' | 'assistant'
  timestamp: string
  suggestions?: string[]
}