import React, { useState, useEffect } from 'react'
import { Plus, Edit, Trash2, Users, TrendingUp, ChevronLeft, ChevronRight } from 'lucide-react'
import { segmentsAPI, snowflakeAPI } from '../lib/api'
import { Segment } from '../lib/supabase'
import { SegmentForm } from '../components/SegmentForm'
import { SegmentPerformanceModal } from '../components/SegmentPerformanceModal'
import { logger } from '../lib/logger'

const ITEMS_PER_PAGE = 8

export function Segments() {
  const [segments, setSegments] = useState<Segment[]>([])
  const [loading, setLoading] = useState(false)
  const [currentPage, setCurrentPage] = useState(1)
  
  // Form states
  const [showSegmentForm, setShowSegmentForm] = useState(false)
  const [editingSegment, setEditingSegment] = useState<Segment | null>(null)
  const [selectedSegmentForPerformance, setSelectedSegmentForPerformance] = useState<Segment | null>(null)

  useEffect(() => {
    loadSegments()
  }, [])

  const loadSegments = async () => {
    logger.info('Loading segments', { component: 'Segments' })
    setLoading(true)
    
    try {
      const data = await segmentsAPI.getAll()
      
      // Update customer counts for each segment using real Snowflake data
      const segmentsWithUpdatedCounts = await Promise.all(
        data.map(async (segment) => {
          try {
            if (segment.where_clause) {
              console.log(`[Segments] Updating count for segment: ${segment.name}`)
              const result = await snowflakeAPI.getCustomerCount(segment.where_clause)
              return {
                ...segment,
                customer_count: result.count
              }
            }
            return segment
          } catch (error) {
            console.error(`[Segments] Failed to update count for segment ${segment.name}:`, error)
            return segment // Return original segment if count update fails
          }
        })
      )
      
      setSegments(segmentsWithUpdatedCounts)
      
      logger.info('Segments loaded with updated counts', {
        component: 'Segments',
        count: data.length
      })
    } catch (error) {
      logger.error('Failed to load segments', {
        component: 'Segments'
      }, error as Error)
    } finally {
      setLoading(false)
    }
  }

  const handleCreateSegment = async (segmentData: Omit<Segment, 'id' | 'created_at' | 'updated_at'>) => {
    logger.info('Creating segment', {
      component: 'Segments',
      action: 'create',
      segmentName: segmentData.name
    })
    
    try {
      const newSegment = await segmentsAPI.create(segmentData)
      setSegments(prev => [newSegment, ...prev])
      setShowSegmentForm(false)
      
      logger.info('Segment created successfully', {
        component: 'Segments',
        segmentId: newSegment.id
      })
    } catch (error) {
      logger.error('Failed to create segment', {
        component: 'Segments',
        action: 'create'
      }, error as Error)
    }
  }

  const handleUpdateSegment = async (id: string, segmentData: Omit<Segment, 'id' | 'created_at' | 'updated_at' | 'user_id'>) => {
    logger.info('Updating segment', {
      component: 'Segments',
      action: 'update',
      segmentId: id
    })
    
    try {
      const updatedSegment = await segmentsAPI.update(id, segmentData)
      setSegments(prev => prev.map(s => s.id === id ? updatedSegment : s))
      setEditingSegment(null)
      
      logger.info('Segment updated successfully', {
        component: 'Segments',
        segmentId: id
      })
    } catch (error) {
      logger.error('Failed to update segment', {
        component: 'Segments',
        action: 'update',
        segmentId: id
      }, error as Error)
    }
  }

  const handleDeleteSegment = async (id: string) => {
    if (!confirm('Are you sure you want to delete this segment?')) return
    
    logger.info('Deleting segment', {
      component: 'Segments',
      action: 'delete',
      segmentId: id
    })
    
    try {
      await segmentsAPI.delete(id)
      setSegments(prev => prev.filter(s => s.id !== id))
      
      // Adjust current page if needed
      const newTotalPages = Math.ceil((segments.length - 1) / ITEMS_PER_PAGE)
      if (currentPage > newTotalPages && newTotalPages > 0) {
        setCurrentPage(newTotalPages)
      }
      
      logger.info('Segment deleted successfully', {
        component: 'Segments',
        segmentId: id
      })
    } catch (error) {
      logger.error('Failed to delete segment', {
        component: 'Segments',
        action: 'delete',
        segmentId: id
      }, error as Error)
    }
  }

  // Pagination calculations
  const totalPages = Math.ceil(segments.length / ITEMS_PER_PAGE)
  const startIndex = (currentPage - 1) * ITEMS_PER_PAGE
  const endIndex = startIndex + ITEMS_PER_PAGE
  const currentSegments = segments.slice(startIndex, endIndex)

  const handlePageChange = (page: number) => {
    setCurrentPage(page)
    logger.debug('Page changed', {
      component: 'Segments',
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
        <h2 className="text-2xl font-bold text-gray-900">Customer Segments</h2>
        <button
          onClick={() => setShowSegmentForm(true)}
          className="bg-gradient-to-r from-purple-600 to-pink-600 text-white px-4 py-2 rounded-lg font-medium hover:from-purple-700 hover:to-pink-700 transition-all duration-200 flex items-center gap-2"
        >
          <Plus className="w-4 h-4" />
          New Segment
        </button>
      </div>

      {segments.length === 0 ? (
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
      ) : (
        <>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {currentSegments.map((segment) => (
              <div 
                key={segment.id} 
                className="bg-white rounded-xl shadow-sm p-6 border border-gray-100 cursor-pointer hover:shadow-md transition-shadow"
                onClick={() => setSelectedSegmentForPerformance(segment)}
              >
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
                      onClick={(e) => {
                        e.stopPropagation()
                        setEditingSegment(segment)
                      }}
                      className="p-1 text-gray-400 hover:text-gray-600"
                    >
                      <Edit className="w-4 h-4" />
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation()
                        handleDeleteSegment(segment.id)
                      }}
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

      {/* Segment Form Modal */}
      {(showSegmentForm || editingSegment) && (
        <SegmentForm
          segment={editingSegment}
          onSave={editingSegment ?
            (segmentData) => handleUpdateSegment(editingSegment.id, segmentData) :
            handleCreateSegment
          }
          onCancel={() => {
            setShowSegmentForm(false)
            setEditingSegment(null)
          }}
        />
      )}

      {/* Segment Performance Modal */}
      {selectedSegmentForPerformance && (
        <SegmentPerformanceModal
          segment={selectedSegmentForPerformance}
          onClose={() => setSelectedSegmentForPerformance(null)}
        />
      )}
    </div>
  )
}