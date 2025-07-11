import React, { useState, useEffect, useRef } from 'react'
import { X, TrendingUp, Package, DollarSign, BarChart3, Calendar, Percent, Hash } from 'lucide-react'
import { Segment } from '../lib/supabase'
import { logger } from '../lib/logger'
import { supabase } from '../lib/supabase'
import Chart from 'chart.js/auto'

interface ProductSegmentPerformanceModalProps {
  segment: Segment
  onClose: () => void
}

interface ProductMetrics {
  sellableVelocity: number // Percentage
  lifetimeUnitsSold: number
  lifetimeDaysSellable: number
  costOfInventory: number
  currentUnitsSold: number
  grossReceipts: number[]
  unitsRemaining: number[]
  unitsSold: number[]
  dates: string[]
}

export default function ProductSegmentPerformanceModal({ segment, onClose }: ProductSegmentPerformanceModalProps) {
  const [metrics, setMetrics] = useState<ProductMetrics | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const chartRef = useRef<HTMLCanvasElement>(null)
  const chartInstance = useRef<Chart | null>(null)

  useEffect(() => {
    logger.info('ProductSegmentPerformanceModal mounted', { 
      component: 'ProductSegmentPerformanceModal',
      segmentId: segment.id,
      segmentName: segment.name 
    })
    
    fetchMetrics()
    
    return () => {
      if (chartInstance.current) {
        chartInstance.current.destroy()
      }
    }
  }, [segment])

  const fetchMetrics = async () => {
    setIsLoading(true)
    setError(null)
    
    try {
      // Build WHERE clause from segment criteria
      const whereClause = segment.where_clause || buildWhereClause(segment.criteria?.filterGroups || [])
      
      // Fetch aggregated metrics
      const metricsResponse = await supabase.functions.invoke('snowflake', {
        body: {
          sql: `
            SELECT 
              AVG("Product Sellable Velocity (all time)") as avg_sellable_velocity,
              SUM("Product Units Sold (all time)") as total_units_sold,
              AVG("Product Days Sellable (all time)") as avg_days_sellable,
              SUM("Cost of Inventory (with Excise)") as total_cost,
              SUM("Product Units Sold") as current_units_sold
            FROM RETAIL_ANALYTICS.DBT_RETAIL_ANALYTICS.RA_PRODUCT_SALES_AND_INVENTORY_V1
            WHERE "Org Id" = '0273cbe1-667c-4421-a875-d65afff0280b'
              ${whereClause ? `AND ${whereClause}` : ''}
          `,
          database: 'RETAIL_ANALYTICS',
          warehouse: 'RETAIL_ANALYTICS'
        }
      })

      if (metricsResponse.error) {
        throw new Error(metricsResponse.error.message)
      }

      const metricsData = metricsResponse.data?.data?.data?.[0] || []
      
      // Fetch time series data for the chart
      const timeSeriesResponse = await supabase.functions.invoke('snowflake', {
        body: {
          sql: `
            SELECT 
              "Inventory Date",
              SUM("Product Gross Receipts") as gross_receipts,
              SUM("Product Units Remaining") as units_remaining,
              SUM("Product Units Sold") as units_sold
            FROM RETAIL_ANALYTICS.DBT_RETAIL_ANALYTICS.RA_PRODUCT_SALES_AND_INVENTORY_V1
            WHERE "Org Id" = '0273cbe1-667c-4421-a875-d65afff0280b'
              ${whereClause ? `AND ${whereClause}` : ''}
              AND "Inventory Date" >= DATEADD(day, -30, CURRENT_DATE())
            GROUP BY "Inventory Date"
            ORDER BY "Inventory Date"
          `,
          database: 'RETAIL_ANALYTICS',
          warehouse: 'RETAIL_ANALYTICS'
        }
      })

      if (timeSeriesResponse.error) {
        throw new Error(timeSeriesResponse.error.message)
      }

      const timeSeriesData = timeSeriesResponse.data?.data?.data || []
      
      // Process the data
      const processedMetrics: ProductMetrics = {
        sellableVelocity: parseFloat(metricsData[0]) || 0,
        lifetimeUnitsSold: parseInt(metricsData[1]) || 0,
        lifetimeDaysSellable: parseInt(metricsData[2]) || 0,
        costOfInventory: parseFloat(metricsData[3]) || 0,
        currentUnitsSold: parseInt(metricsData[4]) || 0,
        dates: timeSeriesData.map((row: any[]) => formatDate(row[0])),
        grossReceipts: timeSeriesData.map((row: any[]) => parseFloat(row[1]) || 0),
        unitsRemaining: timeSeriesData.map((row: any[]) => parseInt(row[2]) || 0),
        unitsSold: timeSeriesData.map((row: any[]) => parseInt(row[3]) || 0)
      }
      
      setMetrics(processedMetrics)
      
      // Create chart after metrics are set
      setTimeout(() => createChart(processedMetrics), 100)
      
    } catch (error) {
      logger.error('Failed to fetch product metrics', { 
        component: 'ProductSegmentPerformanceModal', 
        error,
        segmentId: segment.id 
      })
      setError('Failed to load performance data')
    } finally {
      setIsLoading(false)
    }
  }

  const buildWhereClause = (filterGroups: any[]): string => {
    // Similar to ProductSegmentForm buildWhereClause
    const groupClauses = filterGroups
      .filter(group => group.rules.some((rule: any) => rule.field && rule.value))
      .map(group => {
        const ruleClauses = group.rules
          .filter((rule: any) => rule.field && rule.value)
          .map((rule: any) => {
            const field = mapFieldToColumn(rule.field)
            const operator = rule.operator
            let value = rule.value
            
            if (operator.includes('LIKE')) {
              value = `'%${value}%'`
            } else if (operator === 'IN' || operator === 'NOT IN') {
              const values = String(value).split(',').map(v => `'${v.trim()}'`).join(', ')
              value = `(${values})`
            } else if (rule.valueType === 'text' || rule.valueType === 'select') {
              value = `'${value}'`
            }
            
            return `"${field}" ${operator} ${value}`
          })
        
        return ruleClauses.length > 0 ? `(${ruleClauses.join(` ${group.logic} `)})` : ''
      })
      .filter(clause => clause)
    
    return groupClauses.join(' OR ')
  }

  const mapFieldToColumn = (field: string): string => {
    const mapping: Record<string, string> = {
      'STORE_NAME': 'Store Name',
      'PRODUCT_BRAND': 'Product Brand',
      'PRODUCT_TYPE': 'Product Type',
      'PRODUCT_SUB_TYPE': 'Product Sub Type',
      'PRODUCT_LINE': 'Product Line',
      'PRODUCT_LINE_WITH_CLASSIFICATION': 'Product Line (with Classification)',
      'PRODUCT_LINE_BRAND_TYPE': 'Product Line (Brand - Product Type)',
      'CURRENT_RETAIL_PRICE': 'Current Retail Price',
      'SIZE_DISPLAY': 'Size (display)',
      'DISTRIBUTOR_NAME': 'Distributor Name'
    }
    return mapping[field] || field
  }

  const formatDate = (dateStr: string): string => {
    const date = new Date(dateStr)
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
  }

  const formatCurrency = (value: number): string => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(value)
  }

  const createChart = (data: ProductMetrics) => {
    if (!chartRef.current) return

    // Destroy existing chart
    if (chartInstance.current) {
      chartInstance.current.destroy()
    }

    const ctx = chartRef.current.getContext('2d')
    if (!ctx) return

    chartInstance.current = new Chart(ctx, {
      type: 'line',
      data: {
        labels: data.dates,
        datasets: [
          {
            label: 'Gross Receipts',
            data: data.grossReceipts,
            borderColor: 'rgb(99, 102, 241)',
            backgroundColor: 'rgba(99, 102, 241, 0.1)',
            yAxisID: 'y-revenue',
            tension: 0.1
          },
          {
            label: 'Units Remaining',
            data: data.unitsRemaining,
            borderColor: 'rgb(34, 197, 94)',
            backgroundColor: 'rgba(34, 197, 94, 0.1)',
            yAxisID: 'y-units',
            tension: 0.1
          },
          {
            label: 'Units Sold',
            data: data.unitsSold,
            borderColor: 'rgb(251, 146, 60)',
            backgroundColor: 'rgba(251, 146, 60, 0.1)',
            yAxisID: 'y-units',
            tension: 0.1
          }
        ]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        interaction: {
          mode: 'index',
          intersect: false,
        },
        plugins: {
          legend: {
            position: 'top',
          },
          title: {
            display: true,
            text: 'Product Performance Trends (Last 30 Days)'
          }
        },
        scales: {
          x: {
            display: true,
            title: {
              display: true,
              text: 'Date'
            }
          },
          'y-revenue': {
            type: 'linear',
            display: true,
            position: 'left',
            title: {
              display: true,
              text: 'Gross Receipts ($)'
            },
            ticks: {
              callback: function(value) {
                return '$' + value.toLocaleString()
              }
            }
          },
          'y-units': {
            type: 'linear',
            display: true,
            position: 'right',
            title: {
              display: true,
              text: 'Units'
            },
            grid: {
              drawOnChartArea: false,
            },
          }
        }
      }
    })
  }

  return (
    <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-6xl w-full max-h-[90vh] overflow-hidden">
        <div className="sticky top-0 bg-white border-b px-6 py-4 flex justify-between items-center">
          <div>
            <h2 className="text-xl font-semibold">Product Segment Performance</h2>
            <p className="text-sm text-gray-600 mt-1">{segment.name}</p>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600"
          >
            <X className="h-6 w-6" />
          </button>
        </div>

        <div className="p-6 overflow-y-auto max-h-[calc(90vh-5rem)]">
          {isLoading ? (
            <div className="flex items-center justify-center h-64">
              <div className="text-center">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mx-auto"></div>
                <p className="mt-4 text-gray-600">Loading performance data...</p>
              </div>
            </div>
          ) : error ? (
            <div className="bg-red-50 border border-red-200 rounded-md p-4 text-red-700">
              {error}
            </div>
          ) : metrics ? (
            <div className="space-y-6">
              {/* Product Lifetime Metrics */}
              <div>
                <h3 className="text-lg font-medium mb-4">Product Lifetime Metrics</h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="bg-gray-50 rounded-lg p-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm text-gray-600">Sellable Velocity</p>
                        <p className="text-2xl font-semibold mt-1">{metrics.sellableVelocity.toFixed(1)}%</p>
                      </div>
                      <Percent className="h-8 w-8 text-green-500" />
                    </div>
                  </div>
                  
                  <div className="bg-gray-50 rounded-lg p-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm text-gray-600">Lifetime Units Sold</p>
                        <p className="text-2xl font-semibold mt-1">{metrics.lifetimeUnitsSold.toLocaleString()}</p>
                      </div>
                      <Package className="h-8 w-8 text-blue-500" />
                    </div>
                  </div>
                  
                  <div className="bg-gray-50 rounded-lg p-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm text-gray-600">Lifetime Days Sellable</p>
                        <p className="text-2xl font-semibold mt-1">{metrics.lifetimeDaysSellable.toLocaleString()}</p>
                      </div>
                      <Calendar className="h-8 w-8 text-purple-500" />
                    </div>
                  </div>
                </div>
              </div>

              {/* Current Period Metrics */}
              <div>
                <h3 className="text-lg font-medium mb-4">Current Period Metrics</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="bg-gray-50 rounded-lg p-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm text-gray-600">Cost of Inventory</p>
                        <p className="text-2xl font-semibold mt-1">{formatCurrency(metrics.costOfInventory)}</p>
                      </div>
                      <DollarSign className="h-8 w-8 text-red-500" />
                    </div>
                  </div>
                  
                  <div className="bg-gray-50 rounded-lg p-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm text-gray-600">Units Sold</p>
                        <p className="text-2xl font-semibold mt-1">{metrics.currentUnitsSold.toLocaleString()}</p>
                      </div>
                      <Hash className="h-8 w-8 text-orange-500" />
                    </div>
                  </div>
                </div>
              </div>

              {/* Performance Chart */}
              <div>
                <h3 className="text-lg font-medium mb-4">Performance Trends</h3>
                <div className="bg-gray-50 rounded-lg p-4" style={{ height: '400px' }}>
                  <canvas ref={chartRef}></canvas>
                </div>
              </div>

              {/* Segment Details */}
              <div>
                <h3 className="text-lg font-medium mb-4">Segment Information</h3>
                <div className="bg-gray-50 rounded-lg p-4 space-y-2">
                  <div className="flex justify-between">
                    <span className="text-sm text-gray-600">Total Products in Segment</span>
                    <span className="text-sm font-medium">{segment.product_count?.toLocaleString() || 0}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-gray-600">Segment Type</span>
                    <span className="text-sm font-medium capitalize">{segment.type}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-gray-600">Created</span>
                    <span className="text-sm font-medium">
                      {new Date(segment.created_at).toLocaleDateString()}
                    </span>
                  </div>
                  {segment.description && (
                    <div className="pt-2 border-t">
                      <p className="text-sm text-gray-600">Description</p>
                      <p className="text-sm mt-1">{segment.description}</p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          ) : null}
        </div>
      </div>
    </div>
  )
}