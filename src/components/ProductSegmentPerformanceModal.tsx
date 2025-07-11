import React, { useState, useEffect, useRef } from 'react'
import { X, Package, DollarSign, Calendar, Percent, Hash, Filter, ChevronDown } from 'lucide-react'
import { Segment } from '../lib/supabase'
import { logger } from '../lib/logger'
import { supabase } from '../lib/supabase'
import Chart from 'chart.js/auto'

interface ProductSegmentPerformanceModalProps {
  segment: Segment
  onClose: () => void
}

interface ProductMetrics {
  avgSellableVelocity: number // Percentage (average)
  avgLifetimeUnitsSold: number // Average
  avgLifetimeDaysSellable: number // Average
  avgCostOfInventory: number // Average
  currentUnitsSold: number
  grossReceipts: number[]
  unitsRemaining: number[]
  unitsSold: number[]
  dates: string[]
}

interface ProductFilters {
  productBrand?: string
  productType?: string
  productSubtype?: string
  dateRange: number // days
}

export default function ProductSegmentPerformanceModal({ segment, onClose }: ProductSegmentPerformanceModalProps) {
  const [metrics, setMetrics] = useState<ProductMetrics | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [filters, setFilters] = useState<ProductFilters>({ dateRange: 30 })
  const [showFilters, setShowFilters] = useState(false)
  const [availableFilters, setAvailableFilters] = useState<{
    brands: string[]
    types: string[]
    subtypes: string[]
  }>({ brands: [], types: [], subtypes: [] })
  
  const chartRef = useRef<HTMLCanvasElement>(null)
  const chartInstance = useRef<Chart | null>(null)

  useEffect(() => {
    logger.info('ProductSegmentPerformanceModal mounted', { 
      component: 'ProductSegmentPerformanceModal',
      segmentId: segment.id,
      segmentName: segment.name 
    })
    
    fetchAvailableFilters()
    fetchMetrics()
    
    return () => {
      if (chartInstance.current) {
        chartInstance.current.destroy()
      }
    }
  }, [segment])

  useEffect(() => {
    fetchMetrics()
  }, [filters])

  const fetchAvailableFilters = async () => {
    try {
      const whereClause = segment.where_clause || buildWhereClause(segment.criteria?.filterGroups || [])
      
      // Fetch distinct values for filters
      const [brandsRes, typesRes, subtypesRes] = await Promise.all([
        supabase.functions.invoke('snowflake', {
          body: {
            sql: `
              SELECT DISTINCT "Product Brand" 
              FROM RETAIL_ANALYTICS.DBT_RETAIL_ANALYTICS.RA_PRODUCT_SALES_AND_INVENTORY_V1
              WHERE "Org Id" = '0273cbe1-667c-4421-a875-d65afff0280b'
                ${whereClause ? `AND ${whereClause}` : ''}
                AND "Product Brand" IS NOT NULL
              ORDER BY "Product Brand"
              LIMIT 50
            `,
            database: 'RETAIL_ANALYTICS',
            warehouse: 'RETAIL_ANALYTICS'
          }
        }),
        supabase.functions.invoke('snowflake', {
          body: {
            sql: `
              SELECT DISTINCT "Product Type" 
              FROM RETAIL_ANALYTICS.DBT_RETAIL_ANALYTICS.RA_PRODUCT_SALES_AND_INVENTORY_V1
              WHERE "Org Id" = '0273cbe1-667c-4421-a875-d65afff0280b'
                ${whereClause ? `AND ${whereClause}` : ''}
                AND "Product Type" IS NOT NULL
              ORDER BY "Product Type"
              LIMIT 50
            `,
            database: 'RETAIL_ANALYTICS',
            warehouse: 'RETAIL_ANALYTICS'
          }
        }),
        supabase.functions.invoke('snowflake', {
          body: {
            sql: `
              SELECT DISTINCT "Product Sub Type" 
              FROM RETAIL_ANALYTICS.DBT_RETAIL_ANALYTICS.RA_PRODUCT_SALES_AND_INVENTORY_V1
              WHERE "Org Id" = '0273cbe1-667c-4421-a875-d65afff0280b'
                ${whereClause ? `AND ${whereClause}` : ''}
                AND "Product Sub Type" IS NOT NULL
              ORDER BY "Product Sub Type"
              LIMIT 50
            `,
            database: 'RETAIL_ANALYTICS',
            warehouse: 'RETAIL_ANALYTICS'
          }
        })
      ])

      setAvailableFilters({
        brands: brandsRes.data?.data?.data?.map((row: any) => row[0]) || [],
        types: typesRes.data?.data?.data?.map((row: any) => row[0]) || [],
        subtypes: subtypesRes.data?.data?.data?.map((row: any) => row[0]) || []
      })
    } catch (error) {
      logger.error('Failed to fetch available filters', { error })
    }
  }

  const fetchMetrics = async () => {
    setIsLoading(true)
    setError(null)
    
    try {
      // Build WHERE clause from segment criteria
      const segmentWhereClause = segment.where_clause || buildWhereClause(segment.criteria?.filterGroups || [])
      
      // Add filter conditions
      let filterConditions = []
      if (filters.productBrand) {
        filterConditions.push(`"Product Brand" = '${filters.productBrand}'`)
      }
      if (filters.productType) {
        filterConditions.push(`"Product Type" = '${filters.productType}'`)
      }
      if (filters.productSubtype) {
        filterConditions.push(`"Product Sub Type" = '${filters.productSubtype}'`)
      }
      
      const filterWhereClause = filterConditions.length > 0 ? `AND ${filterConditions.join(' AND ')}` : ''
      
      // Fetch aggregated metrics (AVERAGES for lifetime metrics)
      const metricsResponse = await supabase.functions.invoke('snowflake', {
        body: {
          sql: `
            SELECT 
              AVG("Product Sellable Velocity (all time)") as avg_sellable_velocity,
              AVG("Product Units Sold (all time)") as avg_lifetime_units_sold,
              AVG("Product Days Sellable (all time)") as avg_days_sellable,
              AVG("Cost of Inventory (with Excise)") as avg_cost,
              SUM("Product Units Sold") as current_units_sold
            FROM RETAIL_ANALYTICS.DBT_RETAIL_ANALYTICS.RA_PRODUCT_SALES_AND_INVENTORY_V1
            WHERE "Org Id" = '0273cbe1-667c-4421-a875-d65afff0280b'
              ${segmentWhereClause ? `AND ${segmentWhereClause}` : ''}
              ${filterWhereClause}
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
              DATE("Inventory Date") as inventory_date,
              SUM("Product Gross Receipts") as gross_receipts,
              SUM("Product Units Remaining") as units_remaining,
              SUM("Product Units Sold") as units_sold
            FROM RETAIL_ANALYTICS.DBT_RETAIL_ANALYTICS.RA_PRODUCT_SALES_AND_INVENTORY_V1
            WHERE "Org Id" = '0273cbe1-667c-4421-a875-d65afff0280b'
              ${segmentWhereClause ? `AND ${segmentWhereClause}` : ''}
              ${filterWhereClause}
              AND "Inventory Date" >= DATEADD(day, -${filters.dateRange}, CURRENT_DATE())
            GROUP BY DATE("Inventory Date")
            ORDER BY inventory_date
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
        avgSellableVelocity: parseFloat(metricsData[0]) || 0,
        avgLifetimeUnitsSold: parseFloat(metricsData[1]) || 0,
        avgLifetimeDaysSellable: parseFloat(metricsData[2]) || 0,
        avgCostOfInventory: parseFloat(metricsData[3]) || 0,
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
    if (!dateStr) return ''
    
    // Handle Snowflake date format (YYYY-MM-DD)
    // Create date at noon UTC to avoid timezone issues
    const [year, month, day] = dateStr.split(/[-T]/).slice(0, 3)
    const date = new Date(Date.UTC(parseInt(year), parseInt(month) - 1, parseInt(day), 12, 0, 0))
    
    if (isNaN(date.getTime())) {
      console.warn('Invalid date:', dateStr)
      return dateStr
    }
    
    return date.toLocaleDateString('en-US', { 
      month: 'short', 
      day: 'numeric',
      timeZone: 'UTC'
    })
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
            text: `Product Performance Trends (Last ${filters.dateRange} Days)`
          }
        },
        scales: {
          x: {
            display: true,
            title: {
              display: true,
              text: 'Inventory Date'
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
          {/* Filters */}
          <div className="mb-6">
            <button
              onClick={() => setShowFilters(!showFilters)}
              className="flex items-center gap-2 text-sm text-gray-600 hover:text-gray-900"
            >
              <Filter className="h-4 w-4" />
              <span>Filters</span>
              <ChevronDown className={`h-4 w-4 transition-transform ${showFilters ? 'rotate-180' : ''}`} />
            </button>
            
            {showFilters && (
              <div className="mt-4 grid grid-cols-1 md:grid-cols-4 gap-4 p-4 bg-gray-50 rounded-lg">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Product Brand
                  </label>
                  <select
                    value={filters.productBrand || ''}
                    onChange={(e) => setFilters({ ...filters, productBrand: e.target.value || undefined })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
                  >
                    <option value="">All Brands</option>
                    {availableFilters.brands.map(brand => (
                      <option key={brand} value={brand}>{brand}</option>
                    ))}
                  </select>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Product Type
                  </label>
                  <select
                    value={filters.productType || ''}
                    onChange={(e) => setFilters({ ...filters, productType: e.target.value || undefined })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
                  >
                    <option value="">All Types</option>
                    {availableFilters.types.map(type => (
                      <option key={type} value={type}>{type}</option>
                    ))}
                  </select>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Product Subtype
                  </label>
                  <select
                    value={filters.productSubtype || ''}
                    onChange={(e) => setFilters({ ...filters, productSubtype: e.target.value || undefined })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
                  >
                    <option value="">All Subtypes</option>
                    {availableFilters.subtypes.map(subtype => (
                      <option key={subtype} value={subtype}>{subtype}</option>
                    ))}
                  </select>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Date Range
                  </label>
                  <select
                    value={filters.dateRange}
                    onChange={(e) => setFilters({ ...filters, dateRange: parseInt(e.target.value) })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
                  >
                    <option value={7}>Last 7 days</option>
                    <option value={14}>Last 14 days</option>
                    <option value={30}>Last 30 days</option>
                    <option value={60}>Last 60 days</option>
                    <option value={90}>Last 90 days</option>
                  </select>
                </div>
              </div>
            )}
          </div>

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
              {/* Product Lifetime Metrics (Averages) */}
              <div>
                <h3 className="text-lg font-medium mb-4">Product Lifetime Metrics (Averages)</h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="bg-gray-50 rounded-lg p-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm text-gray-600">Avg. Sellable Velocity</p>
                        <p className="text-2xl font-semibold mt-1">{metrics.avgSellableVelocity.toFixed(1)}%</p>
                      </div>
                      <Percent className="h-8 w-8 text-green-500" />
                    </div>
                  </div>
                  
                  <div className="bg-gray-50 rounded-lg p-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm text-gray-600">Avg. Lifetime Units Sold</p>
                        <p className="text-2xl font-semibold mt-1">{Math.round(metrics.avgLifetimeUnitsSold).toLocaleString()}</p>
                      </div>
                      <Package className="h-8 w-8 text-blue-500" />
                    </div>
                  </div>
                  
                  <div className="bg-gray-50 rounded-lg p-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm text-gray-600">Avg. Lifetime Days Sellable</p>
                        <p className="text-2xl font-semibold mt-1">{Math.round(metrics.avgLifetimeDaysSellable).toLocaleString()}</p>
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
                        <p className="text-sm text-gray-600">Avg. Cost of Inventory</p>
                        <p className="text-2xl font-semibold mt-1">{formatCurrency(metrics.avgCostOfInventory)}</p>
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
            </div>
          ) : null}
        </div>
      </div>
    </div>
  )
}