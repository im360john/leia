import { useState } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../hooks/useAuth'

interface TestResult {
  type: string
  success: boolean
  data?: any
  error?: string
  timestamp: string
}

export default function SnowflakeTest() {
  const { user } = useAuth()
  const [loading, setLoading] = useState(false)
  const [results, setResults] = useState<TestResult[]>([])
  const [customQuery, setCustomQuery] = useState('SELECT COUNT(*) FROM RETAIL_ANALYTICS.DBT_CUSTOMER.CUSTOMER_FACT')

  const addResult = (type: string, success: boolean, data?: any, error?: string) => {
    setResults(prev => [{
      type,
      success,
      data,
      error,
      timestamp: new Date().toISOString()
    }, ...prev])
  }

  const testSchema = async () => {
    setLoading(true)
    try {
      const { data, error } = await supabase.functions.invoke('snowflake', {
        body: {
          type: 'schema',
          table: 'CUSTOMER_FACT'
        }
      })

      if (error) throw error
      addResult('Schema Query', true, data)
    } catch (error: any) {
      addResult('Schema Query', false, null, error.message)
    } finally {
      setLoading(false)
    }
  }

  const testCount = async () => {
    setLoading(true)
    try {
      const { data, error } = await supabase.functions.invoke('snowflake', {
        body: {
          type: 'count',
          whereClause: 'TOTAL_SPEND > 1000'
        }
      })

      if (error) throw error
      addResult('Count Query', true, data)
    } catch (error: any) {
      addResult('Count Query', false, null, error.message)
    } finally {
      setLoading(false)
    }
  }

  const testPreview = async () => {
    setLoading(true)
    try {
      const { data, error } = await supabase.functions.invoke('snowflake', {
        body: {
          type: 'preview',
          limit: 5
        }
      })

      if (error) throw error
      addResult('Preview Query', true, data)
    } catch (error: any) {
      addResult('Preview Query', false, null, error.message)
    } finally {
      setLoading(false)
    }
  }

  const testCustomQuery = async () => {
    setLoading(true)
    try {
      const { data, error } = await supabase.functions.invoke('snowflake', {
        body: {
          type: 'execute',
          query: customQuery
        }
      })

      if (error) throw error
      addResult('Custom Query', true, data)
    } catch (error: any) {
      addResult('Custom Query', false, null, error.message)
    } finally {
      setLoading(false)
    }
  }

  const runAllTests = async () => {
    await testSchema()
    await testCount()
    await testPreview()
  }

  const clearResults = () => {
    setResults([])
  }

  if (!user) {
    return (
      <div className="p-8">
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
          <p className="text-yellow-800">Please sign in to test Snowflake integration</p>
        </div>
      </div>
    )
  }

  return (
    <div className="p-8">
      <div className="max-w-6xl mx-auto">
        <h1 className="text-3xl font-bold mb-8">Snowflake Integration Test</h1>
        
        <div className="bg-white rounded-lg shadow p-6 mb-6">
          <h2 className="text-xl font-semibold mb-4">Test Controls</h2>
          
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
            <button
              onClick={testSchema}
              disabled={loading}
              className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 disabled:opacity-50"
            >
              Test Schema
            </button>
            
            <button
              onClick={testCount}
              disabled={loading}
              className="px-4 py-2 bg-green-500 text-white rounded hover:bg-green-600 disabled:opacity-50"
            >
              Test Count
            </button>
            
            <button
              onClick={testPreview}
              disabled={loading}
              className="px-4 py-2 bg-purple-500 text-white rounded hover:bg-purple-600 disabled:opacity-50"
            >
              Test Preview
            </button>
            
            <button
              onClick={runAllTests}
              disabled={loading}
              className="px-4 py-2 bg-indigo-500 text-white rounded hover:bg-indigo-600 disabled:opacity-50"
            >
              Run All Tests
            </button>
          </div>

          <div className="border-t pt-4">
            <h3 className="text-lg font-medium mb-2">Custom Query</h3>
            <div className="flex gap-2">
              <input
                type="text"
                value={customQuery}
                onChange={(e) => setCustomQuery(e.target.value)}
                className="flex-1 px-3 py-2 border border-gray-300 rounded-md"
                placeholder="Enter SQL query..."
              />
              <button
                onClick={testCustomQuery}
                disabled={loading || !customQuery}
                className="px-4 py-2 bg-orange-500 text-white rounded hover:bg-orange-600 disabled:opacity-50"
              >
                Execute
              </button>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-xl font-semibold">Test Results</h2>
            <button
              onClick={clearResults}
              className="text-sm text-gray-600 hover:text-gray-900"
            >
              Clear Results
            </button>
          </div>
          
          {results.length === 0 ? (
            <p className="text-gray-500">No test results yet. Click a test button above.</p>
          ) : (
            <div className="space-y-4">
              {results.map((result, index) => (
                <div
                  key={index}
                  className={`p-4 rounded-lg border ${
                    result.success 
                      ? 'bg-green-50 border-green-200' 
                      : 'bg-red-50 border-red-200'
                  }`}
                >
                  <div className="flex justify-between items-start mb-2">
                    <h3 className="font-medium">
                      {result.success ? '✅' : '❌'} {result.type}
                    </h3>
                    <span className="text-sm text-gray-600">
                      {new Date(result.timestamp).toLocaleTimeString()}
                    </span>
                  </div>
                  
                  {result.error ? (
                    <p className="text-red-700 text-sm">{result.error}</p>
                  ) : (
                    <pre className="text-xs bg-white p-2 rounded overflow-x-auto">
                      {JSON.stringify(result.data, null, 2)}
                    </pre>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}