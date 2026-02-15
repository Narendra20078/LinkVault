import { useState, useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import api from '../utils/api'
import toast from 'react-hot-toast'
import { useAuth } from '../context/AuthContext'

function MyLinks() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const [links, setLinks] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!user) {
      navigate('/login')
      return
    }
    fetchLinks()
  }, [user, navigate])

  const fetchLinks = async () => {
    try {
      const res = await api.get('/content/mine/list')
      setLinks(res.data.data)
    } catch (error) {
      toast.error('Failed to load your links')
    } finally {
      setLoading(false)
    }
  }

  const handleDelete = async (uniqueId) => {
    if (!confirm('Delete this content?')) return
    try {
      await api.delete(`/content/${uniqueId}`)
      toast.success('Deleted')
      fetchLinks()
    } catch (error) {
      toast.error(error.response?.data?.error || 'Delete failed')
    }
  }

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleString()
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-6xl mx-auto">
        <div className="mb-8">
          <Link to="/" className="inline-flex items-center text-primary-600 hover:text-primary-700 mb-4">
            <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
            </svg>
            Back to Home
          </Link>
          <h1 className="text-4xl font-bold text-gray-900">My Links</h1>
        </div>

        {links.length === 0 ? (
          <div className="card text-center py-12">
            <p className="text-gray-600 mb-4">You haven't created any links yet.</p>
            <Link to="/" className="btn-primary inline-block">Create Your First Link</Link>
          </div>
        ) : (
          <div className="space-y-4">
            {links.map((link) => (
              <div key={link.uniqueId} className="card">
                <div className="flex justify-between items-start">
                  <div className="flex-1">
                    <Link
                      to={`/content/${link.uniqueId}`}
                      className="text-primary-600 hover:text-primary-700 font-mono text-sm break-all"
                    >
                      {window.location.origin}/content/{link.uniqueId}
                    </Link>
                    <div className="mt-2 flex gap-4 text-sm text-gray-600">
                      <span className="capitalize">{link.contentType}</span>
                      {link.fileName && <span>{link.fileName}</span>}
                      {link.contentType === 'text' && (
                        <span>Views: {link.viewCount}{link.maxViews != null ? ` / ${link.maxViews}` : ''}</span>
                      )}
                      {link.contentType === 'file' && (
                        <span>Downloads: {link.downloadCount}{link.maxDownloads != null ? ` / ${link.maxDownloads}` : ''}</span>
                      )}
                      {link.passwordProtected && <span className="text-primary-600">🔒 Protected</span>}
                      {link.oneTimeView && <span className="text-red-600">⚠️ One-time view</span>}
                      {link.oneTimeDownload && <span className="text-red-600">⚠️ One-time download</span>}
                    </div>
                    <p className="text-xs text-gray-500 mt-1">
                      Created: {formatDate(link.createdAt)} • Expires: {formatDate(link.expiresAt)}
                    </p>
                  </div>
                  <button
                    onClick={() => handleDelete(link.uniqueId)}
                    className="btn-secondary text-red-600 hover:bg-red-50 border-red-300 ml-4"
                  >
                    Delete
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

export default MyLinks
