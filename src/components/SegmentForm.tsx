import React, { useState, useEffect } from 'react'
import { X, Plus, Trash2, Calendar, DollarSign, Mail, ShoppingCart, User, Users, MapPin, Clock, Target } from 'lucide-react'
import { Segment } from '../lib/supabase'
import { logger } from '../lib/logger'
import { snowflakeAPI } from '../lib/api'

interface SegmentFormProps {
  segment?: Segment | null
  onSave: (data: Omit<Segment, 'id' | 'created_at' | 'updated_at'>) => void | Promise<void>
  onCancel: () => void
  productFilters?: {
    brands: string[]
    types: string[]
    subtypes: string[]
  }
}

interface FilterRule {
  id: string
  field: string
  operator: string
  value: string | number
  valueType: 'text' | 'number' | 'date' | 'select'
  table?: 'customer' | 'sales'
}

interface FilterGroup {
  id: string
  logic: 'AND' | 'OR'
  rules: FilterRule[]
}

const FILTER_FIELDS = {
  customer: [
    // Personal Information
    { value: 'FIRST_NAME', label: 'First Name', type: 'text', icon: User, table: 'customer' },
    { value: 'LAST_NAME', label: 'Last Name', type: 'text', icon: User, table: 'customer' },
    { value: 'EMAIL', label: 'Email', type: 'text', icon: Mail, table: 'customer' },
    { value: 'PHONE', label: 'Phone', type: 'text', icon: User, table: 'customer' },
    { value: 'GENDER', label: 'Gender', type: 'text', icon: User, table: 'customer' },
    { value: 'DATE_OF_BIRTH', label: 'Date of Birth', type: 'date', icon: Calendar, table: 'customer' },
    { value: 'CUSTOMER_STATUS', label: 'Customer Status', type: 'text', icon: User, table: 'customer' },
    { value: 'CUSTOMER_TYPE', label: 'Customer Type', type: 'text', icon: User, table: 'customer' },
    { value: 'CUSTOMER_GROUPS', label: 'Customer Groups', type: 'text', icon: Users, table: 'customer' },
    { value: 'OPTED_IN', label: 'Opted In', type: 'select', icon: Mail, options: ['true', 'false'], table: 'customer' },
    { value: 'VIOLATIONS', label: 'Violations', type: 'number', icon: User, table: 'customer' },
  ],
  address: [
    { value: 'CUSTOMER_ADDRESS', label: 'Full Address', type: 'text', icon: MapPin, table: 'customer' },
    { value: 'ADDRESS_STREET_1', label: 'Street Address', type: 'text', icon: MapPin, table: 'customer' },
    { value: 'ADDRESS_CITY', label: 'City', type: 'text', icon: MapPin, table: 'customer' },
    { value: 'ADDRESS_STATE', label: 'State', type: 'text', icon: MapPin, table: 'customer' },
    { value: 'ADDRESS_COUNTRY', label: 'Country', type: 'text', icon: MapPin, table: 'customer' },
    { value: 'ADDRESS_ZIPCODE', label: 'Zip Code', type: 'text', icon: MapPin, table: 'customer' },
  ],
  purchase: [
    { value: 'LIFETIME_NET_SALES', label: 'Lifetime Net Sales', type: 'number', icon: DollarSign, table: 'customer' },
    { value: 'LIFETIME_GROSS_SALES', label: 'Lifetime Gross Sales', type: 'number', icon: DollarSign, table: 'customer' },
    { value: 'LIFETIME_DISCOUNTS', label: 'Lifetime Discounts', type: 'number', icon: DollarSign, table: 'customer' },
    { value: 'LIFETIME_TRANSACTIONS', label: 'Lifetime Transactions', type: 'number', icon: ShoppingCart, table: 'customer' },
    { value: 'LIFETIME_GROSS_RECEIPTS', label: 'Lifetime Gross Receipts', type: 'number', icon: DollarSign, table: 'customer' },
    { value: 'TOTAL_VISITS', label: 'Total Visits', type: 'number', icon: ShoppingCart, table: 'customer' },
    { value: 'TOTAL_VISITS_WITH_PURCHASES', label: 'Visits with Purchases', type: 'number', icon: ShoppingCart, table: 'customer' },
    { value: 'NEVER_MADE_PURCHASE', label: 'Never Made Purchase', type: 'select', icon: ShoppingCart, options: ['true', 'false'], table: 'customer' },
    { value: 'REWARDS_POINTS', label: 'Rewards Points', type: 'number', icon: DollarSign, table: 'customer' },
    { value: 'REWARDS_REDEEMED_GROSS', label: 'Rewards Redeemed (Gross)', type: 'number', icon: DollarSign, table: 'customer' },
    { value: 'REWARDS_REFUNDED', label: 'Rewards Refunded', type: 'number', icon: DollarSign, table: 'customer' },
    { value: 'REWARDS_REDEEMED_NET', label: 'Rewards Redeemed (Net)', type: 'number', icon: DollarSign, table: 'customer' },
    { value: 'DATE_CLOSE', label: 'Purchase Date', type: 'date', icon: Calendar, table: 'sales' },
    { value: 'PRODUCT_BRAND', label: 'Product Brand', type: 'select', icon: ShoppingCart, options: [], table: 'sales' },
    { value: 'PRODUCT_TYPE', label: 'Product Type', type: 'select', icon: ShoppingCart, options: [], table: 'sales' },
    { value: 'PRODUCT_SUBTYPE', label: 'Product Subtype', type: 'select', icon: ShoppingCart, options: [], table: 'sales' },
  ],
  dates: [
    { value: 'LAST_VISIT', label: 'Last Visit', type: 'date', icon: Clock, table: 'customer' },
    { value: 'SIGNUP_DATE', label: 'Signup Date', type: 'date', icon: Calendar, table: 'customer' },
    { value: 'ORIGINAL_PROFILE_SIGNUP_DATE', label: 'Original Signup Date', type: 'date', icon: Calendar, table: 'customer' },
    { value: 'CUSTOMER_FIRST_TICKET_TIMESTAMP', label: 'First Purchase Date', type: 'date', icon: Calendar, table: 'customer' },
    { value: 'LAST_UPDATED_AT', label: 'Last Updated', type: 'date', icon: Clock, table: 'customer' },
    { value: 'LAST_SYNC', label: 'Last Sync', type: 'date', icon: Clock, table: 'customer' },
  ],
  medical: [
    { value: 'MEDICAL_ID', label: 'Medical ID', type: 'text', icon: User, table: 'customer' },
    { value: 'CUSTOMER_MEDICAL_ID_EXP_DATE', label: 'Medical ID Expiration', type: 'date', icon: Calendar, table: 'customer' },
    { value: 'CAREGIVER_NAME', label: 'Caregiver Name', type: 'text', icon: User, table: 'customer' },
    { value: 'CUSTOMER_PHYSICIAN_FIRST_NAME', label: 'Physician First Name', type: 'text', icon: User, table: 'customer' },
    { value: 'CUSTOMER_PHYSICIAN_LAST_NAME', label: 'Physician Last Name', type: 'text', icon: User, table: 'customer' },
    { value: 'CUSTOMER_PHYSICIAN_PHONE', label: 'Physician Phone', type: 'text', icon: User, table: 'customer' },
    { value: 'CUSTOMER_PHYSICIAN_EMAIL', label: 'Physician Email', type: 'text', icon: Mail, table: 'customer' },
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

export function SegmentForm({ segment, onSave, onCancel, productFilters }: SegmentFormProps) {
  const [formData, setFormData] = useState({
    name: segment?.name || '',
    description: segment?.description || '',
    type: segment?.type || 'behavioral' as const,
  })

  // Create filter fields with dynamic product options
  const getFilterFields = () => {
    const fields = { ...FILTER_FIELDS }
    
    // Update product filter options if available
    if (productFilters) {
      const purchaseFields = [...fields.purchase]
      
      // Update PRODUCT_BRAND options
      const brandIndex = purchaseFields.findIndex(f => f.value === 'PRODUCT_BRAND')
      if (brandIndex !== -1) {
        purchaseFields[brandIndex] = { ...purchaseFields[brandIndex], options: productFilters.brands }
      }
      
      // Update PRODUCT_TYPE options
      const typeIndex = purchaseFields.findIndex(f => f.value === 'PRODUCT_TYPE')
      if (typeIndex !== -1) {
        purchaseFields[typeIndex] = { ...purchaseFields[typeIndex], options: productFilters.types }
      }
      
      // Update PRODUCT_SUBTYPE options
      const subtypeIndex = purchaseFields.findIndex(f => f.value === 'PRODUCT_SUBTYPE')
      if (subtypeIndex !== -1) {
        purchaseFields[subtypeIndex] = { ...purchaseFields[subtypeIndex], options: productFilters.subtypes }
      }
      
      fields.purchase = purchaseFields
    }
    
    return fields
  }

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
    for (const category of Object.values(getFilterFields())) {
      const field = category.find(f => f.value === fieldValue)
      if (field) return field
    }
    return null
  }


  // Update customer count when filters change
  useEffect(() => {
    const updateCount = async () => {
      console.log('[SegmentForm] Filter groups changed:', {
        filterGroups,
        hasSnowflakeError: !!snowflakeError
      })
      
      const hasRules = filterGroups.some(group => group.rules.length > 0)
      
      if (hasRules && !snowflakeError) {
        setIsLoadingCount(true)
        try {
          console.log('[SegmentForm] Fetching customer count for filter groups')
          const result = await snowflakeAPI.getCustomerCountFromFilters(filterGroups)
          setEstimatedCount(result.count)
          
          console.log('[SegmentForm] Customer count updated:', {
            count: result.count
          })
          
          logger.debug('Updated customer count', {
            component: 'SegmentForm',
            count: result.count
          })
        } catch (error) {
          console.error('[SegmentForm] Failed to get customer count:', error)
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
      } else if (!hasRules) {
        // No filters, get total count
        console.log('[SegmentForm] No filters, fetching total count')
        setIsLoadingCount(true)
        try {
          const result = await snowflakeAPI.getCustomerCount()
          setEstimatedCount(result.count)
          console.log('[SegmentForm] Total customer count:', result.count)
        } catch (error) {
          console.error('[SegmentForm] Failed to get total count:', error)
          setEstimatedCount(0)
        } finally {
          setIsLoadingCount(false)
        }
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
    
    const segmentData: Omit<Segment, 'id' | 'created_at' | 'updated_at' | 'user_id'> & { user_id?: string } = {
      name: formData.name,
      description: formData.description,
      type: formData.type as 'behavioral' | 'predictive',
      criteria: {
        filterGroups,
        estimatedCount
      },
      customer_count: estimatedCount,
      growth_rate: segment?.growth_rate
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
          <div className="flex-1 flex overflow-hidden" style={{ height: '60%' }}>
            {/* Field Categories */}
            <div className="w-64 bg-gray-50 border-r border-gray-200 overflow-y-auto">
              <div className="p-4">
                <h3 className="text-sm font-medium text-gray-900 mb-3">Filter Categories</h3>
                <div className="space-y-1">
                  {Object.entries(getFilterFields()).map(([key]) => (
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
                  {getFilterFields()[activeTab].map((field) => {
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
                                  table: fieldInfo?.table || 'customer',
                                  operator: '',
                                  value: ''
                                })
                              }}
                              className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent min-w-[150px]"
                            >
                              <option value="">Select field</option>
                              {Object.entries(getFilterFields()).map(([category, fields]) => (
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