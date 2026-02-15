import { useState, useEffect, useRef } from 'react'
import { useParams, useNavigate, Link, useLocation } from 'react-router-dom'
import api from '../utils/api'
import toast from 'react-hot-toast'
import { useAuth } from '../context/AuthContext'

function ViewContent() {
  const { id } = useParams()
  const navigate = useNavigate()
  const location = useLocation()
  const { user } = useAuth()
  const [content, setContent] = useState(null)
  const [loading, setLoading] = useState(true)
  const [password, setPassword] = useState('')
  const [passwordPrompt, setPasswordPrompt] = useState(false)
  const [copied, setCopied] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const deleteToken = location.state?.deleteToken
  const hasRecordedView = useRef(false)

  useEffect(() => {
    fetchContent()
  }, [id])

  const fetchContent = async (pwd = null) => {
    try {
      setLoading(true)
      const url = `/content/${id}${pwd ? `?password=${encodeURIComponent(pwd)}` : ''}`
      const response = await api.get(url)
      setContent(response.data.data)
      setPasswordPrompt(false)
      if (pwd) setPassword(pwd) // Store password for future requests
      
      // Record view for text content (once)
      if (response.data.data.contentType === 'text' && !hasRecordedView.current) {
        hasRecordedView.current = true
        try {
          await api.post(`/content/${id}/record-view`, { password: pwd || '' })
          // Refresh to get updated view count
          const refresh = await api.get(url)
          setContent(refresh.data.data)
        } catch (err) {
          console.error('Failed to record view:', err)
        }
      }
    } catch (error) {
      if (error.response?.status === 403 && error.response?.data?.requiresPassword) {
        setPasswordPrompt(true)
        setLoading(false)
        return
      }
      if (error.response?.status === 404) {
        toast.error('Content not found')
      } else if (error.response?.status === 410) {
        toast.error(error.response?.data?.error || 'Content has expired or been used')
      } else {
        toast.error(error.response?.data?.error || 'Failed to load content')
      }
      setTimeout(() => navigate('/'), 2000)
    } finally {
      setLoading(false)
    }
  }

  const handlePasswordSubmit = (e) => {
    e.preventDefault()
    if (!password.trim()) {
      toast.error('Password required')
      return
    }
    fetchContent(password.trim())
  }

  const handleDownload = async () => {
    if (!content || content.contentType !== 'file') return
    const pwd = password.trim() || undefined
    const downloadUrl = `/api/files/${id}${pwd ? `?password=${encodeURIComponent(pwd)}` : ''}`
    window.location.href = downloadUrl
  }

  const handleDelete = async () => {
    if (!deleteToken && !user) {
      toast.error('Delete token not available')
      return
    }
    if (!confirm('Are you sure you want to delete this content?')) return
    setDeleting(true)
    try {
      await api.delete(`/content/${id}`, {
        data: { deleteToken: deleteToken || undefined }
      })
      toast.success('Content deleted')
      navigate('/')
    } catch (error) {
      toast.error(error.response?.data?.error || 'Delete failed')
    } finally {
      setDeleting(false)
    }
  }

  const copyToClipboard = async (text) => {
    try {
      await navigator.clipboard.writeText(text)
      setCopied(true)
      toast.success('Copied to clipboard!')
      setTimeout(() => setCopied(false), 2000)
    } catch (error) {
      toast.error('Failed to copy')
    }
  }

  const formatFileSize = (bytes) => {
    if (!bytes) return '0 Bytes'
    const k = 1024
    const sizes = ['Bytes', 'KB', 'MB', 'GB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i]
  }

  const formatDate = (dateString) => {
    const date = new Date(dateString)
    return date.toLocaleString()
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading content...</p>
        </div>
      </div>
    )
  }

  if (passwordPrompt) {
    return (
      <div className="min-h-screen flex items-center justify-center py-12 px-4">
        <div className="max-w-md w-full card">
          <h2 className="text-2xl font-bold text-gray-900 mb-4">Password Required</h2>
          <p className="text-gray-600 mb-6">This content is password protected.</p>
          <form onSubmit={handlePasswordSubmit} className="space-y-4">
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Enter password"
              className="input-field"
              required
              autoFocus
            />
            <button type="submit" className="btn-primary w-full">Access Content</button>
          </form>
        </div>
      </div>
    )
  }

  if (!content) {
    return null
  }

  return (
    <div className="min-h-screen py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-4xl mx-auto">
        <div className="mb-8">
          <Link to="/" className="inline-flex items-center text-primary-600 hover:text-primary-700 mb-4">
            <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
            </svg>
            Back to Home
          </Link>
        </div>

        <div className="card mb-6">
          <div className="mb-6 pb-6 border-b border-gray-200">
            <label className="block text-sm font-medium text-gray-700 mb-2">Shareable Link</label>
            <div className="flex gap-2">
              <input
                type="text"
                value={window.location.href}
                readOnly
                className="input-field flex-1 font-mono text-sm bg-gray-50"
              />
              <button onClick={() => copyToClipboard(window.location.href)} className="btn-primary whitespace-nowrap">
                {copied ? '✓ Copied' : 'Copy Link'}
              </button>
            </div>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6 text-sm">
            <div>
              <p className="text-gray-500">Type</p>
              <p className="font-semibold text-gray-900 capitalize">{content.contentType}</p>
            </div>
            {content.contentType === 'text' && (
              <div>
                <p className="text-gray-500">View count</p>
                <p className="font-semibold text-gray-900">
                  {content.viewCount}{content.maxViews != null ? ` / ${content.maxViews}` : ''}
                  {content.maxViews != null && (
                    <span className="text-primary-600 ml-1">
                      ({Math.max(0, content.maxViews - content.viewCount)} left)
                    </span>
                  )}
                </p>
              </div>
            )}
            {content.contentType === 'file' && (
              <div>
                <p className="text-gray-500">Download count</p>
                <p className="font-semibold text-gray-900">
                  {content.downloadCount}{content.maxDownloads != null ? ` / ${content.maxDownloads}` : ''}
                  {content.maxDownloads != null && (
                    <span className="text-primary-600 ml-1">
                      ({Math.max(0, content.maxDownloads - content.downloadCount)} left)
                    </span>
                  )}
                </p>
              </div>
            )}
            <div>
              <p className="text-gray-500">Created</p>
              <p className="font-semibold text-gray-900">{formatDate(content.createdAt)}</p>
            </div>
            <div>
              <p className="text-gray-500">Expires</p>
              <p className="font-semibold text-gray-900">{formatDate(content.expiresAt)}</p>
            </div>
          </div>

          {content.contentType === 'text' && content.oneTimeView && (
            <div className="mb-4 bg-red-50 border border-red-200 rounded-lg p-3">
              <p className="text-sm text-red-800 font-medium">⚠️ One-time view: This text will be deleted after first view</p>
            </div>
          )}
          {content.contentType === 'file' && content.oneTimeDownload && (
            <div className="mb-4 bg-red-50 border border-red-200 rounded-lg p-3">
              <p className="text-sm text-red-800 font-medium">⚠️ One-time download: This file will be deleted after first download</p>
            </div>
          )}

          {content.contentType === 'text' && (
            <div>
              <div className="flex justify-between items-center mb-3">
                <label className="block text-sm font-medium text-gray-700">Text Content</label>
                <button onClick={() => copyToClipboard(content.textContent)} className="btn-secondary text-sm py-1 px-3">
                  Copy Text
                </button>
              </div>
              <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
                <pre className="whitespace-pre-wrap font-mono text-sm text-gray-900 overflow-x-auto">
                  {content.textContent}
                </pre>
              </div>
            </div>
          )}

          {content.contentType === 'file' && (
            <div>
              <div className="bg-gray-50 rounded-lg p-6 border border-gray-200 text-center">
                <div className="text-5xl mb-4">
                  {content.mimeType?.startsWith('image/') ? '🖼️' :
                   content.mimeType?.startsWith('video/') ? '🎥' :
                   content.mimeType?.startsWith('audio/') ? '🎵' :
                   content.mimeType?.includes('pdf') ? '📄' : '📎'}
                </div>
                <h3 className="text-lg font-semibold text-gray-900 mb-2">{content.fileName}</h3>
                <p className="text-sm text-gray-600 mb-4">{formatFileSize(content.fileSize)}</p>
                <button onClick={handleDownload} className="btn-primary inline-block">
                  Download File
                </button>
              </div>
            </div>
          )}

          {(deleteToken || user) && (
            <div className="mt-6 pt-6 border-t border-gray-200">
              <button
                onClick={handleDelete}
                disabled={deleting}
                className="btn-secondary text-red-600 hover:bg-red-50 border-red-300"
              >
                {deleting ? 'Deleting...' : 'Delete Content'}
              </button>
            </div>
          )}
        </div>

        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
          <div className="flex items-start">
            <svg className="w-5 h-5 text-yellow-600 mt-0.5 mr-3" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
            </svg>
            <div>
              <p className="text-sm font-medium text-yellow-800">Content expires on {formatDate(content.expiresAt)}</p>
              <p className="text-sm text-yellow-700 mt-1">This content will be automatically deleted after the expiry time.</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default ViewContent
