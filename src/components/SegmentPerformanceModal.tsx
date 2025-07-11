import React, { useState, useEffect } from 'react'
import { X, TrendingUp, DollarSign, ShoppingCart, Calendar, Filter } from 'lucide-react'
import { Segment } from '../lib/supabase'
import { supabase } from '../lib/supabase'
import { logger } from '../lib/logger'
import { Line } from 'react-chartjs-2'
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  ChartOptions
} from 'chart.js'

// Register ChartJS components
ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend
)

interface SegmentPerformanceModalProps {
  segment: Segment
  onClose: () => void
}

interface CustomerMetrics {
  totalCustomers: number
  avgLifetimeGrossReceipts: number
  totalLifetimeGrossReceipts: number
  avgLifetimeTransactions: number
  totalLifetimeTransactions: number
  avgLifetimeDiscounts: number
  totalLifetimeDiscounts: number
}

interface SalesMetrics {
  totalSales: number
  avgOrderValue: number
  totalDiscounts: number
  transactionCount: number
}

interface TrendData {
  date: string
  sales: number
  aov: number
  discounts: number
  transactions: number
}

export function SegmentPerformanceModal({ segment, onClose }: SegmentPerformanceModalProps) {
  const [loading, setLoading] = useState(true)
  const [customerMetrics, setCustomerMetrics] = useState<CustomerMetrics | null>(null)
  const [salesMetrics, setSalesMetrics] = useState<SalesMetrics | null>(null)
  const [trendData, setTrendData] = useState<TrendData[]>([])
  
  // Filters
  const [dateRange, setDateRange] = useState(30) // Default 30 days
  const [productBrand, setProductBrand] = useState('')
  const [productType, setProductType] = useState('')
  const [productSubtype, setProductSubtype] = useState('')
  
  // Available filter options
  const [brands, setBrands] = useState<string[]>([])
  const [types, setTypes] = useState<string[]>([])
  const [subtypes, setSubtypes] = useState<string[]>([])

  useEffect(() => {
    loadPerformanceData()
  }, [segment, dateRange, productBrand, productType, productSubtype])

  const loadPerformanceData = async () => {
    setLoading(true)
    try {
      // Load all data in parallel
      await Promise.all([
        loadCustomerMetrics(),
        loadSalesMetrics(),
        loadTrendData(),
        loadFilterOptions()
      ])
    } catch (error) {
      console.error('[SegmentPerformance] Error loading data:', error)
      logger.error('Failed to load segment performance data', {
        component: 'SegmentPerformanceModal',
        segmentId: segment.id,
        error
      })
    } finally {
      setLoading(false)
    }
  }

  const loadCustomerMetrics = async () => {
    try {
      // Build the base WHERE clause for the segment
      const whereClause = segment.where_clause || ''
      
      const sql = `
        SELECT 
          COUNT(*) as total_customers,
          AVG(LIFETIME_GROSS_RECEIPTS) as avg_lifetime_gross_receipts,
          SUM(LIFETIME_GROSS_RECEIPTS) as total_lifetime_gross_receipts,
          AVG(LIFETIME_TRANSACTIONS) as avg_lifetime_transactions,
          SUM(LIFETIME_TRANSACTIONS) as total_lifetime_transactions,
          AVG(LIFETIME_DISCOUNTS) as avg_lifetime_discounts,
          SUM(LIFETIME_DISCOUNTS) as total_lifetime_discounts
        FROM RETAIL_ANALYTICS.DBT_CUSTOMER.CUSTOMER_FACT
        WHERE ORG_ID = '0273cbe1-667c-4421-a875-d65afff0280b'
        ${whereClause ? `AND (${whereClause})` : ''}
      `
      
      console.log('[SegmentPerformance] Customer metrics query:', sql)
      
      const response = await supabase.functions.invoke('snowflake', {
        body: {
          sql,
          database: 'RETAIL_ANALYTICS',
          warehouse: 'RETAIL_ANALYTICS'
        }
      })

      if (response.error) throw response.error

      const data = response.data?.data?.data?.[0]
      if (data) {
        setCustomerMetrics({
          totalCustomers: parseInt(data[0]) || 0,
          avgLifetimeGrossReceipts: parseFloat(data[1]) || 0,
          totalLifetimeGrossReceipts: parseFloat(data[2]) || 0,
          avgLifetimeTransactions: parseFloat(data[3]) || 0,
          totalLifetimeTransactions: parseInt(data[4]) || 0,
          avgLifetimeDiscounts: parseFloat(data[5]) || 0,
          totalLifetimeDiscounts: parseFloat(data[6]) || 0
        })
      }
    } catch (error) {
      console.error('[SegmentPerformance] Error loading customer metrics:', error)
    }
  }

  const loadSalesMetrics = async () => {
    try {
      // Build WHERE clause with customer filter from segment
      const dateFilter = `DATE_CLOSE >= DATEADD(day, -${dateRange}, CURRENT_DATE())`
      const productFilters = []
      if (productBrand) productFilters.push(`PRODUCT_BRAND = '${productBrand}'`)
      if (productType) productFilters.push(`PRODUCT_TYPE = '${productType}'`)
      if (productSubtype) productFilters.push(`PRODUCT_SUBTYPE = '${productSubtype}'`)
      
      const sql = `
        SELECT 
          SUM(s.GROSS_RECEIPTS) as total_sales,
          COUNT(DISTINCT s.TICKET_ID) as transaction_count,
          SUM(s.GROSS_RECEIPTS) / NULLIF(COUNT(DISTINCT s.TICKET_ID), 0) as aov,
          SUM(s.DISCOUNTS) as total_discounts
        FROM RETAIL_ANALYTICS.DBT_TICKET.TICKETLINE_SALES s
        INNER JOIN RETAIL_ANALYTICS.DBT_CUSTOMER.CUSTOMER_FACT c
          ON s.ORG_ID = c.ORG_ID 
          AND s.STORE_ID = c.STORE_ID 
          AND s.CUSTOMER_ID = c.CUSTOMER_ID
        WHERE s.ORG_ID = '0273cbe1-667c-4421-a875-d65afff0280b'
          AND ${dateFilter}
          ${segment.where_clause ? `AND (${segment.where_clause})` : ''}
          ${productFilters.length > 0 ? `AND ${productFilters.join(' AND ')}` : ''}
      `
      
      console.log('[SegmentPerformance] Sales metrics query:', sql)
      
      const response = await supabase.functions.invoke('snowflake', {
        body: {
          sql,
          database: 'RETAIL_ANALYTICS',
          warehouse: 'RETAIL_ANALYTICS'
        }
      })

      if (response.error) throw response.error

      const data = response.data?.data?.data?.[0]
      if (data) {
        setSalesMetrics({
          totalSales: parseFloat(data[0]) || 0,
          transactionCount: parseInt(data[1]) || 0,
          avgOrderValue: parseFloat(data[2]) || 0,
          totalDiscounts: parseFloat(data[3]) || 0
        })
      }
    } catch (error) {
      console.error('[SegmentPerformance] Error loading sales metrics:', error)
    }
  }

  const loadTrendData = async () => {
    try {
      const dateFilter = `DATE_CLOSE >= DATEADD(day, -${dateRange}, CURRENT_DATE())`
      const productFilters = []
      if (productBrand) productFilters.push(`PRODUCT_BRAND = '${productBrand}'`)
      if (productType) productFilters.push(`PRODUCT_TYPE = '${productType}'`)
      if (productSubtype) productFilters.push(`PRODUCT_SUBTYPE = '${productSubtype}'`)
      
      const sql = `
        SELECT 
          DATE(s.DATE_CLOSE) as sale_date,
          SUM(s.GROSS_RECEIPTS) as daily_sales,
          COUNT(DISTINCT s.TICKET_ID) as daily_transactions,
          SUM(s.GROSS_RECEIPTS) / NULLIF(COUNT(DISTINCT s.TICKET_ID), 0) as daily_aov,
          SUM(s.DISCOUNTS) as daily_discounts
        FROM RETAIL_ANALYTICS.DBT_TICKET.TICKETLINE_SALES s
        INNER JOIN RETAIL_ANALYTICS.DBT_CUSTOMER.CUSTOMER_FACT c
          ON s.ORG_ID = c.ORG_ID 
          AND s.STORE_ID = c.STORE_ID 
          AND s.CUSTOMER_ID = c.CUSTOMER_ID
        WHERE s.ORG_ID = '0273cbe1-667c-4421-a875-d65afff0280b'
          AND ${dateFilter}
          ${segment.where_clause ? `AND (${segment.where_clause})` : ''}
          ${productFilters.length > 0 ? `AND ${productFilters.join(' AND ')}` : ''}
        GROUP BY DATE(s.DATE_CLOSE)
        ORDER BY sale_date ASC
      `
      
      console.log('[SegmentPerformance] Trend data query:', sql)
      
      const response = await supabase.functions.invoke('snowflake', {
        body: {
          sql,
          database: 'RETAIL_ANALYTICS',
          warehouse: 'RETAIL_ANALYTICS'
        }
      })

      if (response.error) throw response.error

      const data = response.data?.data?.data || []
      const trends: TrendData[] = data.map((row: any[]) => ({
        date: row[0],
        sales: parseFloat(row[1]) || 0,
        transactions: parseInt(row[2]) || 0,
        aov: parseFloat(row[3]) || 0,
        discounts: parseFloat(row[4]) || 0
      }))
      
      setTrendData(trends)
    } catch (error) {
      console.error('[SegmentPerformance] Error loading trend data:', error)
    }
  }

  const loadFilterOptions = async () => {
    try {
      // Load unique filter values
      const sql = `
        SELECT DISTINCT 
          s.PRODUCT_BRAND,
          s.PRODUCT_TYPE,
          s.PRODUCT_SUBTYPE
        FROM RETAIL_ANALYTICS.DBT_TICKET.TICKETLINE_SALES s
        INNER JOIN RETAIL_ANALYTICS.DBT_CUSTOMER.CUSTOMER_FACT c
          ON s.ORG_ID = c.ORG_ID 
          AND s.STORE_ID = c.STORE_ID 
          AND s.CUSTOMER_ID = c.CUSTOMER_ID
        WHERE s.ORG_ID = '0273cbe1-667c-4421-a875-d65afff0280b'
          ${segment.where_clause ? `AND (${segment.where_clause})` : ''}
          AND s.DATE_CLOSE >= DATEADD(day, -90, CURRENT_DATE())
        LIMIT 1000
      `
      
      const response = await supabase.functions.invoke('snowflake', {
        body: {
          sql,
          database: 'RETAIL_ANALYTICS',
          warehouse: 'RETAIL_ANALYTICS'
        }
      })

      if (response.error) throw response.error

      const data = response.data?.data?.data || []
      const uniqueBrands = new Set<string>()
      const uniqueTypes = new Set<string>()
      const uniqueSubtypes = new Set<string>()
      
      data.forEach((row: any[]) => {
        if (row[0]) uniqueBrands.add(row[0])
        if (row[1]) uniqueTypes.add(row[1])
        if (row[2]) uniqueSubtypes.add(row[2])
      })
      
      setBrands(Array.from(uniqueBrands).sort())
      setTypes(Array.from(uniqueTypes).sort())
      setSubtypes(Array.from(uniqueSubtypes).sort())
    } catch (error) {
      console.error('[SegmentPerformance] Error loading filter options:', error)
    }
  }

  // Chart configuration
  const chartOptions: ChartOptions<'line'> = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: 'top' as const,
      },
      tooltip: {
        mode: 'index',
        intersect: false,
      }
    },
    scales: {
      y: {
        beginAtZero: true,
        ticks: {
          callback: function(value) {
            return '$' + value.toLocaleString()
          }
        }
      }
    }
  }

  const salesChartData = {
    labels: trendData.map(d => new Date(d.date).toLocaleDateString()),
    datasets: [
      {
        label: 'Daily Sales',
        data: trendData.map(d => d.sales),
        borderColor: 'rgb(147, 51, 234)',
        backgroundColor: 'rgba(147, 51, 234, 0.5)',
        tension: 0.1
      },
      {
        label: 'Average Order Value',
        data: trendData.map(d => d.aov),
        borderColor: 'rgb(59, 130, 246)',
        backgroundColor: 'rgba(59, 130, 246, 0.5)',
        tension: 0.1
      },
      {
        label: 'Discounts',
        data: trendData.map(d => d.discounts),
        borderColor: 'rgb(239, 68, 68)',
        backgroundColor: 'rgba(239, 68, 68, 0.5)',
        tension: 0.1
      }
    ]
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-xl shadow-xl max-w-6xl w-full max-h-[90vh] overflow-y-auto">
        <div className="sticky top-0 bg-white border-b border-gray-200 p-6 flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold text-gray-900">{segment.name} Performance</h2>
            <p className="text-sm text-gray-600 mt-1">{segment.description}</p>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 space-y-6">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600"></div>
            </div>
          ) : (
            <>
              {/* Customer Lifetime Metrics */}
              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Customer Lifetime Metrics</h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="bg-gray-50 rounded-lg p-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm text-gray-600">Total Lifetime Revenue</p>
                        <p className="text-2xl font-bold text-gray-900">
                          ${customerMetrics?.totalLifetimeGrossReceipts.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </p>
                        <p className="text-xs text-gray-500 mt-1">
                          Avg: ${customerMetrics?.avgLifetimeGrossReceipts.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </p>
                      </div>
                      <DollarSign className="w-8 h-8 text-green-600" />
                    </div>
                  </div>

                  <div className="bg-gray-50 rounded-lg p-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm text-gray-600">Total Lifetime Transactions</p>
                        <p className="text-2xl font-bold text-gray-900">
                          {customerMetrics?.totalLifetimeTransactions.toLocaleString()}
                        </p>
                        <p className="text-xs text-gray-500 mt-1">
                          Avg: {customerMetrics?.avgLifetimeTransactions.toFixed(1)}
                        </p>
                      </div>
                      <ShoppingCart className="w-8 h-8 text-blue-600" />
                    </div>
                  </div>

                  <div className="bg-gray-50 rounded-lg p-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm text-gray-600">Total Lifetime Discounts</p>
                        <p className="text-2xl font-bold text-gray-900">
                          ${customerMetrics?.totalLifetimeDiscounts.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </p>
                        <p className="text-xs text-gray-500 mt-1">
                          Avg: ${customerMetrics?.avgLifetimeDiscounts.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </p>
                      </div>
                      <TrendingUp className="w-8 h-8 text-purple-600" />
                    </div>
                  </div>
                </div>
              </div>

              {/* Filters */}
              <div className="border-t pt-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Sales Analysis</h3>
                <div className="grid grid-cols-1 md:grid-cols-5 gap-4 mb-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Date Range
                    </label>
                    <select
                      value={dateRange}
                      onChange={(e) => setDateRange(Number(e.target.value))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                    >
                      <option value={7}>Last 7 days</option>
                      <option value={30}>Last 30 days</option>
                      <option value={60}>Last 60 days</option>
                      <option value={90}>Last 90 days</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Product Brand
                    </label>
                    <select
                      value={productBrand}
                      onChange={(e) => setProductBrand(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                    >
                      <option value="">All Brands</option>
                      {brands.map(brand => (
                        <option key={brand} value={brand}>{brand}</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Product Type
                    </label>
                    <select
                      value={productType}
                      onChange={(e) => setProductType(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                    >
                      <option value="">All Types</option>
                      {types.map(type => (
                        <option key={type} value={type}>{type}</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Product Subtype
                    </label>
                    <select
                      value={productSubtype}
                      onChange={(e) => setProductSubtype(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                    >
                      <option value="">All Subtypes</option>
                      {subtypes.map(subtype => (
                        <option key={subtype} value={subtype}>{subtype}</option>
                      ))}
                    </select>
                  </div>

                  <div className="flex items-end">
                    <button
                      onClick={() => {
                        setProductBrand('')
                        setProductType('')
                        setProductSubtype('')
                      }}
                      className="w-full px-4 py-2 text-sm text-gray-600 hover:text-gray-900 border border-gray-300 rounded-lg hover:bg-gray-50"
                    >
                      Clear Filters
                    </button>
                  </div>
                </div>

                {/* Sales Metrics */}
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
                  <div className="bg-gray-50 rounded-lg p-4">
                    <p className="text-sm text-gray-600">Total Sales</p>
                    <p className="text-2xl font-bold text-gray-900">
                      ${salesMetrics?.totalSales.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </p>
                  </div>

                  <div className="bg-gray-50 rounded-lg p-4">
                    <p className="text-sm text-gray-600">Transactions</p>
                    <p className="text-2xl font-bold text-gray-900">
                      {salesMetrics?.transactionCount.toLocaleString()}
                    </p>
                  </div>

                  <div className="bg-gray-50 rounded-lg p-4">
                    <p className="text-sm text-gray-600">Average Order Value</p>
                    <p className="text-2xl font-bold text-gray-900">
                      ${salesMetrics?.avgOrderValue.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </p>
                  </div>

                  <div className="bg-gray-50 rounded-lg p-4">
                    <p className="text-sm text-gray-600">Total Discounts</p>
                    <p className="text-2xl font-bold text-gray-900">
                      ${salesMetrics?.totalDiscounts.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </p>
                  </div>
                </div>

                {/* Trend Chart */}
                {trendData.length > 0 && (
                  <div className="bg-gray-50 rounded-lg p-4">
                    <h4 className="text-md font-medium text-gray-900 mb-4">Sales Trends</h4>
                    <div style={{ height: '300px' }}>
                      <Line data={salesChartData} options={chartOptions} />
                    </div>
                  </div>
                )}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  )
}