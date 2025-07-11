// Utility functions for segment SQL generation

export interface FilterRule {
  id: string
  field: string
  operator: string
  value: string | number
  valueType: 'text' | 'number' | 'date' | 'select'
  table?: 'customer' | 'sales' | 'product'
}

export interface FilterGroup {
  id: string
  logic: 'AND' | 'OR'
  rules: FilterRule[]
}

export interface SegmentSQLResult {
  customerWhere: string
  salesWhere: string
  needsJoin: boolean
  combinedLogic: 'AND' | 'OR'
}

// Build SQL conditions from a single rule
function buildRuleCondition(rule: FilterRule, tableAlias: string = ''): string | null {
  if (!rule.field || !rule.operator) return null
  
  const field = tableAlias ? `${tableAlias}.${rule.field}` : rule.field
  
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
      if (values.length === 2) {
        return `${field} BETWEEN ${values[0]} AND ${values[1]}`
      }
      return null
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
}

// Separate filter groups by table
export function buildSegmentSQL(filterGroups: FilterGroup[]): SegmentSQLResult {
  const customerConditions: string[] = []
  const salesConditions: string[] = []
  let overallLogic: 'AND' | 'OR' = 'AND'
  
  // Process each filter group
  filterGroups.forEach((group, groupIndex) => {
    if (group.rules.length === 0) return
    
    // Separate rules by table
    const customerRules = group.rules.filter(rule => 
      !rule.table || rule.table === 'customer'
    )
    const salesRules = group.rules.filter(rule => 
      rule.table === 'sales'
    )
    
    // Build conditions for customer rules
    if (customerRules.length > 0) {
      const customerGroupConditions = customerRules
        .map(rule => buildRuleCondition(rule, 'c'))
        .filter(Boolean)
      
      if (customerGroupConditions.length > 0) {
        customerConditions.push(`(${customerGroupConditions.join(` ${group.logic} `)})`)
      }
    }
    
    // Build conditions for sales rules
    if (salesRules.length > 0) {
      const salesGroupConditions = salesRules
        .map(rule => buildRuleCondition(rule, 's'))
        .filter(Boolean)
      
      if (salesGroupConditions.length > 0) {
        salesConditions.push(`(${salesGroupConditions.join(` ${group.logic} `)})`)
      }
    }
    
    // For now, we'll use OR between groups (can be enhanced later)
    if (groupIndex > 0) {
      overallLogic = 'OR'
    }
  })
  
  return {
    customerWhere: customerConditions.join(' OR '),
    salesWhere: salesConditions.join(' OR '),
    needsJoin: salesConditions.length > 0,
    combinedLogic: overallLogic
  }
}

// Build a complete customer count query
export function buildCustomerCountQuery(filterGroups: FilterGroup[]): string {
  const { customerWhere, salesWhere, needsJoin } = buildSegmentSQL(filterGroups)
  const orgFilter = "c.ORG_ID = '0273cbe1-667c-4421-a875-d65afff0280b'"
  
  if (!needsJoin) {
    // Simple query - only customer conditions
    const whereClause = customerWhere 
      ? `${orgFilter} AND (${customerWhere})`
      : orgFilter
      
    return `
      SELECT COUNT(*) as count 
      FROM RETAIL_ANALYTICS.DBT_CUSTOMER.CUSTOMER_FACT c
      WHERE ${whereClause}
    `
  } else {
    // Complex query - need to join with sales
    const customerWhereClause = customerWhere 
      ? `${orgFilter} AND (${customerWhere})`
      : orgFilter
      
    return `
      SELECT COUNT(DISTINCT c.CUSTOMER_ID) as count 
      FROM RETAIL_ANALYTICS.DBT_CUSTOMER.CUSTOMER_FACT c
      INNER JOIN RETAIL_ANALYTICS.DBT_TICKET.TICKETLINE_SALES s
        ON c.ORG_ID = s.ORG_ID 
        AND c.STORE_ID = s.STORE_ID 
        AND c.CUSTOMER_ID = s.CUSTOMER_ID
      WHERE ${customerWhereClause}
        ${salesWhere ? `AND (${salesWhere})` : ''}
    `
  }
}

// Build a query for segment performance analytics
export function buildSegmentAnalyticsQuery(
  filterGroups: FilterGroup[], 
  dateRange: number,
  productFilters?: { brand?: string; type?: string; subtype?: string }
): { 
  customerQuery: string
  salesQuery: string 
  trendQuery: string 
} {
  const { customerWhere, salesWhere, needsJoin } = buildSegmentSQL(filterGroups)
  const orgFilter = "c.ORG_ID = '0273cbe1-667c-4421-a875-d65afff0280b'"
  
  // Build customer metrics query
  let customerQuery = ''
  
  if (!needsJoin || !salesWhere) {
    // Simple case: only customer conditions
    const customerWhereClause = customerWhere 
      ? `${orgFilter} AND (${customerWhere})`
      : orgFilter
      
    customerQuery = `
      SELECT 
        COUNT(*) as total_customers,
        AVG(LIFETIME_GROSS_RECEIPTS) as avg_lifetime_gross_receipts,
        SUM(LIFETIME_GROSS_RECEIPTS) as total_lifetime_gross_receipts,
        AVG(LIFETIME_TRANSACTIONS) as avg_lifetime_transactions,
        SUM(LIFETIME_TRANSACTIONS) as total_lifetime_transactions,
        AVG(LIFETIME_DISCOUNTS) as avg_lifetime_discounts,
        SUM(LIFETIME_DISCOUNTS) as total_lifetime_discounts
      FROM RETAIL_ANALYTICS.DBT_CUSTOMER.CUSTOMER_FACT c
      WHERE ${customerWhereClause}
    `
  } else {
    // Complex case: need to filter customers based on their sales
    const customerWhereClause = customerWhere 
      ? `${orgFilter} AND (${customerWhere})`
      : orgFilter
      
    customerQuery = `
      WITH filtered_customers AS (
        SELECT DISTINCT c.*
        FROM RETAIL_ANALYTICS.DBT_CUSTOMER.CUSTOMER_FACT c
        INNER JOIN RETAIL_ANALYTICS.DBT_TICKET.TICKETLINE_SALES s
          ON c.ORG_ID = s.ORG_ID 
          AND c.STORE_ID = s.STORE_ID 
          AND c.CUSTOMER_ID = s.CUSTOMER_ID
        WHERE ${customerWhereClause}
          ${salesWhere ? `AND (${salesWhere})` : ''}
      )
      SELECT 
        COUNT(*) as total_customers,
        AVG(LIFETIME_GROSS_RECEIPTS) as avg_lifetime_gross_receipts,
        SUM(LIFETIME_GROSS_RECEIPTS) as total_lifetime_gross_receipts,
        AVG(LIFETIME_TRANSACTIONS) as avg_lifetime_transactions,
        SUM(LIFETIME_TRANSACTIONS) as total_lifetime_transactions,
        AVG(LIFETIME_DISCOUNTS) as avg_lifetime_discounts,
        SUM(LIFETIME_DISCOUNTS) as total_lifetime_discounts
      FROM filtered_customers
    `
  }
  
  // Build sales metrics query
  const dateFilter = `s.DATE_CLOSE >= DATEADD(day, -${dateRange}, CURRENT_DATE())`
  const productConditions: string[] = []
  
  if (productFilters?.brand) {
    productConditions.push(`s.PRODUCT_BRAND = '${productFilters.brand}'`)
  }
  if (productFilters?.type) {
    productConditions.push(`s.PRODUCT_TYPE = '${productFilters.type}'`)
  }
  if (productFilters?.subtype) {
    productConditions.push(`s.PRODUCT_SUBTYPE = '${productFilters.subtype}'`)
  }
  
  const salesQuery = `
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
      ${customerWhere ? `AND (${customerWhere})` : ''}
      ${salesWhere ? `AND (${salesWhere})` : ''}
      ${productConditions.length > 0 ? `AND ${productConditions.join(' AND ')}` : ''}
  `
  
  // Build trend query
  const trendQuery = `
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
      ${customerWhere ? `AND (${customerWhere})` : ''}
      ${salesWhere ? `AND (${salesWhere})` : ''}
      ${productConditions.length > 0 ? `AND ${productConditions.join(' AND ')}` : ''}
    GROUP BY DATE(s.DATE_CLOSE)
    ORDER BY sale_date ASC
  `
  
  return {
    customerQuery,
    salesQuery,
    trendQuery
  }
}

// Build a complete product count query
export function buildProductCountQuery(filterGroups: FilterGroup[]): string {
  const conditions: string[] = []
  const orgFilter = '"Org Id" = \'0273cbe1-667c-4421-a875-d65afff0280b\''
  
  // Process each filter group
  filterGroups.forEach((group) => {
    const groupConditions = group.rules
      .filter(rule => rule.field && rule.value)
      .map(rule => {
        const field = mapProductFieldToColumn(rule.field)
        const operator = mapOperator(rule.operator)
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
    
    if (groupConditions.length > 0) {
      conditions.push(`(${groupConditions.join(` ${group.logic} `)})`)
    }
  })
  
  const whereClause = conditions.length > 0 
    ? `${orgFilter} AND (${conditions.join(' OR ')})`
    : orgFilter
  
  return `
    SELECT COUNT(DISTINCT "Product Id") as count 
    FROM RETAIL_ANALYTICS.DBT_RETAIL_ANALYTICS.RA_PRODUCT_SALES_AND_INVENTORY_V1
    WHERE ${whereClause}
  `
}

// Map filter field names to product table column names
function mapProductFieldToColumn(field: string): string {
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

// Map simple operators to SQL operators
function mapOperator(operator: string): string {
  const mapping: Record<string, string> = {
    '=': '=',
    '!=': '!=',
    '>': '>',
    '>=': '>=',
    '<': '<',
    '<=': '<=',
    'LIKE': 'LIKE',
    'NOT LIKE': 'NOT LIKE',
    'ILIKE': 'ILIKE',
    'NOT ILIKE': 'NOT ILIKE',
    'IN': 'IN',
    'NOT IN': 'NOT IN',
    'equals': '=',
    'not_equals': '!=',
    'contains': 'LIKE',
    'not_contains': 'NOT LIKE',
    'greater_than': '>',
    'less_than': '<',
    'greater_than_equal': '>=',
    'less_than_equal': '<='
  }
  return mapping[operator] || operator
}