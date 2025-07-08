import React, { useState, useEffect } from 'react'
import { 
  MessageSquare, 
  BarChart3, 
  Users, 
  Mail, 
  Menu, 
  X, 
  Send, 
  Plus,
  Play,
  Pause,
  Edit,
  Trash2,
  TrendingUp,
  Target,
  DollarSign,
  Eye,
  MousePointer,
  LogOut
} from 'lucide-react'
import { useAuth } from './hooks/useAuth'
import { AuthForm } from './components/AuthForm'
import { SegmentForm } from './components/SegmentForm'
import { campaignsAPI, segmentsAPI, analyticsAPI, chatAPI } from './lib/api'
import type { Campaign, Segment, AnalyticsData } from './lib/supabase'

function App() {
  const { user, loading: authLoading, signOut } = useAuth()
  const [activeTab, setActiveTab] = useState('dashboard')
  const [sidebarOpen, setSidebarOpen] = useState(false)
  
  // Data states
  const [campaigns, setCampaigns] = useState<Campaign[]>([])
  const [segments, setSegments] = useState<Segment[]>([])
  const [analytics, setAnalytics] = useState<AnalyticsData[]>([])
  const [dashboardData, setDashboardData] = useState<any>(null)
  
  // Loading states
  const [campaignsLoading, setCampaignsLoading] = useState(false)
  const [segmentsLoading, setSegmentsLoading] = useState(false)
  const [analyticsLoading, setAnalyticsLoading] = useState(false)
  
  // Chat states
  const [chatMessages, setChatMessages] = useState<Array<{
    id: string
    content: string
    role: 'user' | 'assistant'
    timestamp: string
    suggestions?: string[]
  }>>([
    {
      id: '1',
      content: "Hello! I'm your AI Marketing Strategist. I can help you create campaigns, analyze customer segments, and optimize your marketing strategy. What would you like to work on today?",
      role: 'assistant',
      timestamp: new Date().toISOString(),
      suggestions: [
        "Create a new email campaign",
        "Analyze customer segments",
        "Review campaign performance",
        "Optimize conversion rates"
      ]
    }
  ])
  const [chatInput, setChatInput] = useState('')
  const [chatLoading, setChatLoading] = useState(false)

  // Form states
  const [showCampaignForm, setShowCampaignForm] = useState(false)
  const [showSegmentForm, setShowSegmentForm] = useState(false)
  const [editingCampaign, setEditingCampaign] = useState<Campaign | null>(null)
  const [editingSegment, setEditingSegment] = useState<Segment | null>(null)

  // Load data on mount and when user changes
  useEffect(() => {
    if (user) {
      loadDashboardData()
      loadCampaigns()
      loadSegments()
      loadAnalytics()
    }
  }, [user])

  const loadDashboardData = async () => {
    try {
      const data = await analyticsAPI.getDashboardData()
      setDashboardData(data)
    } catch (error) {
      console.error('Failed to load dashboard data:', error)
    }
  }

  const loadCampaigns = async () => {
    setCampaignsLoading(true)
    try {
      const data = await campaignsAPI.getAll()
      setCampaigns(data)
    } catch (error) {
      console.error('Error loading campaigns:', error)
      // Don't show error to user, just log it and show empty state
      setCampaigns([])
    } finally {
      setCampaignsLoading(false)
    }
  }

  const loadSegments = async () => {
    setSegmentsLoading(true)
    try {
      const data = await segmentsAPI.getAll()
      setSegments(data)
    } catch (error) {
      console.error('Error loading segments:', error)
      // Don't show error to user, just log it and show empty state
      setSegments([])
    } finally {
      setSegmentsLoading(false)
    }
  }

  const loadAnalytics = async () => {
    setAnalyticsLoading(true)
    try {
      const data = await analyticsAPI.getMetrics()
      setAnalytics(data)
    } catch (error) {
      console.error('Error loading analytics:', error)
      // Don't show error to user, just log it and show empty state
      setAnalytics([])
    } finally {
      setAnalyticsLoading(false)
    }
  }

  const handleSendMessage = async () => {
    if (!chatInput.trim() || chatLoading) return

    const userMessage = {
      id: Date.now().toString(),
      content: chatInput,
      role: 'user' as const,
      timestamp: new Date().toISOString()
    }

    setChatMessages(prev => [...prev, userMessage])
    setChatInput('')
    setChatLoading(true)

    try {
      // Provide context to the AI about user's current data
      const context = {
        campaigns: campaigns.slice(0, 5), // Send recent campaigns
        segments: segments.slice(0, 5),   // Send top segments
        analytics: analytics.slice(0, 5)  // Send recent analytics
      }
      
      const response = await chatAPI.sendMessage(chatInput, context)
      
      const assistantMessage = {
        id: (Date.now() + 1).toString(),
        content: response.response,
        role: 'assistant' as const,
        timestamp: new Date().toISOString(),
        suggestions: response.suggestions
      }

      setChatMessages(prev => [...prev, assistantMessage])
    } catch (error) {
      console.error('Failed to send message:', error)
      const errorMessage = {
        id: (Date.now() + 1).toString(),
        content: "I'm experiencing some technical difficulties right now. Please try again in a moment, or feel free to ask me about your campaigns, segments, or marketing strategy.",
        role: 'assistant' as const,
        timestamp: new Date().toISOString()
      }
      setChatMessages(prev => [...prev, errorMessage])
    } finally {
      setChatLoading(false)
    }
  }

  const handleCreateCampaign = async (campaignData: Omit<Campaign, 'id' | 'created_at' | 'updated_at'>) => {
    try {
      // Convert empty string target_segment to null for UUID compatibility
      const processedData = {
        ...campaignData,
        target_segment: campaignData.target_segment || null
      }
      
      const newCampaign = await campaignsAPI.create(processedData)
      setCampaigns(prev => [...prev, newCampaign])
      setShowCampaignForm(false)
      loadDashboardData() // Refresh dashboard stats
    } catch (error) {
      console.error('Failed to create campaign:', error)
    }
  }

  const handleUpdateCampaign = async (id: string, updates: Partial<Campaign>) => {
    try {
      // Convert empty string target_segment to null for UUID compatibility
      const processedUpdates = {
        ...updates,
        target_segment: updates.target_segment || null
      }
      
      const updatedCampaign = await campaignsAPI.update(id, processedUpdates)
      setCampaigns(prev => prev.map(c => c.id === id ? updatedCampaign : c))
      setEditingCampaign(null)
      loadDashboardData()
    } catch (error) {
      console.error('Failed to update campaign:', error)
    }
  }

  const handleDeleteCampaign = async (id: string) => {
    if (!confirm('Are you sure you want to delete this campaign?')) return
    
    try {
      await campaignsAPI.delete(id)
      setCampaigns(prev => prev.filter(c => c.id !== id))
      loadDashboardData()
    } catch (error) {
      console.error('Failed to delete campaign:', error)
    }
  }

  const handleCreateSegment = async (segmentData: Omit<Segment, 'id' | 'created_at' | 'updated_at'>) => {
    try {
      const newSegment = await segmentsAPI.create(segmentData)
      setSegments(prev => [...prev, newSegment])
      setShowSegmentForm(false)
      loadDashboardData()
    } catch (error) {
      console.error('Failed to create segment:', error)
    }
  }

  const handleUpdateSegment = async (id: string, updates: Partial<Segment>) => {
    try {
      const updatedSegment = await segmentsAPI.update(id, updates)
      setSegments(prev => prev.map(s => s.id === id ? updatedSegment : s))
      setEditingSegment(null)
      loadDashboardData()
    } catch (error) {
      console.error('Failed to update segment:', error)
    }
  }

  const handleDeleteSegment = async (id: string) => {
    if (!confirm('Are you sure you want to delete this segment?')) return
    
    try {
      await segmentsAPI.delete(id)
      setSegments(prev => prev.filter(s => s.id !== id))
      loadDashboardData()
    } catch (error) {
      console.error('Failed to delete segment:', error)
    }
  }

  const handleSignOut = async () => {
    await signOut()
  }

  // Show loading screen while checking auth
  if (authLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-900 via-blue-900 to-indigo-900 flex items-center justify-center">
        <div className="text-white text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-white mx-auto mb-4"></div>
          <p>Loading...</p>
        </div>
      </div>
    )
  }

  // Show auth form if not authenticated
  if (!user) {
    return <AuthForm />
  }

  const navigation = [
    { id: 'dashboard', name: 'Dashboard', icon: BarChart3 },
    { id: 'campaigns', name: 'Campaigns', icon: Mail },
    { id: 'segments', name: 'Segments', icon: Users },
    { id: 'chat', name: 'AI Strategist', icon: MessageSquare },
  ]

  return (
    <div className="min-h-screen bg-gray-50 flex">
      {/* Sidebar */}
      <div className={`${sidebarOpen ? 'translate-x-0' : '-translate-x-full'} fixed inset-y-0 left-0 z-50 w-64 bg-white shadow-lg transform transition-transform duration-300 ease-in-out lg:translate-x-0 lg:static lg:inset-0`}>
        <div className="flex items-center justify-between h-16 px-6 border-b border-gray-200">
          <div className="flex items-center">
            <div className="w-8 h-8 bg-gradient-to-r from-purple-600 to-pink-600 rounded-lg flex items-center justify-center">
              <MessageSquare className="w-5 h-5 text-white" />
            </div>
            <span className="ml-2 text-xl font-bold text-gray-900">Leia</span>
          </div>
          <button
            onClick={() => setSidebarOpen(false)}
            className="lg:hidden p-1 rounded-md text-gray-400 hover:text-gray-500"
          >
            <X className="w-6 h-6" />
          </button>
        </div>
        
        <nav className="mt-8 px-4 space-y-2">
          {navigation.map((item) => {
            const Icon = item.icon
            return (
              <button
                key={item.id}
                onClick={() => {
                  setActiveTab(item.id)
                  setSidebarOpen(false)
                }}
                className={`w-full flex items-center px-4 py-3 text-sm font-medium rounded-lg transition-colors ${
                  activeTab === item.id
                    ? 'bg-purple-50 text-purple-700 border-r-2 border-purple-700'
                    : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
                }`}
              >
                <Icon className="w-5 h-5 mr-3" />
                {item.name}
              </button>
            )
          })}
        </nav>

        <div className="absolute bottom-4 left-4 right-4">
          <div className="bg-gray-50 rounded-lg p-4">
            <div className="flex items-center mb-2">
              <div className="w-8 h-8 bg-purple-600 rounded-full flex items-center justify-center">
                <span className="text-white text-sm font-medium">
                  {user.email?.[0]?.toUpperCase()}
                </span>
              </div>
              <div className="ml-3 flex-1 min-w-0">
                <p className="text-sm font-medium text-gray-900 truncate">
                  {user.email}
                </p>
              </div>
            </div>
            <button
              onClick={handleSignOut}
              className="w-full flex items-center justify-center px-3 py-2 text-sm text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-md transition-colors"
            >
              <LogOut className="w-4 h-4 mr-2" />
              Sign Out
            </button>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Header */}
        <header className="bg-white shadow-sm border-b border-gray-200">
          <div className="flex items-center justify-between h-16 px-6">
            <div className="flex items-center">
              <button
                onClick={() => setSidebarOpen(true)}
                className="lg:hidden p-2 rounded-md text-gray-400 hover:text-gray-500"
              >
                <Menu className="w-6 h-6" />
              </button>
              <h1 className="ml-4 lg:ml-0 text-2xl font-bold text-gray-900 capitalize">
                {activeTab === 'chat' ? 'AI Strategist' : activeTab}
              </h1>
            </div>
          </div>
        </header>

        {/* Content */}
        <main className="flex-1 overflow-auto p-6">
          {activeTab === 'dashboard' && (
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
          )}

          {activeTab === 'campaigns' && (
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <h2 className="text-2xl font-bold text-gray-900">Email Campaigns</h2>
                <button
                  onClick={() => setShowCampaignForm(true)}
                  className="bg-gradient-to-r from-purple-600 to-pink-600 text-white px-4 py-2 rounded-lg font-medium hover:from-purple-700 hover:to-pink-700 transition-all duration-200 flex items-center gap-2"
                >
                  <Plus className="w-4 h-4" />
                  New Campaign
                </button>
              </div>

              {campaignsLoading ? (
                <div className="text-center py-12">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600 mx-auto mb-4"></div>
                  <p className="text-gray-600">Loading campaigns...</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
                  {campaigns.map((campaign) => (
                    <div key={campaign.id} className="bg-white rounded-xl shadow-sm p-6 border border-gray-100">
                      <div className="flex items-start justify-between mb-4">
                        <div>
                          <h3 className="font-semibold text-gray-900 mb-1">{campaign.name}</h3>
                          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium capitalize ${
                            campaign.status === 'active' ? 'bg-green-100 text-green-800' :
                            campaign.status === 'draft' ? 'bg-gray-100 text-gray-800' :
                            campaign.status === 'paused' ? 'bg-yellow-100 text-yellow-800' :
                            'bg-blue-100 text-blue-800'
                          }`}>
                            {campaign.status}
                          </span>
                        </div>
                        <div className="flex items-center gap-1">
                          <button
                            onClick={() => setEditingCampaign(campaign)}
                            className="p-1 text-gray-400 hover:text-gray-600"
                          >
                            <Edit className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleDeleteCampaign(campaign.id)}
                            className="p-1 text-gray-400 hover:text-red-600"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>

                      {campaign.subject && (
                        <p className="text-sm text-gray-600 mb-3">Subject: {campaign.subject}</p>
                      )}

                      <div className="grid grid-cols-2 gap-4 text-sm">
                        <div>
                          <p className="text-gray-500">Sent</p>
                          <p className="font-medium">{campaign.sent_count?.toLocaleString() || '0'}</p>
                        </div>
                        <div>
                          <p className="text-gray-500">Open Rate</p>
                          <p className="font-medium">{campaign.open_rate ? `${campaign.open_rate}%` : 'N/A'}</p>
                        </div>
                        <div>
                          <p className="text-gray-500">Click Rate</p>
                          <p className="font-medium">{campaign.click_rate ? `${campaign.click_rate}%` : 'N/A'}</p>
                        </div>
                        <div>
                          <p className="text-gray-500">Revenue</p>
                          <p className="font-medium">${campaign.revenue?.toLocaleString() || '0'}</p>
                        </div>
                      </div>

                      <div className="mt-4 pt-4 border-t border-gray-100">
                        <p className="text-xs text-gray-500">
                          Created {new Date(campaign.created_at).toLocaleDateString()}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {campaigns.length === 0 && !campaignsLoading && (
                <div className="text-center py-12">
                  <Mail className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                  <h3 className="text-lg font-medium text-gray-900 mb-2">No campaigns yet</h3>
                  <p className="text-gray-600 mb-4">Create your first email campaign to get started.</p>
                  <button
                    onClick={() => setShowCampaignForm(true)}
                    className="bg-gradient-to-r from-purple-600 to-pink-600 text-white px-4 py-2 rounded-lg font-medium hover:from-purple-700 hover:to-pink-700 transition-all duration-200"
                  >
                    Create Campaign
                  </button>
                </div>
              )}
            </div>
          )}

          {activeTab === 'segments' && (
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <h2 className="text-2xl font-bold text-gray-900">Customer Segments</h2>
                <button
                  onClick={() => setShowSegmentForm(true)}
                  className="bg-gradient-to-r from-purple-600 to-pink-600 text-white px-4 py-2 rounded-lg font-medium hover:from-purple-700 hover:to-pink-700 transition-all duration-200 flex items-center gap-2"
                >
                  <Plus className="w-4 h-4" />
                  New Segment
                </button>
              </div>

              {segmentsLoading ? (
                <div className="text-center py-12">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600 mx-auto mb-4"></div>
                  <p className="text-gray-600">Loading segments...</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  {segments.map((segment) => (
                    <div key={segment.id} className="bg-white rounded-xl shadow-sm p-6 border border-gray-100">
                      <div className="flex items-start justify-between mb-4">
                        <div>
                          <h3 className="font-semibold text-gray-900 mb-1">{segment.name}</h3>
                          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium capitalize ${
                            segment.type === 'behavioral' ? 'bg-blue-100 text-blue-800' : 'bg-purple-100 text-purple-800'
                          }`}>
                            {segment.type}
                          </span>
                        </div>
                        <div className="flex items-center gap-1">
                          <button
                            onClick={() => setEditingSegment(segment)}
                            className="p-1 text-gray-400 hover:text-gray-600"
                          >
                            <Edit className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleDeleteSegment(segment.id)}
                            className="p-1 text-gray-400 hover:text-red-600"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>

                      <p className="text-sm text-gray-600 mb-4">{segment.description}</p>

                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-2xl font-bold text-gray-900">
                            {segment.customer_count.toLocaleString()}
                          </p>
                          <p className="text-sm text-gray-500">customers</p>
                        </div>
                        {segment.growth_rate && (
                          <div className="flex items-center text-green-600">
                            <TrendingUp className="w-4 h-4 mr-1" />
                            <span className="text-sm font-medium">+{segment.growth_rate}%</span>
                          </div>
                        )}
                      </div>

                      <div className="mt-4 pt-4 border-t border-gray-100">
                        <p className="text-xs text-gray-500">
                          Created {new Date(segment.created_at).toLocaleDateString()}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {segments.length === 0 && !segmentsLoading && (
                <div className="text-center py-12">
                  <Users className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                  <h3 className="text-lg font-medium text-gray-900 mb-2">No segments yet</h3>
                  <p className="text-gray-600 mb-4">Create your first customer segment to get started.</p>
                  <button
                    onClick={() => setShowSegmentForm(true)}
                    className="bg-gradient-to-r from-purple-600 to-pink-600 text-white px-4 py-2 rounded-lg font-medium hover:from-purple-700 hover:to-pink-700 transition-all duration-200"
                  >
                    Create Segment
                  </button>
                </div>
              )}
            </div>
          )}

          {activeTab === 'chat' && (
            <div className="max-w-4xl mx-auto">
              <div className="bg-white rounded-xl shadow-sm border border-gray-100 h-[calc(100vh-12rem)] flex flex-col">
                {/* Chat Header */}
                <div className="p-6 border-b border-gray-100">
                  <div className="flex items-center">
                    <div className="w-10 h-10 bg-gradient-to-r from-purple-600 to-pink-600 rounded-full flex items-center justify-center">
                      <MessageSquare className="w-5 h-5 text-white" />
                    </div>
                    <div className="ml-3">
                      <h3 className="font-semibold text-gray-900">AI Marketing Strategist</h3>
                      <p className="text-sm text-gray-600">Your intelligent marketing assistant</p>
                    </div>
                  </div>
                </div>

                {/* Chat Messages */}
                <div className="flex-1 overflow-y-auto p-6 space-y-4">
                  {chatMessages.map((message) => (
                    <div key={message.id} className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                      <div className={`max-w-xs lg:max-w-md px-4 py-2 rounded-lg ${
                        message.role === 'user'
                          ? 'bg-gradient-to-r from-purple-600 to-pink-600 text-white'
                          : 'bg-gray-100 text-gray-900'
                      }`}>
                        <p className="text-sm">{message.content}</p>
                        {message.suggestions && (
                          <div className="mt-3 space-y-2">
                            {message.suggestions.map((suggestion, index) => (
                              <button
                                key={index}
                                onClick={() => setChatInput(suggestion)}
                                className="block w-full text-left px-3 py-2 text-xs bg-white bg-opacity-20 rounded border border-white border-opacity-30 hover:bg-opacity-30 transition-all duration-200"
                              >
                                {suggestion}
                              </button>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                  {chatLoading && (
                    <div className="flex justify-start">
                      <div className="bg-gray-100 text-gray-900 px-4 py-2 rounded-lg">
                        <div className="flex items-center space-x-1">
                          <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"></div>
                          <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
                          <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
                        </div>
                      </div>
                    </div>
                  )}
                </div>

                {/* Chat Input */}
                <div className="p-6 border-t border-gray-100">
                  <div className="flex items-center space-x-4">
                    <input
                      type="text"
                      value={chatInput}
                      onChange={(e) => setChatInput(e.target.value)}
                      onKeyPress={(e) => e.key === 'Enter' && handleSendMessage()}
                      placeholder="Ask me about your marketing strategy..."
                      className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                      disabled={chatLoading}
                    />
                    <button
                      onClick={handleSendMessage}
                      disabled={!chatInput.trim() || chatLoading}
                      className="bg-gradient-to-r from-purple-600 to-pink-600 text-white p-2 rounded-lg hover:from-purple-700 hover:to-pink-700 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200"
                    >
                      <Send className="w-5 h-5" />
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}
        </main>
      </div>

      {/* Campaign Form Modal */}
      {(showCampaignForm || editingCampaign) && (
        <CampaignForm
          campaign={editingCampaign}
          segments={segments}
          onSave={editingCampaign ? 
            (updates) => handleUpdateCampaign(editingCampaign.id, updates) :
            handleCreateCampaign
          }
          onCancel={() => {
            setShowCampaignForm(false)
            setEditingCampaign(null)
          }}
        />
      )}

      {/* Segment Form Modal */}
      {(showSegmentForm || editingSegment) && (
        <SegmentForm
          segment={editingSegment}
          onSave={editingSegment ?
            (updates) => handleUpdateSegment(editingSegment.id, updates) :
            handleCreateSegment
          }
          onCancel={() => {
            setShowSegmentForm(false)
            setEditingSegment(null)
          }}
        />
      )}
    </div>
  )
}

// Campaign Form Component
function CampaignForm({ 
  campaign, 
  segments, 
  onSave, 
  onCancel 
}: {
  campaign?: Campaign | null
  segments: Segment[]
  onSave: (data: any) => void
  onCancel: () => void
}) {
  const [formData, setFormData] = useState({
    name: campaign?.name || '',
    type: campaign?.type || 'email' as const,
    subject: campaign?.subject || '',
    content: campaign?.content || '',
    target_segment: campaign?.target_segment || '',
    status: campaign?.status || 'draft' as const
  })

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    onSave(formData)
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        <div className="p-6 border-b border-gray-200">
          <h2 className="text-xl font-semibold text-gray-900">
            {campaign ? 'Edit Campaign' : 'Create New Campaign'}
          </h2>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Campaign Name
            </label>
            <input
              type="text"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Type
            </label>
            <select
              value={formData.type}
              onChange={(e) => setFormData({ ...formData, type: e.target.value as 'email' | 'sms' | 'push' })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
            >
              <option value="email">Email</option>
              <option value="sms">SMS</option>
              <option value="push">Push Notification</option>
            </select>
          </div>

          {formData.type === 'email' && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Subject Line
              </label>
              <input
                type="text"
                value={formData.subject}
                onChange={(e) => setFormData({ ...formData, subject: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
              />
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Content
            </label>
            <textarea
              value={formData.content}
              onChange={(e) => setFormData({ ...formData, content: e.target.value })}
              rows={6}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Target Segment
            </label>
            <select
              value={formData.target_segment}
              onChange={(e) => setFormData({ ...formData, target_segment: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
            >
              <option value="">All Customers</option>
              {segments.map((segment) => (
                <option key={segment.id} value={segment.id}>
                  {segment.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Status
            </label>
            <select
              value={formData.status}
              onChange={(e) => setFormData({ ...formData, status: e.target.value as Campaign['status'] })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
            >
              <option value="draft">Draft</option>
              <option value="active">Active</option>
              <option value="paused">Paused</option>
              <option value="completed">Completed</option>
            </select>
          </div>

          <div className="flex items-center justify-end space-x-4 pt-4">
            <button
              type="button"
              onClick={onCancel}
              className="px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-2 bg-gradient-to-r from-purple-600 to-pink-600 text-white rounded-lg hover:from-purple-700 hover:to-pink-700 transition-all duration-200"
            >
              {campaign ? 'Update Campaign' : 'Create Campaign'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}


export default App