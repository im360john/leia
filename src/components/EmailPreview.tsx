import React, { useState, useEffect, useCallback } from 'react'
import { X, Monitor, Smartphone } from 'lucide-react'
import { render } from '@react-email/render'
import { MarketingEmailTemplate } from '../lib/emailTemplates'

interface EmailPreviewProps {
  isOpen: boolean
  onClose: () => void
  subject: string
  content: string
  companyName?: string
  recipientName?: string
}

export function EmailPreview({
  isOpen,
  onClose,
  subject,
  content,
  companyName = 'Leia',
  recipientName = 'John'
}: EmailPreviewProps) {
  const [previewMode, setPreviewMode] = useState<'desktop' | 'mobile'>('desktop')
  const [htmlContent, setHtmlContent] = useState('')
  const [loading, setLoading] = useState(true)

  const generatePreview = useCallback(async () => {
    setLoading(true)
    try {
      // Generate HTML from React Email template
      const html = await render(
        <MarketingEmailTemplate
          subject={subject}
          content={content}
          companyName={companyName}
          recipientName={recipientName}
          previewText={subject}
          ctaText="Learn More"
          ctaUrl="https://example.com"
        />,
        { pretty: true }
      )
      setHtmlContent(html)
    } catch (error) {
      console.error('Error generating email preview:', error)
      // Fallback to simple HTML
      setHtmlContent(`
        <html>
          <body style="font-family: Arial, sans-serif; padding: 20px;">
            <h2>${subject}</h2>
            <div>${content}</div>
          </body>
        </html>
      `)
    } finally {
      setLoading(false)
    }
  }, [content, subject, companyName, recipientName])

  useEffect(() => {
    if (isOpen && content) {
      generatePreview()
    }
  }, [isOpen, content, generatePreview])

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-6xl h-[90vh] flex flex-col">
        {/* Header */}
        <div className="p-4 border-b border-gray-200 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <h3 className="text-lg font-semibold text-gray-900">Email Preview</h3>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setPreviewMode('desktop')}
                className={`p-2 rounded-lg ${
                  previewMode === 'desktop'
                    ? 'bg-purple-100 text-purple-600'
                    : 'text-gray-600 hover:bg-gray-100'
                }`}
                title="Desktop view"
              >
                <Monitor className="w-4 h-4" />
              </button>
              <button
                onClick={() => setPreviewMode('mobile')}
                className={`p-2 rounded-lg ${
                  previewMode === 'mobile'
                    ? 'bg-purple-100 text-purple-600'
                    : 'text-gray-600 hover:bg-gray-100'
                }`}
                title="Mobile view"
              >
                <Smartphone className="w-4 h-4" />
              </button>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Email Info */}
        <div className="px-4 py-3 border-b border-gray-200 bg-gray-50">
          <div className="text-sm">
            <p className="text-gray-600">
              <span className="font-medium">From:</span> {companyName} &lt;noreply@{companyName.toLowerCase()}.com&gt;
            </p>
            <p className="text-gray-600">
              <span className="font-medium">To:</span> {recipientName} &lt;{recipientName.toLowerCase()}@example.com&gt;
            </p>
            <p className="text-gray-600">
              <span className="font-medium">Subject:</span> {subject}
            </p>
          </div>
        </div>

        {/* Preview Content */}
        <div className="flex-1 overflow-hidden bg-gray-100 p-4">
          <div
            className={`bg-white mx-auto h-full overflow-auto rounded-lg shadow-sm ${
              previewMode === 'mobile' ? 'max-w-sm' : 'max-w-4xl'
            }`}
          >
            {loading ? (
              <div className="flex items-center justify-center h-full">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600"></div>
              </div>
            ) : (
              <iframe
                srcDoc={htmlContent}
                className="w-full h-full border-0"
                title="Email Preview"
                sandbox="allow-same-origin"
              />
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-gray-200 bg-gray-50">
          <p className="text-sm text-gray-600 text-center">
            This is how your email will appear to recipients. 
            Actual rendering may vary slightly depending on the email client.
          </p>
        </div>
      </div>
    </div>
  )
}