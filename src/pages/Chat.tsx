import React, { useState, useEffect, useRef } from 'react'
import { MessageSquare, Send } from 'lucide-react'
import { chatAPI, campaignsAPI, segmentsAPI, analyticsAPI } from '../lib/api'
import { Campaign, Segment, AnalyticsData } from '../lib/supabase'
import { logger } from '../lib/logger'

interface ChatMessage {
  id: string
  content: string
  role: 'user' | 'assistant'
  timestamp: string
  suggestions?: string[]
}

export function Chat() {
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([
    {
      id: '1',
      content: "Hello! I'm your AI Marketing Strategist. I can help you create campaigns, analyze customer segments, and optimize your marketing strategy. What would you like to work on today?",
      role: 'assistant',
      timestamp: new Date().toISOString(),
      suggestions: [
        "Create a new email campaign",
        "Analyze customer segments",
        "Review campaign performance",
        "Optimize conversion rates"
      ]
    }
  ])
  const [chatInput, setChatInput] = useState('')
  const [chatLoading, setChatLoading] = useState(false)
  
  // Context data for AI
  const [campaigns, setCampaigns] = useState<Campaign[]>([])
  const [segments, setSegments] = useState<Segment[]>([])
  const [analytics, setAnalytics] = useState<AnalyticsData[]>([])
  
  const messagesEndRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    loadContextData()
  }, [])

  useEffect(() => {
    scrollToBottom()
  }, [chatMessages])

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }

  const loadContextData = async () => {
    logger.info('Loading context data for AI chat', { component: 'Chat' })
    
    try {
      const [campaignsData, segmentsData, analyticsData] = await Promise.all([
        campaignsAPI.getAll(),
        segmentsAPI.getAll(),
        analyticsAPI.getMetrics()
      ])
      
      setCampaigns(campaignsData)
      setSegments(segmentsData)
      setAnalytics(analyticsData)
      
      logger.info('Context data loaded for AI chat', {
        component: 'Chat',
        campaignsCount: campaignsData.length,
        segmentsCount: segmentsData.length
      })
    } catch (error) {
      logger.error('Failed to load context data', {
        component: 'Chat'
      }, error as Error)
    }
  }

  const handleSendMessage = async () => {
    if (!chatInput.trim() || chatLoading) return

    const userMessage: ChatMessage = {
      id: Date.now().toString(),
      content: chatInput,
      role: 'user',
      timestamp: new Date().toISOString()
    }

    logger.info('Sending chat message', {
      component: 'Chat',
      messageLength: chatInput.length
    })

    setChatMessages(prev => [...prev, userMessage])
    setChatInput('')
    setChatLoading(true)

    try {
      // Provide context to the AI about user's current data
      const context = {
        campaigns: campaigns.slice(0, 5), // Send recent campaigns
        segments: segments.slice(0, 5),   // Send top segments
        analytics: analytics.slice(0, 5)  // Send recent analytics
      }
      
      const response = await chatAPI.sendMessage(chatInput, context)
      
      const assistantMessage: ChatMessage = {
        id: (Date.now() + 1).toString(),
        content: response.response,
        role: 'assistant',
        timestamp: new Date().toISOString(),
        suggestions: response.suggestions
      }

      setChatMessages(prev => [...prev, assistantMessage])
      
      logger.info('Chat response received', {
        component: 'Chat',
        responseLength: response.response.length
      })
    } catch (error) {
      logger.error('Failed to send chat message', {
        component: 'Chat'
      }, error as Error)
      
      const errorMessage: ChatMessage = {
        id: (Date.now() + 1).toString(),
        content: "I'm experiencing some technical difficulties right now. Please try again in a moment, or feel free to ask me about your campaigns, segments, or marketing strategy.",
        role: 'assistant',
        timestamp: new Date().toISOString()
      }
      setChatMessages(prev => [...prev, errorMessage])
    } finally {
      setChatLoading(false)
    }
  }

  const handleSuggestionClick = (suggestion: string) => {
    setChatInput(suggestion)
    logger.debug('Suggestion clicked', {
      component: 'Chat',
      suggestion
    })
  }

  return (
    <div className="max-w-4xl mx-auto">
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 h-[calc(100vh-12rem)] flex flex-col">
        {/* Chat Header */}
        <div className="p-6 border-b border-gray-100">
          <div className="flex items-center">
            <div className="w-10 h-10 bg-gradient-to-r from-purple-600 to-pink-600 rounded-full flex items-center justify-center">
              <MessageSquare className="w-5 h-5 text-white" />
            </div>
            <div className="ml-3">
              <h3 className="font-semibold text-gray-900">AI Marketing Strategist</h3>
              <p className="text-sm text-gray-600">Your intelligent marketing assistant</p>
            </div>
          </div>
        </div>

        {/* Chat Messages */}
        <div className="flex-1 overflow-y-auto p-6 space-y-4">
          {chatMessages.map((message) => (
            <div key={message.id} className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}>
              <div className={`max-w-xs lg:max-w-md px-4 py-2 rounded-lg ${
                message.role === 'user'
                  ? 'bg-gradient-to-r from-purple-600 to-pink-600 text-white'
                  : 'bg-gray-100 text-gray-900'
              }`}>
                <p className="text-sm">{message.content}</p>
                {message.suggestions && (
                  <div className="mt-3 space-y-2">
                    {message.suggestions.map((suggestion, index) => (
                      <button
                        key={index}
                        onClick={() => handleSuggestionClick(suggestion)}
                        className="block w-full text-left px-3 py-2 text-xs bg-white bg-opacity-20 rounded border border-white border-opacity-30 hover:bg-opacity-30 transition-all duration-200"
                      >
                        {suggestion}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>
          ))}
          {chatLoading && (
            <div className="flex justify-start">
              <div className="bg-gray-100 text-gray-900 px-4 py-2 rounded-lg">
                <div className="flex items-center space-x-1">
                  <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"></div>
                  <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
                  <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
                </div>
              </div>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Chat Input */}
        <div className="p-6 border-t border-gray-100">
          <div className="flex items-center space-x-4">
            <input
              type="text"
              value={chatInput}
              onChange={(e) => setChatInput(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && handleSendMessage()}
              placeholder="Ask me about your marketing strategy..."
              className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
              disabled={chatLoading}
            />
            <button
              onClick={handleSendMessage}
              disabled={!chatInput.trim() || chatLoading}
              className="bg-gradient-to-r from-purple-600 to-pink-600 text-white p-2 rounded-lg hover:from-purple-700 hover:to-pink-700 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200"
            >
              <Send className="w-5 h-5" />
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}