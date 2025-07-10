import { supabase } from './supabase'
import type { Campaign, Segment, AnalyticsData } from './supabase'

// For development, we'll use direct Supabase calls instead of edge functions
// This ensures the app works while edge functions are being set up

// AI Chat API - Mock implementation for now
export const chatAPI = {
  async sendMessage(
    message: string, 
    userId: string,
    context?: {
      campaigns?: Campaign[]
      segments?: Segment[]
      analytics?: AnalyticsData[]
    },
    previousMessages?: Array<{ role: string; content: string }>
  ): Promise<{ response: string; suggestions?: string[] }> {
    try {
      // Call the Supabase Edge Function for AI chat
      const apiUrl = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/ai-chat`
      
      const response = await fetch(apiUrl, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          message,
          userId,
          context,
          previousMessages
        })
      })

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }

      const data = await response.json()
      return data
    } catch (error) {
      console.error('Failed to send message to AI:', error)
      
      // Fallback to mock response if edge function fails
      const fallbackResponses = [
        "I'm having some connectivity issues right now, but I'm here to help with your marketing strategy. What would you like to focus on?",
        "I'm experiencing technical difficulties, but I can still assist you. Could you tell me more about your marketing goals?",
        "My AI services are temporarily unavailable, but I can provide general marketing guidance. What's your main challenge?"
      ]
      
      return {
        response: fallbackResponses[Math.floor(Math.random() * fallbackResponses.length)],
        suggestions: [
          "Show me campaign performance",
          "Analyze customer segments", 
          "Help with email optimization",
          "Review marketing metrics"
        ]
      }
    }
  }
}

// Campaigns API - Direct Supabase calls
export const campaignsAPI = {
  async getAll(): Promise<Campaign[]> {
    try {
      const { data, error } = await supabase
        .from('campaigns')
        .select('*')
        .order('created_at', { ascending: false })
      
      if (error) {
        console.error('Supabase error:', error)
        throw new Error(`Failed to fetch campaigns: ${error.message}`)
      }
      
      return data || []
    } catch (error) {
      console.error('Error fetching campaigns:', error)
      // Return empty array instead of throwing to prevent app crash
      return []
    }
  },

  async create(campaign: Omit<Campaign, 'id' | 'created_at' | 'updated_at'>): Promise<Campaign> {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user || !user.id || user.id.trim() === '') {
      throw new Error('User not authenticated or invalid user ID')
    }

    try {
      const response = await supabase.functions.invoke('campaigns', {
        body: {
          method: 'POST',
          ...campaign,
          user_id: user.id
        }
      })

      if (response.error) {
        console.error('Edge function error:', response.error)
        throw new Error(`Failed to create campaign: ${response.error.message}`)
      }

      return response.data
    } catch (error) {
      console.error('Failed to create campaign via edge function:', error)
      
      // Fallback to direct database insert if edge function fails
      const { data, error: dbError } = await supabase
        .from('campaigns')
        .insert([{
          ...campaign,
          user_id: user.id
        }])
        .select()
        .single()
      
      if (dbError) {
        throw new Error(`Failed to create campaign: ${dbError.message}`)
      }
      
      return data
    }
  },

  async update(id: string, updates: Partial<Campaign>): Promise<Campaign> {
    try {
      console.log('Updating campaign via edge function:', { id, updates })
      
      // Use edge function to trigger email sending when status changes to active
      const response = await supabase.functions.invoke('campaigns', {
        body: {
          method: 'PUT',
          id,
          ...updates
        }
      })

      if (response.error) {
        console.error('Edge function error:', response.error)
        throw new Error(`Failed to update campaign: ${response.error.message}`)
      }

      console.log('Campaign update response:', response.data)
      return response.data
    } catch (error) {
      console.error('Failed to update campaign:', error)
      
      // Fallback to direct database update if edge function fails
      const { data, error: dbError } = await supabase
        .from('campaigns')
        .update(updates)
        .eq('id', id)
        .select()
        .single()
      
      if (dbError) {
        throw new Error(`Failed to update campaign: ${dbError.message}`)
      }
      
      return data
    }
  },

  async delete(id: string): Promise<void> {
    const { error } = await supabase
      .from('campaigns')
      .delete()
      .eq('id', id)
    
    if (error) {
      console.error('Supabase error:', error)
      throw new Error(`Failed to delete campaign: ${error.message}`)
    }
  }
}

// Segments API - Direct Supabase calls
export const segmentsAPI = {
  async getAll(): Promise<Segment[]> {
    try {
      const { data, error } = await supabase
        .from('segments')
        .select('*')
        .order('created_at', { ascending: false })
      
      if (error) {
        console.error('Supabase error:', error)
        throw new Error(`Failed to fetch segments: ${error.message}`)
      }
      
      return data || []
    } catch (error) {
      console.error('Error fetching segments:', error)
      // Return empty array instead of throwing to prevent app crash
      return []
    }
  },

  async create(segment: Omit<Segment, 'id' | 'created_at' | 'updated_at'>): Promise<Segment> {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user || !user.id || user.id.trim() === '') {
      throw new Error('User not authenticated or invalid user ID')
    }

    const { data, error } = await supabase
      .from('segments')
      .insert([{
        ...segment,
        user_id: user.id
      }])
      .select()
      .single()
    
    if (error) {
      console.error('Supabase error:', error)
      throw new Error(`Failed to create segment: ${error.message}`)
    }
    
    return data
  },

  async update(id: string, updates: Partial<Segment>): Promise<Segment> {
    const { data, error } = await supabase
      .from('segments')
      .update(updates)
      .eq('id', id)
      .select()
      .single()
    
    if (error) {
      console.error('Supabase error:', error)
      throw new Error(`Failed to update segment: ${error.message}`)
    }
    
    return data
  },

  async delete(id: string): Promise<void> {
    const { error } = await supabase
      .from('segments')
      .delete()
      .eq('id', id)
    
    if (error) {
      console.error('Supabase error:', error)
      throw new Error(`Failed to delete segment: ${error.message}`)
    }
  }
}

// Snowflake API - Real-time customer data queries
export const snowflakeAPI = {
  async getSchema(): Promise<{ columns: Array<{ name: string; type: string; nullable: boolean; comment: string }> }> {
    try {
      // Once FDW is set up, we'll query the information schema directly
      // For now, return mock schema that represents typical customer data
      const mockColumns = [
        { name: 'customer_id', type: 'VARCHAR', nullable: false, comment: 'Unique customer identifier' },
        { name: 'org_id', type: 'VARCHAR', nullable: false, comment: 'Organization identifier' },
        { name: 'email', type: 'VARCHAR', nullable: true, comment: 'Customer email address' },
        { name: 'first_name', type: 'VARCHAR', nullable: true, comment: 'Customer first name' },
        { name: 'last_name', type: 'VARCHAR', nullable: true, comment: 'Customer last name' },
        { name: 'state', type: 'VARCHAR', nullable: true, comment: 'Customer state' },
        { name: 'city', type: 'VARCHAR', nullable: true, comment: 'Customer city' },
        { name: 'total_spent', type: 'NUMBER', nullable: true, comment: 'Total amount spent' },
        { name: 'order_count', type: 'NUMBER', nullable: true, comment: 'Number of orders' },
        { name: 'avg_order_value', type: 'NUMBER', nullable: true, comment: 'Average order value' },
        { name: 'last_order_date', type: 'DATE', nullable: true, comment: 'Date of last order' },
        { name: 'customer_lifetime_value', type: 'NUMBER', nullable: true, comment: 'Predicted lifetime value' },
        { name: 'preferred_category', type: 'VARCHAR', nullable: true, comment: 'Most purchased category' },
        { name: 'loyalty_tier', type: 'VARCHAR', nullable: true, comment: 'Current loyalty tier' },
        { name: 'created_at', type: 'TIMESTAMP', nullable: true, comment: 'Account creation date' },
      ]
      
      return { columns: mockColumns }
    } catch (error) {
      console.error('Failed to get Snowflake schema:', error)
      throw error
    }
  },

  async getCustomerCount(whereClause?: string): Promise<{ count: number; whereClause: string }> {
    try {
      // Build the full WHERE clause with ORG_ID filter
      const orgFilter = "ORG_ID = 'e5058cc4-c7c3-4b6c-a6ca-0e590783a824'"
      const fullWhereClause = whereClause 
        ? `${orgFilter} AND (${whereClause})`
        : orgFilter

      console.log('[SnowflakeAPI] Getting customer count with WHERE clause:', fullWhereClause)

      // Build the full SQL query
      const sqlQuery = `SELECT COUNT(*) as count 
                FROM RETAIL_ANALYTICS.DBT_CUSTOMER.CUSTOMER_FACT 
                WHERE ${fullWhereClause}`;
      
      console.log('[SnowflakeAPI] Full SQL query being sent to Snowflake:', sqlQuery);

      // Execute the count query using Snowflake edge function
      const response = await supabase.functions.invoke('snowflake', {
        body: {
          sql: sqlQuery,
          database: 'RETAIL_ANALYTICS',
          schema: 'DBT_CUSTOMER',
          warehouse: 'RETAIL_ANALYTICS'
        }
      })

      console.log('[SnowflakeAPI] Count query response:', response)
      console.log('[SnowflakeAPI] Response data structure:', JSON.stringify(response.data, null, 2))

      if (response.error) {
        throw new Error(response.error.message || 'Failed to execute count query')
      }

      // Extract count from response
      let count = 0;
      
      // Snowflake returns data in a nested array structure
      if (response.data?.success && response.data?.data?.data) {
        // The count is in data.data[0][0] as a string
        const countValue = response.data.data.data[0][0];
        count = parseInt(countValue, 10) || 0;
        console.log('[SnowflakeAPI] Raw count value:', countValue, 'Parsed count:', count);
      }
      
      console.log('[SnowflakeAPI] Extracted count:', count)
      
      return {
        count: count,
        whereClause: fullWhereClause
      }
    } catch (error) {
      console.error('[SnowflakeAPI] Failed to get customer count:', error)
      throw error
    }
  },

  async previewCustomers(whereClause?: string, limit: number = 10): Promise<{ rows: any[]; columns: string[] }> {
    try {
      // Once FDW is set up, we'll query directly
      // For now, return empty preview
      const columns = [
        'customer_id', 'email', 'first_name', 'last_name', 
        'state', 'total_spent', 'order_count', 'last_order_date'
      ]
      
      return {
        rows: [],
        columns
      }
    } catch (error) {
      console.error('Failed to preview customers:', error)
      throw error
    }
  }
}

// Analytics API - Mock implementation with realistic data
export const analyticsAPI = {
  async getMetrics(period: string = '30d'): Promise<AnalyticsData[]> {
    // Mock analytics data for development
    const mockData: AnalyticsData[] = [
      {
        id: '1',
        metric_name: 'total_revenue',
        metric_value: 45230,
        period,
        date: new Date().toISOString(),
        metadata: { currency: 'USD' }
      },
      {
        id: '2', 
        metric_name: 'open_rate',
        metric_value: 24.5,
        period,
        date: new Date().toISOString(),
        metadata: { unit: 'percentage' }
      }
    ]
    
    return mockData
  },

  async getDashboardData(): Promise<{
    totalRevenue: number
    totalCampaigns: number
    totalSegments: number
    avgOpenRate: number
    recentCampaigns: Campaign[]
    topSegments: Segment[]
  }> {
    try {
      // Get actual data from Supabase
      const [campaignsResult, segmentsResult] = await Promise.all([
        supabase.from('campaigns').select('*'),
        supabase.from('segments').select('*')
      ])

      const campaigns = campaignsResult.data || []
      const segments = segmentsResult.data || []

      // Calculate metrics from actual data
      const totalRevenue = campaigns.reduce((sum, campaign) => sum + (campaign.revenue || 0), 0)
      const avgOpenRate = campaigns.length > 0 
        ? campaigns.reduce((sum, campaign) => sum + (campaign.open_rate || 0), 0) / campaigns.length
        : 0

      return {
        totalRevenue,
        totalCampaigns: campaigns.length,
        totalSegments: segments.length,
        avgOpenRate,
        recentCampaigns: campaigns.slice(0, 5),
        topSegments: segments.slice(0, 5)
      }
    } catch (error) {
      console.error('Error fetching dashboard data:', error)
      // Return default values if there's an error
      return {
        totalRevenue: 0,
        totalCampaigns: 0,
        totalSegments: 0,
        avgOpenRate: 0,
        recentCampaigns: [],
        topSegments: []
      }
    }
  }
}