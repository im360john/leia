import React, { useState, useEffect } from 'react'
import { Plus, Edit, Trash2, Mail, ChevronLeft, ChevronRight, Send, CheckCircle, XCircle } from 'lucide-react'
import { campaignsAPI, segmentsAPI } from '../lib/api'
import { Campaign, Segment } from '../lib/supabase'
import { CampaignForm } from '../components/CampaignForm'
import { logger } from '../lib/logger'

const ITEMS_PER_PAGE = 9

export function Campaigns() {
  const [campaigns, setCampaigns] = useState<Campaign[]>([])
  const [segments, setSegments] = useState<Segment[]>([])
  const [loading, setLoading] = useState(false)
  const [currentPage, setCurrentPage] = useState(1)
  const [isPolling, setIsPolling] = useState(false)
  
  // Form states
  const [showCampaignForm, setShowCampaignForm] = useState(false)
  const [editingCampaign, setEditingCampaign] = useState<Campaign | null>(null)

  useEffect(() => {
    loadData()
    
    // Check if any campaigns are in active state to start polling
    const checkForActiveCampaigns = async () => {
      const campaignsData = await campaignsAPI.getAll()
      const hasActiveCampaigns = campaignsData.some(c => c.status === 'active' && c.sent_count > 0)
      setIsPolling(hasActiveCampaigns)
    }
    
    checkForActiveCampaigns()
  }, [])

  // Poll for updates when campaigns are active
  useEffect(() => {
    if (!isPolling) return

    const interval = setInterval(async () => {
      logger.info('Polling for campaign updates', { component: 'Campaigns' })
      
      try {
        const updatedCampaigns = await campaignsAPI.getAll()
        setCampaigns(updatedCampaigns)
        
        // Stop polling if no campaigns are sending
        const stillSending = updatedCampaigns.some(c => 
          c.status === 'active' && 
          c.sent_count > 0 && 
          (!c.delivered_count || c.delivered_count < c.sent_count)
        )
        
        if (!stillSending) {
          logger.info('Stopping campaign polling - all emails delivered', { component: 'Campaigns' })
          setIsPolling(false)
        }
      } catch (error) {
        logger.error('Failed to poll campaigns', { component: 'Campaigns' }, error as Error)
      }
    }, 3000) // Poll every 3 seconds

    return () => clearInterval(interval)
  }, [isPolling])

  const loadData = async () => {
    logger.info('Loading campaigns data', { component: 'Campaigns' })
    setLoading(true)
    
    try {
      const [campaignsData, segmentsData] = await Promise.all([
        campaignsAPI.getAll(),
        segmentsAPI.getAll()
      ])
      
      setCampaigns(campaignsData)
      setSegments(segmentsData)
      
      logger.info('Campaigns data loaded', {
        component: 'Campaigns',
        count: campaignsData.length
      })
    } catch (error) {
      logger.error('Failed to load campaigns', {
        component: 'Campaigns'
      }, error as Error)
    } finally {
      setLoading(false)
    }
  }

  const handleCreateCampaign = async (campaignData: Omit<Campaign, 'id' | 'created_at' | 'updated_at'>) => {
    logger.info('Creating campaign', {
      component: 'Campaigns',
      action: 'create',
      campaignName: campaignData.name
    })
    
    try {
      const processedData = {
        ...campaignData,
        target_segment: campaignData.target_segment || null
      }
      
      const newCampaign = await campaignsAPI.create(processedData)
      setCampaigns(prev => [newCampaign, ...prev])
      setShowCampaignForm(false)
      
      logger.info('Campaign created successfully', {
        component: 'Campaigns',
        campaignId: newCampaign.id
      })
    } catch (error) {
      logger.error('Failed to create campaign', {
        component: 'Campaigns',
        action: 'create'
      }, error as Error)
    }
  }

  const handleUpdateCampaign = async (id: string, updates: Partial<Campaign>) => {
    logger.info('Updating campaign', {
      component: 'Campaigns',
      action: 'update',
      campaignId: id
    })
    
    try {
      const processedUpdates = {
        ...updates,
        target_segment: updates.target_segment || null
      }
      
      const updatedCampaign = await campaignsAPI.update(id, processedUpdates)
      setCampaigns(prev => prev.map(c => c.id === id ? updatedCampaign : c))
      setEditingCampaign(null)
      
      logger.info('Campaign updated successfully', {
        component: 'Campaigns',
        campaignId: id
      })
      
      // Start polling if campaign is being activated
      if (processedUpdates.status === 'active') {
        setIsPolling(true)
      }
    } catch (error) {
      logger.error('Failed to update campaign', {
        component: 'Campaigns',
        action: 'update',
        campaignId: id
      }, error as Error)
    }
  }

  const handleDeleteCampaign = async (id: string) => {
    if (!confirm('Are you sure you want to delete this campaign?')) return
    
    logger.info('Deleting campaign', {
      component: 'Campaigns',
      action: 'delete',
      campaignId: id
    })
    
    try {
      await campaignsAPI.delete(id)
      setCampaigns(prev => prev.filter(c => c.id !== id))
      
      // Adjust current page if needed
      const newTotalPages = Math.ceil((campaigns.length - 1) / ITEMS_PER_PAGE)
      if (currentPage > newTotalPages && newTotalPages > 0) {
        setCurrentPage(newTotalPages)
      }
      
      logger.info('Campaign deleted successfully', {
        component: 'Campaigns',
        campaignId: id
      })
    } catch (error) {
      logger.error('Failed to delete campaign', {
        component: 'Campaigns',
        action: 'delete',
        campaignId: id
      }, error as Error)
    }
  }

  // Pagination calculations
  const totalPages = Math.ceil(campaigns.length / ITEMS_PER_PAGE)
  const startIndex = (currentPage - 1) * ITEMS_PER_PAGE
  const endIndex = startIndex + ITEMS_PER_PAGE
  const currentCampaigns = campaigns.slice(startIndex, endIndex)

  const handlePageChange = (page: number) => {
    setCurrentPage(page)
    logger.debug('Page changed', {
      component: 'Campaigns',
      page,
      totalPages
    })
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
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <h2 className="text-2xl font-bold text-gray-900">Email Campaigns</h2>
          {isPolling && (
            <div className="flex items-center gap-2 text-sm text-purple-600 bg-purple-100 px-3 py-1 rounded-full">
              <div className="animate-pulse w-2 h-2 bg-purple-600 rounded-full"></div>
              <span>Updating delivery status...</span>
            </div>
          )}
        </div>
        <button
          onClick={() => setShowCampaignForm(true)}
          className="bg-gradient-to-r from-purple-600 to-pink-600 text-white px-4 py-2 rounded-lg font-medium hover:from-purple-700 hover:to-pink-700 transition-all duration-200 flex items-center gap-2"
        >
          <Plus className="w-4 h-4" />
          New Campaign
        </button>
      </div>

      {campaigns.length === 0 ? (
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
      ) : (
        <>
          <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
            {currentCampaigns.map((campaign) => (
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
                    <p className="font-medium flex items-center gap-1">
                      <Send className="w-3 h-3 text-blue-500" />
                      {campaign.sent_count?.toLocaleString() || '0'}
                    </p>
                  </div>
                  <div>
                    <p className="text-gray-500">Delivered</p>
                    <p className="font-medium flex items-center gap-1">
                      <CheckCircle className="w-3 h-3 text-green-500" />
                      {campaign.delivered_count?.toLocaleString() || '0'}
                    </p>
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
                    <p className="text-gray-500">Bounced</p>
                    <p className="font-medium flex items-center gap-1">
                      <XCircle className="w-3 h-3 text-red-500" />
                      {campaign.bounced_count?.toLocaleString() || '0'}
                    </p>
                  </div>
                  <div>
                    <p className="text-gray-500">Revenue</p>
                    <p className="font-medium">${campaign.revenue?.toLocaleString() || '0'}</p>
                  </div>
                </div>

                {/* Email Delivery Status Bar */}
                {campaign.sent_count > 0 && (
                  <div className="mt-4">
                    <div className="flex items-center justify-between text-xs text-gray-500 mb-1">
                      <span>Delivery Status</span>
                      <span>{((campaign.delivered_count || 0) / campaign.sent_count * 100).toFixed(0)}% delivered</span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div className="bg-green-500 h-2 rounded-full relative" style={{ 
                        width: `${Math.min(((campaign.delivered_count || 0) / campaign.sent_count * 100), 100)}%` 
                      }}>
                        {campaign.bounced_count > 0 && (
                          <div className="absolute right-0 top-0 bg-red-500 h-2 rounded-r-full" style={{
                            width: `${(campaign.bounced_count / campaign.sent_count * 100)}%`
                          }}></div>
                        )}
                      </div>
                    </div>
                  </div>
                )}

                <div className="mt-4 pt-4 border-t border-gray-100">
                  <p className="text-xs text-gray-500">
                    Created {new Date(campaign.created_at).toLocaleDateString()}
                  </p>
                </div>
              </div>
            ))}
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-center gap-2">
              <button
                onClick={() => handlePageChange(currentPage - 1)}
                disabled={currentPage === 1}
                className="p-2 text-gray-600 hover:text-gray-900 disabled:text-gray-300 disabled:cursor-not-allowed"
              >
                <ChevronLeft className="w-5 h-5" />
              </button>
              
              {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => (
                <button
                  key={page}
                  onClick={() => handlePageChange(page)}
                  className={`px-3 py-1 rounded-lg ${
                    currentPage === page
                      ? 'bg-purple-600 text-white'
                      : 'text-gray-600 hover:bg-gray-100'
                  }`}
                >
                  {page}
                </button>
              ))}
              
              <button
                onClick={() => handlePageChange(currentPage + 1)}
                disabled={currentPage === totalPages}
                className="p-2 text-gray-600 hover:text-gray-900 disabled:text-gray-300 disabled:cursor-not-allowed"
              >
                <ChevronRight className="w-5 h-5" />
              </button>
            </div>
          )}
        </>
      )}

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
    </div>
  )
}