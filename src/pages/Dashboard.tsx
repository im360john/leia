import React, { useEffect, useState } from 'react'
import { DollarSign, Mail, Users, Eye, TrendingUp } from 'lucide-react'
import { analyticsAPI, campaignsAPI, segmentsAPI } from '../lib/api'
import { Campaign, Segment } from '../lib/supabase'
import { logger } from '../lib/logger'

interface DashboardData {
  totalRevenue: number
  totalCampaigns: number
  totalSegments: number
  avgOpenRate: number
  recentCampaigns: Campaign[]
  topSegments: Segment[]
}

export function Dashboard() {
  const [dashboardData, setDashboardData] = useState<DashboardData | null>(null)
  const [campaigns, setCampaigns] = useState<Campaign[]>([])
  const [segments, setSegments] = useState<Segment[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadDashboardData()
  }, [])

  const loadDashboardData = async () => {
    logger.info('Loading dashboard data', { component: 'Dashboard' })
    setLoading(true)
    
    try {
      // Load all data in parallel
      const [dashboardResponse, campaignsResponse, segmentsResponse] = await Promise.all([
        analyticsAPI.getDashboardData(),
        campaignsAPI.getAll(),
        segmentsAPI.getAll()
      ])

      setDashboardData(dashboardResponse)
      setCampaigns(campaignsResponse)
      setSegments(segmentsResponse)
      
      logger.info('Dashboard data loaded successfully', {
        component: 'Dashboard',
        campaignsCount: campaignsResponse.length,
        segmentsCount: segmentsResponse.length
      })
    } catch (error) {
      logger.error('Failed to load dashboard data', {
        component: 'Dashboard'
      }, error as Error)
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600"></div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-100">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Total Revenue</p>
              <p className="text-2xl font-bold text-gray-900">
                ${dashboardData?.totalRevenue?.toLocaleString() || '0'}
              </p>
            </div>
            <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center">
              <DollarSign className="w-6 h-6 text-green-600" />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-100">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Active Campaigns</p>
              <p className="text-2xl font-bold text-gray-900">
                {dashboardData?.totalCampaigns || campaigns.length}
              </p>
            </div>
            <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
              <Mail className="w-6 h-6 text-blue-600" />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-100">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Customer Segments</p>
              <p className="text-2xl font-bold text-gray-900">
                {dashboardData?.totalSegments || segments.length}
              </p>
            </div>
            <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center">
              <Users className="w-6 h-6 text-purple-600" />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-100">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Avg. Open Rate</p>
              <p className="text-2xl font-bold text-gray-900">
                {dashboardData?.avgOpenRate?.toFixed(1) || '0.0'}%
              </p>
            </div>
            <div className="w-12 h-12 bg-orange-100 rounded-lg flex items-center justify-center">
              <Eye className="w-6 h-6 text-orange-600" />
            </div>
          </div>
        </div>
      </div>

      {/* Recent Activity */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-100">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Recent Campaigns</h3>
          <div className="space-y-3">
            {campaigns.slice(0, 5).map((campaign) => (
              <div key={campaign.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                <div>
                  <p className="font-medium text-gray-900">{campaign.name}</p>
                  <p className="text-sm text-gray-600 capitalize">{campaign.status}</p>
                </div>
                <div className="text-right">
                  <p className="text-sm font-medium text-gray-900">
                    {campaign.open_rate ? `${campaign.open_rate}% open` : 'Draft'}
                  </p>
                  <p className="text-xs text-gray-500">
                    {new Date(campaign.created_at).toLocaleDateString()}
                  </p>
                </div>
              </div>
            ))}
            {campaigns.length === 0 && (
              <p className="text-gray-500 text-center py-4">No campaigns yet</p>
            )}
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-100">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Top Segments</h3>
          <div className="space-y-3">
            {segments.slice(0, 5).map((segment) => (
              <div key={segment.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                <div>
                  <p className="font-medium text-gray-900">{segment.name}</p>
                  <p className="text-sm text-gray-600 capitalize">{segment.type}</p>
                </div>
                <div className="text-right">
                  <p className="text-sm font-medium text-gray-900">
                    {segment.customer_count.toLocaleString()} customers
                  </p>
                  {segment.growth_rate && (
                    <p className="text-xs text-green-600">
                      +{segment.growth_rate}% growth
                    </p>
                  )}
                </div>
              </div>
            ))}
            {segments.length === 0 && (
              <p className="text-gray-500 text-center py-4">No segments yet</p>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}