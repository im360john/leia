import React, { useState, useEffect } from 'react'
import { X, Plus, Trash2, Package, Tag, Layers, DollarSign, Store, Hash } from 'lucide-react'
import { Segment } from '../lib/supabase'
import { logger } from '../lib/logger'
import { supabase } from '../lib/supabase'

interface ProductSegmentFormProps {
  segment?: Segment | null
  onSave: (data: Omit<Segment, 'id' | 'created_at' | 'updated_at'>) => void | Promise<void>
  onCancel: () => void
}

interface FilterRule {
  id: string
  field: string
  operator: string
  value: string | number
  valueType: 'text' | 'number' | 'select'
}

interface FilterGroup {
  id: string
  logic: 'AND' | 'OR'
  rules: FilterRule[]
}

const FILTER_FIELDS = [
  { value: 'STORE_NAME', label: 'Store Name', type: 'text', icon: Store },
  { value: 'PRODUCT_BRAND', label: 'Product Brand', type: 'text', icon: Tag },
  { value: 'PRODUCT_TYPE', label: 'Product Type', type: 'text', icon: Package },
  { value: 'PRODUCT_SUB_TYPE', label: 'Product Subtype', type: 'text', icon: Package },
  { value: 'PRODUCT_LINE', label: 'Product Line', type: 'text', icon: Layers },
  { value: 'PRODUCT_LINE_WITH_CLASSIFICATION', label: 'Product Line (with Classifications)', type: 'text', icon: Layers },
  { value: 'PRODUCT_LINE_BRAND_TYPE', label: 'Product Line (Brand - Product Type)', type: 'text', icon: Layers },
  { value: 'CURRENT_RETAIL_PRICE', label: 'Current Retail Price', type: 'number', icon: DollarSign },
  { value: 'SIZE_DISPLAY', label: 'Size (display)', type: 'text', icon: Hash },
  { value: 'DISTRIBUTOR_NAME', label: 'Distributor Name', type: 'text', icon: Store },
]

const OPERATORS = {
  text: [
    { value: '=', label: 'equals' },
    { value: '!=', label: 'not equals' },
    { value: 'LIKE', label: 'contains' },
    { value: 'NOT LIKE', label: 'does not contain' },
    { value: 'ILIKE', label: 'contains (case-insensitive)' },
    { value: 'NOT ILIKE', label: 'does not contain (case-insensitive)' },
    { value: 'IN', label: 'in list' },
    { value: 'NOT IN', label: 'not in list' },
  ],
  number: [
    { value: '=', label: 'equals' },
    { value: '!=', label: 'not equals' },
    { value: '>', label: 'greater than' },
    { value: '>=', label: 'greater than or equal' },
    { value: '<', label: 'less than' },
    { value: '<=', label: 'less than or equal' },
  ],
  select: [
    { value: '=', label: 'equals' },
    { value: '!=', label: 'not equals' },
  ]
}

export default function ProductSegmentForm({ segment, onSave, onCancel }: ProductSegmentFormProps) {
  const [name, setName] = useState(segment?.name || '')
  const [description, setDescription] = useState(segment?.description || '')
  const [type, setType] = useState<'behavioral' | 'predictive'>(segment?.type || 'behavioral')
  const [isLoading, setIsLoading] = useState(false)
  const [productCount, setProductCount] = useState<number | null>(null)
  const [isCountingProducts, setIsCountingProducts] = useState(false)
  
  const [filterGroups, setFilterGroups] = useState<FilterGroup[]>(() => {
    if (segment?.criteria?.filterGroups) {
      return segment.criteria.filterGroups
    }
    return [{
      id: crypto.randomUUID(),
      logic: 'AND' as const,
      rules: [{
        id: crypto.randomUUID(),
        field: '',
        operator: '=',
        value: '',
        valueType: 'text'
      }]
    }]
  })

  useEffect(() => {
    logger.info('ProductSegmentForm mounted', { 
      component: 'ProductSegmentForm',
      segmentId: segment?.id,
      filterGroups
    })
  }, [segment, filterGroups])

  const addRule = (groupId: string) => {
    setFilterGroups(groups => 
      groups.map(group => 
        group.id === groupId
          ? {
              ...group,
              rules: [...group.rules, {
                id: crypto.randomUUID(),
                field: '',
                operator: '=',
                value: '',
                valueType: 'text'
              }]
            }
          : group
      )
    )
  }

  const removeRule = (groupId: string, ruleId: string) => {
    setFilterGroups(groups => 
      groups.map(group => 
        group.id === groupId
          ? {
              ...group,
              rules: group.rules.filter(rule => rule.id !== ruleId)
            }
          : group
      )
    )
  }

  const updateRule = (groupId: string, ruleId: string, updates: Partial<FilterRule>) => {
    setFilterGroups(groups => 
      groups.map(group => 
        group.id === groupId
          ? {
              ...group,
              rules: group.rules.map(rule => 
                rule.id === ruleId
                  ? { ...rule, ...updates }
                  : rule
              )
            }
          : group
      )
    )
  }

  const addGroup = () => {
    setFilterGroups(groups => [...groups, {
      id: crypto.randomUUID(),
      logic: 'AND' as const,
      rules: [{
        id: crypto.randomUUID(),
        field: '',
        operator: '=',
        value: '',
        valueType: 'text'
      }]
    }])
  }

  const removeGroup = (groupId: string) => {
    setFilterGroups(groups => groups.filter(group => group.id !== groupId))
  }

  const updateGroupLogic = (groupId: string, logic: 'AND' | 'OR') => {
    setFilterGroups(groups => 
      groups.map(group => 
        group.id === groupId ? { ...group, logic } : group
      )
    )
  }

  const getProductCount = async () => {
    setIsCountingProducts(true)
    setProductCount(null)
    
    try {
      // Build WHERE clause from filter groups
      const whereClause = buildWhereClause(filterGroups)
      
      if (!whereClause) {
        setProductCount(0)
        return
      }

      // Query product count from Snowflake
      const response = await supabase.functions.invoke('snowflake', {
        body: {
          sql: `
            SELECT COUNT(DISTINCT "Product Id") as count 
            FROM RETAIL_ANALYTICS.DBT_RETAIL_ANALYTICS.RA_PRODUCT_SALES_AND_INVENTORY_V1
            WHERE "Org Id" = '0273cbe1-667c-4421-a875-d65afff0280b'
              AND ${whereClause}
          `,
          database: 'RETAIL_ANALYTICS',
          warehouse: 'RETAIL_ANALYTICS'
        }
      })

      if (response.error) {
        throw new Error(response.error.message || 'Failed to count products')
      }

      // Extract count from response
      const count = response.data?.data?.data?.[0]?.[0] || 0
      setProductCount(parseInt(count, 10))
      
    } catch (error) {
      logger.error('Failed to get product count', { 
        component: 'ProductSegmentForm', 
        error,
        filterGroups 
      })
      setProductCount(null)
    } finally {
      setIsCountingProducts(false)
    }
  }

  const buildWhereClause = (groups: FilterGroup[]): string => {
    const groupClauses = groups
      .filter(group => group.rules.some(rule => rule.field && rule.value))
      .map(group => {
        const ruleClauses = group.rules
          .filter(rule => rule.field && rule.value)
          .map(rule => {
            const field = mapFieldToColumn(rule.field)
            const operator = rule.operator
            let value = rule.value
            
            // Format value based on operator
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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!name.trim()) {
      alert('Please enter a segment name')
      return
    }

    setIsLoading(true)
    
    try {
      const whereClause = buildWhereClause(filterGroups)
      
      await onSave({
        name: name.trim(),
        description: description.trim(),
        type,
        criteria: { filterGroups },
        where_clause: whereClause,
        customer_count: 0, // Product segments use product_count instead
        product_count: productCount || 0,
        growth_rate: 0,
        user_id: segment?.user_id || ''
      })
      
      logger.info('Product segment saved', { component: 'ProductSegmentForm', name })
    } catch (error) {
      logger.error('Failed to save product segment', { component: 'ProductSegmentForm', error })
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full flex items-center justify-center p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
        <div className="sticky top-0 bg-white border-b px-6 py-4 flex justify-between items-center">
          <h2 className="text-xl font-semibold">
            {segment ? 'Edit Product Segment' : 'Create Product Segment'}
          </h2>
          <button
            onClick={onCancel}
            className="text-gray-400 hover:text-gray-600"
          >
            <X className="h-6 w-6" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          {/* Basic Information */}
          <div className="grid grid-cols-1 gap-4">
            <div>
              <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-1">
                Segment Name
              </label>
              <input
                type="text"
                id="name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                placeholder="e.g., Premium Flower Products"
              />
            </div>

            <div>
              <label htmlFor="description" className="block text-sm font-medium text-gray-700 mb-1">
                Description
              </label>
              <textarea
                id="description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={2}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                placeholder="Describe the purpose of this product segment..."
              />
            </div>
          </div>

          {/* Filter Builder */}
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <h3 className="text-lg font-medium">Product Filters</h3>
              <button
                type="button"
                onClick={getProductCount}
                disabled={isCountingProducts}
                className="px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 disabled:bg-gray-400 disabled:cursor-not-allowed text-sm"
              >
                {isCountingProducts ? 'Counting...' : 'Count Products'}
              </button>
            </div>

            {productCount !== null && (
              <div className="bg-blue-50 border border-blue-200 rounded-md p-3">
                <p className="text-sm text-blue-800">
                  This segment contains <span className="font-semibold">{productCount.toLocaleString()}</span> products
                </p>
              </div>
            )}

            {filterGroups.map((group, groupIndex) => (
              <div key={group.id} className="border border-gray-200 rounded-lg p-4 space-y-3">
                <div className="flex justify-between items-center">
                  <div className="flex items-center space-x-2">
                    {groupIndex > 0 && (
                      <span className="text-sm text-gray-500">OR</span>
                    )}
                    <select
                      value={group.logic}
                      onChange={(e) => updateGroupLogic(group.id, e.target.value as 'AND' | 'OR')}
                      className="text-sm border border-gray-300 rounded px-2 py-1"
                    >
                      <option value="AND">AND</option>
                      <option value="OR">OR</option>
                    </select>
                  </div>
                  {filterGroups.length > 1 && (
                    <button
                      type="button"
                      onClick={() => removeGroup(group.id)}
                      className="text-red-600 hover:text-red-800"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  )}
                </div>

                <div className="space-y-2">
                  {group.rules.map((rule, ruleIndex) => (
                    <div key={rule.id} className="flex items-center space-x-2">
                      {ruleIndex > 0 && (
                        <span className="text-xs text-gray-500 ml-4">{group.logic}</span>
                      )}
                      
                      {/* Field Select */}
                      <select
                        value={rule.field}
                        onChange={(e) => {
                          const field = FILTER_FIELDS.find(f => f.value === e.target.value)
                          updateRule(group.id, rule.id, {
                            field: e.target.value,
                            valueType: field?.type || 'text',
                            operator: field?.type === 'number' ? '=' : rule.operator
                          })
                        }}
                        className="flex-1 border border-gray-300 rounded-md px-3 py-2 text-sm"
                      >
                        <option value="">Select field...</option>
                        {FILTER_FIELDS.map(field => (
                          <option key={field.value} value={field.value}>
                            {field.label}
                          </option>
                        ))}
                      </select>

                      {/* Operator Select */}
                      <select
                        value={rule.operator}
                        onChange={(e) => updateRule(group.id, rule.id, { operator: e.target.value })}
                        className="border border-gray-300 rounded-md px-3 py-2 text-sm"
                        disabled={!rule.field}
                      >
                        {(OPERATORS[rule.valueType as keyof typeof OPERATORS] || OPERATORS.text).map(op => (
                          <option key={op.value} value={op.value}>
                            {op.label}
                          </option>
                        ))}
                      </select>

                      {/* Value Input */}
                      {rule.valueType === 'select' ? (
                        <select
                          value={rule.value}
                          onChange={(e) => updateRule(group.id, rule.id, { value: e.target.value })}
                          className="flex-1 border border-gray-300 rounded-md px-3 py-2 text-sm"
                          disabled={!rule.field}
                        >
                          <option value="">Select...</option>
                          {/* Add options based on field */}
                        </select>
                      ) : (
                        <input
                          type={rule.valueType === 'number' ? 'number' : 'text'}
                          value={rule.value}
                          onChange={(e) => updateRule(group.id, rule.id, { value: e.target.value })}
                          className="flex-1 border border-gray-300 rounded-md px-3 py-2 text-sm"
                          disabled={!rule.field}
                          placeholder={rule.operator === 'IN' || rule.operator === 'NOT IN' ? 'comma,separated,values' : 'Enter value...'}
                        />
                      )}

                      {/* Remove Rule Button */}
                      {group.rules.length > 1 && (
                        <button
                          type="button"
                          onClick={() => removeRule(group.id, rule.id)}
                          className="text-red-600 hover:text-red-800"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      )}
                    </div>
                  ))}
                </div>

                <button
                  type="button"
                  onClick={() => addRule(group.id)}
                  className="text-sm text-indigo-600 hover:text-indigo-800 flex items-center space-x-1"
                >
                  <Plus className="h-4 w-4" />
                  <span>Add condition</span>
                </button>
              </div>
            ))}

            <button
              type="button"
              onClick={addGroup}
              className="text-sm text-indigo-600 hover:text-indigo-800 flex items-center space-x-1"
            >
              <Plus className="h-4 w-4" />
              <span>Add filter group (OR)</span>
            </button>
          </div>

          {/* Form Actions */}
          <div className="flex justify-end space-x-3 pt-4 border-t">
            <button
              type="button"
              onClick={onCancel}
              className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isLoading}
              className="px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 disabled:bg-gray-400 disabled:cursor-not-allowed"
            >
              {isLoading ? 'Saving...' : segment ? 'Update' : 'Create'} Segment
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}