import React, { useState, useEffect } from 'react'
import { X, Plus, Trash2, Calendar, DollarSign, Mail, ShoppingCart, User, Users, MapPin, Clock, Target } from 'lucide-react'
import { Segment } from '../lib/supabase'
import { logger } from '../lib/logger'
import { snowflakeAPI } from '../lib/api'

interface SegmentFormProps {
  segment?: Segment | null
  onSave: (data: Omit<Segment, 'id' | 'created_at' | 'updated_at'>) => void | Promise<void>
  onCancel: () => void
}

interface FilterRule {
  id: string
  field: string
  operator: string
  value: string | number
  valueType: 'text' | 'number' | 'date' | 'select'
}

interface FilterGroup {
  id: string
  logic: 'AND' | 'OR'
  rules: FilterRule[]
}

const FILTER_FIELDS = {
  customer: [
    { value: 'email', label: 'Email', type: 'text', icon: Mail },
    { value: 'first_name', label: 'First Name', type: 'text', icon: User },
    { value: 'last_name', label: 'Last Name', type: 'text', icon: User },
    { value: 'created_at', label: 'Account Created', type: 'date', icon: Calendar },
    { value: 'last_login', label: 'Last Login', type: 'date', icon: Clock },
    { value: 'last_visit_date', label: 'Last Visit Date', type: 'date', icon: Clock },
    { value: 'signup_date', label: 'Signup Date', type: 'date', icon: Calendar },
    { value: 'location', label: 'Location', type: 'text', icon: MapPin },
    { value: 'age', label: 'Age', type: 'number', icon: User },
    { value: 'gender', label: 'Gender', type: 'select', icon: User, options: ['Male', 'Female', 'Other'] },
    { value: 'patient_type', label: 'Patient Type', type: 'select', icon: User, options: ['ADULT', 'MEDICAL'] },
    { value: 'verification_status', label: 'Verification Status', type: 'select', icon: User, options: ['VERIFIED', 'VERIFICATION_PENDING'] },
    { value: 'customer_status', label: 'Customer Status', type: 'select', icon: User, options: ['ACTIVE', 'INACTIVE'] },
    { value: 'rewards_balance', label: 'Rewards Balance', type: 'number', icon: DollarSign },
    { value: 'customer_group', label: 'Customer Group', type: 'select', icon: Users, options: ['INDUSTRY', 'VIP', 'REGULAR'] },
  ],
  purchase: [
    { value: 'total_spent', label: 'Total Spent', type: 'number', icon: DollarSign },
    { value: 'order_count', label: 'Number of Orders', type: 'number', icon: ShoppingCart },
    { value: 'last_order_date', label: 'Last Order Date', type: 'date', icon: Calendar },
    { value: 'first_order_date', label: 'First Order Date', type: 'date', icon: Calendar },
    { value: 'average_order_value', label: 'Average Order Value', type: 'number', icon: DollarSign },
    { value: 'product_category', label: 'Product Category', type: 'select', icon: ShoppingCart, options: ['BEVERAGE', 'PLANT', 'PREROLL', 'MERCH', 'NON-INV', 'TINCTURE', 'MISC', 'TOPICAL', 'CARTRIDGE', 'FLOWER', 'PILL', 'EXTRACT', 'EDIBLE'] },
    { value: 'payment_method', label: 'Payment Method', type: 'select', icon: DollarSign, options: ['CASH', 'ACH', 'DEBIT', 'CASHLESS ATM', 'POINTS', 'CREDIT', 'OTHER'] },
    { value: 'order_source', label: 'Order Source', type: 'select', icon: ShoppingCart, options: ['IN-STORE', 'KIOSK', 'ECOMMERCE'] },
    { value: 'revenue_source', label: 'Revenue Source', type: 'select', icon: Target, options: ['Treez Ecommerce', 'Weedmaps', 'Jane', 'Dutchie', 'Dispense', 'Leafly'] },
    { value: 'product_brand', label: 'Product Brand', type: 'select', icon: ShoppingCart, options: ['710 LABS', 'A&A', 'ABSOLUTEXTRACTS', 'AIRFIELD SUPPLY CO.', 'ALIEN LABS', 'ALMORA', 'AVIATION', 'BEE WICK', 'CAKE', 'CALIVA', 'CANABOTANICA', 'CARE BY DESIGN', 'CLAYBOURNE', 'CONNECTED', 'CRUISERS', 'DABWOODS', 'DELI', 'DOOZIES', 'DR. NORM\'S', 'EVERYDAY', 'FLOWER COMPANY', 'FOCUS V', 'GOLD FLORA', 'GRAMLIN', 'Airfield Supply Co.', 'Canabotanica', 'Absolut Extracts', 'Aviation', 'Cake', 'Claybourne', 'Dabwoods', 'Focus V', 'Flower Company', 'Doozies', 'Bee Wick', 'Everyday'] },
  ],
  engagement: [
    { value: 'email_opens', label: 'Email Opens', type: 'number', icon: Mail },
    { value: 'email_clicks', label: 'Email Clicks', type: 'number', icon: Target },
    { value: 'last_email_open', label: 'Last Email Open', type: 'date', icon: Calendar },
    { value: 'email_subscribed', label: 'Email Subscribed', type: 'select', icon: Mail, options: ['Yes', 'No'] },
    { value: 'engagement_score', label: 'Engagement Score', type: 'number', icon: Target },
    { value: 'website_visits', label: 'Website Visits', type: 'number', icon: Target },
    { value: 'last_website_visit', label: 'Last Website Visit', type: 'date', icon: Calendar },
  ]
}

const OPERATORS = {
  text: [
    { value: 'equals', label: 'equals' },
    { value: 'not_equals', label: 'does not equal' },
    { value: 'contains', label: 'contains' },
    { value: 'not_contains', label: 'does not contain' },
    { value: 'starts_with', label: 'starts with' },
    { value: 'ends_with', label: 'ends with' },
    { value: 'is_empty', label: 'is empty' },
    { value: 'is_not_empty', label: 'is not empty' },
  ],
  number: [
    { value: 'equals', label: 'equals' },
    { value: 'not_equals', label: 'does not equal' },
    { value: 'greater_than', label: 'is greater than' },
    { value: 'greater_than_equal', label: 'is greater than or equal to' },
    { value: 'less_than', label: 'is less than' },
    { value: 'less_than_equal', label: 'is less than or equal to' },
    { value: 'between', label: 'is between' },
    { value: 'is_empty', label: 'is empty' },
    { value: 'is_not_empty', label: 'is not empty' },
  ],
  date: [
    { value: 'equals', label: 'is exactly' },
    { value: 'not_equals', label: 'is not' },
    { value: 'after', label: 'is after' },
    { value: 'before', label: 'is before' },
    { value: 'between', label: 'is between' },
    { value: 'last_days', label: 'in the last X days' },
    { value: 'next_days', label: 'in the next X days' },
    { value: 'is_empty', label: 'is empty' },
    { value: 'is_not_empty', label: 'is not empty' },
  ],
  select: [
    { value: 'equals', label: 'is' },
    { value: 'not_equals', label: 'is not' },
    { value: 'in', label: 'is one of' },
    { value: 'not_in', label: 'is not one of' },
  ]
}

export function SegmentForm({ segment, onSave, onCancel }: SegmentFormProps) {
  const [formData, setFormData] = useState({
    name: segment?.name || '',
    description: segment?.description || '',
    type: segment?.type || 'behavioral' as const,
  })

  const [filterGroups, setFilterGroups] = useState<FilterGroup[]>(() => {
    // Load filter groups from existing segment if editing
    if (segment?.criteria?.filterGroups) {
      return segment.criteria.filterGroups
    }
    // Default for new segments
    return [{
      id: '1',
      logic: 'AND',
      rules: []
    }]
  })

  const [activeTab, setActiveTab] = useState<keyof typeof FILTER_FIELDS>('customer')
  const [estimatedCount, setEstimatedCount] = useState(() => {
    // Load estimated count from existing segment if editing
    if (segment?.customer_count) {
      return segment.customer_count
    }
    return 0
  })
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isLoadingSchema, setIsLoadingSchema] = useState(false)
  const [isLoadingCount, setIsLoadingCount] = useState(false)
  const [snowflakeColumns, setSnowflakeColumns] = useState<Array<{ name: string; type: string; nullable: boolean; comment: string }>>([])
  const [whereClause, setWhereClause] = useState(segment?.where_clause || '')
  const [snowflakeError, setSnowflakeError] = useState<string | null>(null)

  // Update form when segment prop changes (for editing)
  React.useEffect(() => {
    if (segment) {
      setFormData({
        name: segment.name || '',
        description: segment.description || '',
        type: segment.type || 'behavioral',
      })
      
      if (segment.criteria?.filterGroups) {
        setFilterGroups(segment.criteria.filterGroups)
      }
      
      if (segment.customer_count) {
        setEstimatedCount(segment.customer_count)
      }
      
      if (segment.where_clause) {
        setWhereClause(segment.where_clause)
      }
    }
  }, [segment])

  // Load Snowflake schema on mount
  useEffect(() => {
    const loadSchema = async () => {
      setIsLoadingSchema(true)
      setSnowflakeError(null)
      try {
        const schema = await snowflakeAPI.getSchema()
        setSnowflakeColumns(schema.columns)
        logger.info('Loaded Snowflake schema', { 
          component: 'SegmentForm',
          columnCount: schema.columns.length 
        })
      } catch (error) {
        logger.error('Failed to load Snowflake schema', { 
          component: 'SegmentForm',
          error 
        })
        setSnowflakeError('Unable to connect to Snowflake. Using default fields.')
      } finally {
        setIsLoadingSchema(false)
      }
    }
    
    loadSchema()
  }, [])

  const addFilterGroup = () => {
    const newGroup: FilterGroup = {
      id: Date.now().toString(),
      logic: 'AND',
      rules: []
    }
    setFilterGroups([...filterGroups, newGroup])
  }

  const removeFilterGroup = (groupId: string) => {
    setFilterGroups(filterGroups.filter(group => group.id !== groupId))
  }

  const addRule = (groupId: string) => {
    const newRule: FilterRule = {
      id: Date.now().toString(),
      field: '',
      operator: '',
      value: '',
      valueType: 'text'
    }
    
    setFilterGroups(filterGroups.map(group => 
      group.id === groupId 
        ? { ...group, rules: [...group.rules, newRule] }
        : group
    ))
  }

  const removeRule = (groupId: string, ruleId: string) => {
    setFilterGroups(filterGroups.map(group => 
      group.id === groupId 
        ? { ...group, rules: group.rules.filter(rule => rule.id !== ruleId) }
        : group
    ))
  }

  const updateRule = (groupId: string, ruleId: string, updates: Partial<FilterRule>) => {
    setFilterGroups(filterGroups.map(group => 
      group.id === groupId 
        ? { 
            ...group, 
            rules: group.rules.map(rule => 
              rule.id === ruleId ? { ...rule, ...updates } : rule
            )
          }
        : group
    ))
  }

  const updateGroupLogic = (groupId: string, logic: 'AND' | 'OR') => {
    setFilterGroups(filterGroups.map(group => 
      group.id === groupId ? { ...group, logic } : group
    ))
  }

  const getFieldInfo = (fieldValue: string) => {
    for (const category of Object.values(FILTER_FIELDS)) {
      const field = category.find(f => f.value === fieldValue)
      if (field) return field
    }
    return null
  }

  // Build WHERE clause from filter groups
  const buildWhereClause = (groups: FilterGroup[]): string => {
    const groupClauses = groups
      .filter(group => group.rules.length > 0)
      .map(group => {
        const ruleClauses = group.rules
          .filter(rule => rule.field && rule.operator && (rule.value || ['is_empty', 'is_not_empty'].includes(rule.operator)))
          .map(rule => {
            const field = rule.field.toUpperCase()
            
            switch (rule.operator) {
              case 'equals':
                return `${field} = '${rule.value}'`
              case 'not_equals':
                return `${field} != '${rule.value}'`
              case 'contains':
                return `${field} LIKE '%${rule.value}%'`
              case 'not_contains':
                return `${field} NOT LIKE '%${rule.value}%'`
              case 'starts_with':
                return `${field} LIKE '${rule.value}%'`
              case 'ends_with':
                return `${field} LIKE '%${rule.value}'`
              case 'is_empty':
                return `(${field} IS NULL OR ${field} = '')`
              case 'is_not_empty':
                return `(${field} IS NOT NULL AND ${field} != '')`
              case 'greater_than':
                return `${field} > ${rule.value}`
              case 'greater_than_equal':
                return `${field} >= ${rule.value}`
              case 'less_than':
                return `${field} < ${rule.value}`
              case 'less_than_equal':
                return `${field} <= ${rule.value}`
              case 'between':
                const values = String(rule.value).split(',')
                return `${field} BETWEEN ${values[0]} AND ${values[1]}`
              case 'after':
                return `${field} > '${rule.value}'`
              case 'before':
                return `${field} < '${rule.value}'`
              case 'last_days':
                return `${field} >= DATEADD(day, -${rule.value}, CURRENT_DATE())`
              case 'next_days':
                return `${field} <= DATEADD(day, ${rule.value}, CURRENT_DATE())`
              case 'in':
                const inValues = String(rule.value).split(',').map(v => `'${v.trim()}'`).join(',')
                return `${field} IN (${inValues})`
              case 'not_in':
                const notInValues = String(rule.value).split(',').map(v => `'${v.trim()}'`).join(',')
                return `${field} NOT IN (${notInValues})`
              default:
                return null
            }
          })
          .filter(Boolean)
          .join(` ${group.logic} `)
        
        return ruleClauses ? `(${ruleClauses})` : null
      })
      .filter(Boolean)
    
    return groupClauses.join(' OR ')
  }

  // Update WHERE clause and fetch count when filters change
  useEffect(() => {
    const updateCount = async () => {
      const newWhereClause = buildWhereClause(filterGroups)
      setWhereClause(newWhereClause)
      
      if (newWhereClause && !snowflakeError) {
        setIsLoadingCount(true)
        try {
          const result = await snowflakeAPI.getCustomerCount(newWhereClause)
          setEstimatedCount(result.count)
          logger.debug('Updated customer count', {
            component: 'SegmentForm',
            whereClause: newWhereClause,
            count: result.count
          })
        } catch (error) {
          logger.error('Failed to get customer count', {
            component: 'SegmentForm',
            error
          })
          // Fallback to mock calculation
          const totalRules = filterGroups.reduce((sum, group) => sum + group.rules.length, 0)
          const baseCount = 10000
          const reduction = Math.min(totalRules * 0.3, 0.9)
          setEstimatedCount(Math.floor(baseCount * (1 - reduction)))
        } finally {
          setIsLoadingCount(false)
        }
      } else if (!newWhereClause) {
        // No filters, show total count
        setEstimatedCount(0)
      }
    }
    
    const timeoutId = setTimeout(updateCount, 500) // Debounce
    return () => clearTimeout(timeoutId)
  }, [filterGroups, snowflakeError])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (isSubmitting) return // Prevent double submission
    
    setIsSubmitting(true)
    
    logger.debug('Segment form submitted', {
      component: 'SegmentForm',
      isEdit: !!segment,
      filterGroupsCount: filterGroups.length
    })
    
    const segmentData: Omit<Segment, 'id' | 'created_at' | 'updated_at' | 'user_id'> & { user_id?: string; where_clause?: string } = {
      name: formData.name,
      description: formData.description,
      type: formData.type as 'behavioral' | 'predictive',
      criteria: {
        filterGroups,
        estimatedCount
      },
      customer_count: estimatedCount,
      growth_rate: segment?.growth_rate,
      where_clause: whereClause
    }
    
    // Only include user_id for new segments
    if (!segment) {
      segmentData.user_id = '' // Will be set by API
    }
    
    try {
      await onSave(segmentData)
    } finally {
      setIsSubmitting(false)
    }
  }

  const renderValueInput = (group: FilterGroup, rule: FilterRule) => {
    const fieldInfo = getFieldInfo(rule.field)
    
    if (!rule.operator || ['is_empty', 'is_not_empty'].includes(rule.operator)) {
      return null
    }

    switch (fieldInfo?.type) {
      case 'number':
        if (rule.operator === 'between') {
          // Handle between with two values
          const values = typeof rule.value === 'string' ? rule.value.split(',') : ['', '']
          return (
            <div className="flex items-center gap-2">
              <input
                type="number"
                value={values[0] || ''}
                onChange={(e) => {
                  const newValue = `${e.target.value},${values[1] || ''}`
                  updateRule(group.id, rule.id, { value: newValue })
                }}
                className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                placeholder="Min"
              />
              <span className="text-gray-500">and</span>
              <input
                type="number"
                value={values[1] || ''}
                onChange={(e) => {
                  const newValue = `${values[0] || ''},${e.target.value}`
                  updateRule(group.id, rule.id, { value: newValue })
                }}
                className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                placeholder="Max"
              />
            </div>
          )
        }
        return (
          <input
            type="number"
            value={rule.value}
            onChange={(e) => updateRule(group.id, rule.id, { value: e.target.value })}
            className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
            placeholder="Enter number"
          />
        )
      
      case 'date':
        if (rule.operator === 'between') {
          // Handle between with two dates
          const values = typeof rule.value === 'string' ? rule.value.split(',') : ['', '']
          return (
            <div className="flex items-center gap-2">
              <input
                type="date"
                value={values[0] || ''}
                onChange={(e) => {
                  const newValue = `${e.target.value},${values[1] || ''}`
                  updateRule(group.id, rule.id, { value: newValue })
                }}
                className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
              />
              <span className="text-gray-500">and</span>
              <input
                type="date"
                value={values[1] || ''}
                onChange={(e) => {
                  const newValue = `${values[0] || ''},${e.target.value}`
                  updateRule(group.id, rule.id, { value: newValue })
                }}
                className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
              />
            </div>
          )
        }
        if (rule.operator === 'last_days' || rule.operator === 'next_days') {
          return (
            <input
              type="number"
              value={rule.value}
              onChange={(e) => updateRule(group.id, rule.id, { value: e.target.value })}
              className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
              placeholder="Number of days"
            />
          )
        }
        return (
          <input
            type="date"
            value={rule.value}
            onChange={(e) => updateRule(group.id, rule.id, { value: e.target.value })}
            className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
          />
        )
      
      case 'select':
        return (
          <select
            value={rule.value}
            onChange={(e) => updateRule(group.id, rule.id, { value: e.target.value })}
            className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
          >
            <option value="">Select option</option>
            {fieldInfo.options?.map(option => (
              <option key={option} value={option}>{option}</option>
            ))}
          </select>
        )
      
      default:
        return (
          <input
            type="text"
            value={rule.value}
            onChange={(e) => updateRule(group.id, rule.id, { value: e.target.value })}
            className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
            placeholder="Enter value"
          />
        )
    }
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-6xl max-h-[95vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="p-6 border-b border-gray-200 flex items-center justify-between">
          <div>
            <h2 className="text-xl font-semibold text-gray-900">
              {segment ? 'Edit Segment' : 'Create New Segment'}
            </h2>
            <p className="text-sm text-gray-600 mt-1">
              Build targeted customer segments with advanced filtering
            </p>
          </div>
          <button
            onClick={onCancel}
            className="p-2 text-gray-400 hover:text-gray-600 rounded-lg"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="flex-1 flex flex-col overflow-hidden">
          {/* Basic Info */}
          <div className="p-6 border-b border-gray-200">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Segment Name
                </label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                  placeholder="e.g., High-Value Customers"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Type
                </label>
                <select
                  value={formData.type}
                  onChange={(e) => setFormData({ ...formData, type: e.target.value as 'behavioral' | 'predictive' })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                >
                  <option value="behavioral">Behavioral</option>
                  <option value="predictive">Predictive</option>
                </select>
              </div>
            </div>
            <div className="mt-4">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Description
              </label>
              <textarea
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                rows={2}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                placeholder="Describe this segment..."
              />
            </div>
          </div>

          {/* Filter Builder */}
          <div className="flex-1 flex overflow-hidden">
            {/* Field Categories */}
            <div className="w-64 bg-gray-50 border-r border-gray-200 overflow-y-auto">
              <div className="p-4">
                <h3 className="text-sm font-medium text-gray-900 mb-3">Filter Categories</h3>
                <div className="space-y-1">
                  {Object.entries(FILTER_FIELDS).map(([key]) => (
                    <button
                      key={key}
                      type="button"
                      onClick={() => setActiveTab(key as keyof typeof FILTER_FIELDS)}
                      className={`w-full text-left px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                        activeTab === key
                          ? 'bg-purple-100 text-purple-700'
                          : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
                      }`}
                    >
                      {key.charAt(0).toUpperCase() + key.slice(1)}
                    </button>
                  ))}
                </div>
              </div>

              {/* Available Fields */}
              <div className="p-4 border-t border-gray-200">
                <h4 className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-3">
                  Available Fields
                </h4>
                <div className="space-y-2">
                  {FILTER_FIELDS[activeTab].map((field) => {
                    const Icon = field.icon
                    return (
                      <div
                        key={field.value}
                        className="flex items-center p-2 text-sm text-gray-700 bg-white rounded border border-gray-200 cursor-move"
                        draggable
                      >
                        <Icon className="w-4 h-4 mr-2 text-gray-400" />
                        {field.label}
                      </div>
                    )
                  })}
                </div>
              </div>
            </div>

            {/* Filter Rules */}
            <div className="flex-1 overflow-y-auto">
              <div className="p-6">
                <div className="flex items-center justify-between mb-6">
                  <h3 className="text-lg font-medium text-gray-900">Filter Rules</h3>
                  <div className="flex items-center gap-4">
                    <div className="text-sm text-gray-600">
                      {isLoadingCount ? (
                        <span className="flex items-center gap-2">
                          <span className="inline-block w-4 h-4 border-2 border-purple-600 border-t-transparent rounded-full animate-spin"></span>
                          Calculating...
                        </span>
                      ) : (
                        <>
                          Estimated: <span className="font-medium text-purple-600">{estimatedCount.toLocaleString()}</span> customers
                          {snowflakeError && <span className="text-orange-600 ml-2">(Using demo data)</span>}
                        </>
                      )}
                    </div>
                    <button
                      type="button"
                      onClick={addFilterGroup}
                      className="bg-purple-600 text-white px-3 py-1.5 rounded-lg text-sm font-medium hover:bg-purple-700 transition-colors flex items-center gap-1"
                    >
                      <Plus className="w-4 h-4" />
                      Add Group
                    </button>
                  </div>
                </div>

                <div className="space-y-6">
                  {filterGroups.map((group, groupIndex) => (
                    <div key={group.id} className="border border-gray-200 rounded-lg p-4">
                      {/* Group Header */}
                      <div className="flex items-center justify-between mb-4">
                        <div className="flex items-center gap-3">
                          <span className="text-sm font-medium text-gray-700">
                            {groupIndex === 0 ? 'Where' : 'And where'}
                          </span>
                          <select
                            value={group.logic}
                            onChange={(e) => updateGroupLogic(group.id, e.target.value as 'AND' | 'OR')}
                            className="px-2 py-1 border border-gray-300 rounded text-sm"
                          >
                            <option value="AND">All conditions match (AND)</option>
                            <option value="OR">Any condition matches (OR)</option>
                          </select>
                        </div>
                        {filterGroups.length > 1 && (
                          <button
                            type="button"
                            onClick={() => removeFilterGroup(group.id)}
                            className="p-1 text-gray-400 hover:text-red-600"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        )}
                      </div>

                      {/* Rules */}
                      <div className="space-y-3">
                        {group.rules.map((rule, ruleIndex) => (
                          <div key={rule.id} className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
                            {ruleIndex > 0 && (
                              <span className="text-xs font-medium text-gray-500 uppercase">
                                {group.logic}
                              </span>
                            )}
                            
                            {/* Field Selection */}
                            <select
                              value={rule.field}
                              onChange={(e) => {
                                const fieldInfo = getFieldInfo(e.target.value)
                                updateRule(group.id, rule.id, {
                                  field: e.target.value,
                                  valueType: fieldInfo?.type || 'text',
                                  operator: '',
                                  value: ''
                                })
                              }}
                              className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent min-w-[150px]"
                            >
                              <option value="">Select field</option>
                              {Object.entries(FILTER_FIELDS).map(([category, fields]) => (
                                <optgroup key={category} label={category.charAt(0).toUpperCase() + category.slice(1)}>
                                  {fields.map(field => (
                                    <option key={field.value} value={field.value}>
                                      {field.label}
                                    </option>
                                  ))}
                                </optgroup>
                              ))}
                            </select>

                            {/* Operator Selection */}
                            {rule.field && (
                              <select
                                value={rule.operator}
                                onChange={(e) => updateRule(group.id, rule.id, { operator: e.target.value, value: '' })}
                                className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent min-w-[150px]"
                              >
                                <option value="">Select operator</option>
                                {OPERATORS[rule.valueType]?.map(op => (
                                  <option key={op.value} value={op.value}>
                                    {op.label}
                                  </option>
                                ))}
                              </select>
                            )}

                            {/* Value Input */}
                            {rule.operator && renderValueInput(group, rule)}

                            {/* Remove Rule */}
                            <button
                              type="button"
                              onClick={() => removeRule(group.id, rule.id)}
                              className="p-1 text-gray-400 hover:text-red-600 ml-auto"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        ))}

                        {/* Add Rule Button */}
                        <button
                          type="button"
                          onClick={() => addRule(group.id)}
                          className="w-full p-3 border-2 border-dashed border-gray-300 rounded-lg text-gray-600 hover:border-purple-300 hover:text-purple-600 transition-colors flex items-center justify-center gap-2"
                        >
                          <Plus className="w-4 h-4" />
                          Add condition
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* Footer */}
          <div className="p-6 border-t border-gray-200 flex items-center justify-between">
            <div className="text-sm text-gray-600">
              {isLoadingCount ? (
                <span className="flex items-center gap-2">
                  <span className="inline-block w-4 h-4 border-2 border-purple-600 border-t-transparent rounded-full animate-spin"></span>
                  Calculating customer count...
                </span>
              ) : (
                <>
                  This segment will include approximately <span className="font-medium text-purple-600">{estimatedCount.toLocaleString()}</span> customers
                  {snowflakeError && <span className="text-orange-600 ml-2">(Demo mode)</span>}
                </>
              )}
            </div>
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={onCancel}
                className="px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isSubmitting}
                className="px-4 py-2 bg-gradient-to-r from-purple-600 to-pink-600 text-white rounded-lg hover:from-purple-700 hover:to-pink-700 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isSubmitting ? 'Saving...' : (segment ? 'Update Segment' : 'Create Segment')}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  )
}