import { useState } from 'react'
import { Link } from 'react-router-dom'
import api from '../utils/api'
import toast from 'react-hot-toast'
import { useAuth } from '../context/AuthContext'

function Home() {
  const { user } = useAuth()
  const [activeTab, setActiveTab] = useState('text')
  const [text, setText] = useState('')
  const [file, setFile] = useState(null)
  const [expiresInMinutes, setExpiresInMinutes] = useState('10')
  const [expiresAt, setExpiresAt] = useState('')
  const [password, setPassword] = useState('')
  const [maxViews, setMaxViews] = useState('')
  const [oneTimeView, setOneTimeView] = useState(false)
  const [maxDownloads, setMaxDownloads] = useState('')
  const [oneTimeDownload, setOneTimeDownload] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [uploadResult, setUploadResult] = useState(null)
  const [linkCopied, setLinkCopied] = useState(false)

  const copyLink = async () => {
    if (!uploadResult?.url) return
    try {
      await navigator.clipboard.writeText(uploadResult.url)
      setLinkCopied(true)
      toast.success('Link copied!')
      setTimeout(() => setLinkCopied(false), 2000)
    } catch {
      toast.error('Failed to copy')
    }
  }

  const handleFileChange = (e) => {
    const selectedFile = e.target.files[0]
    if (selectedFile) {
      if (selectedFile.size > 50 * 1024 * 1024) {
        toast.error('File size must be less than 50MB')
        return
      }
      setFile(selectedFile)
    }
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    
    if (activeTab === 'text' && !text.trim()) {
      toast.error('Please enter some text')
      return
    }
    
    if (activeTab === 'file' && !file) {
      toast.error('Please select a file')
      return
    }

    setUploading(true)
    const loadingToast = toast.loading('Uploading...')

    try {
      const formData = new FormData()
      
      if (activeTab === 'text') {
        formData.append('text', text)
      } else {
        formData.append('file', file)
      }
      
      formData.append('expiresInMinutes', expiresInMinutes)
      if (expiresAt) formData.append('expiresAt', new Date(expiresAt).toISOString())
      if (password.trim()) formData.append('password', password.trim())
      if (activeTab === 'text') {
        if (oneTimeView) formData.append('oneTimeView', 'true')
        if (maxViews.trim()) formData.append('maxViews', maxViews.trim())
      } else {
        if (oneTimeDownload) formData.append('oneTimeDownload', 'true')
        if (maxDownloads.trim()) formData.append('maxDownloads', maxDownloads.trim())
      }

      const response = await api.post('/upload', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      })

      toast.dismiss(loadingToast)
      toast.success('Upload successful!')
      setUploadResult({
        url: response.data.data.url,
        uniqueId: response.data.data.uniqueId,
        deleteToken: response.data.data.deleteToken,
        expiresAt: response.data.data.expiresAt,
        passwordProtected: response.data.data.passwordProtected,
        oneTimeView: response.data.data.oneTimeView,
        maxViews: response.data.data.maxViews,
        oneTimeDownload: response.data.data.oneTimeDownload,
        maxDownloads: response.data.data.maxDownloads,
      })
    } catch (error) {
      toast.dismiss(loadingToast)
      const errorMessage = error.response?.data?.error || 'Upload failed. Please try again.'
      toast.error(errorMessage)
      console.error('Upload error:', error)
    } finally {
      setUploading(false)
    }
  }

  return (
    <div className="min-h-screen py-8 px-4 sm:px-6 lg:px-8">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="text-center mb-12">
          <h1 className="text-5xl font-bold text-gray-900 mb-4">
            <span className="bg-gradient-to-r from-primary-600 to-primary-800 bg-clip-text text-transparent">
              LinkVault
            </span>
          </h1>
          <p className="text-xl text-gray-600">
            Secure file and text sharing made simple
          </p>
          <p className="text-sm text-gray-500 mt-2">
            Share your content with a unique link. Expires automatically.
          </p>
        </div>

        {/* Main Card */}
        <div className="card">
          {/* Tabs */}
          <div className="flex border-b border-gray-200 mb-6">
            <button
              onClick={() => {
                setActiveTab('text')
                setFile(null)
              }}
              className={`flex-1 py-3 px-4 text-center font-semibold transition-colors duration-200 ${
                activeTab === 'text'
                  ? 'text-primary-600 border-b-2 border-primary-600'
                  : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              📝 Text
            </button>
            <button
              onClick={() => {
                setActiveTab('file')
                setText('')
              }}
              className={`flex-1 py-3 px-4 text-center font-semibold transition-colors duration-200 ${
                activeTab === 'file'
                  ? 'text-primary-600 border-b-2 border-primary-600'
                  : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              📎 File
            </button>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Text Input */}
            {activeTab === 'text' && (
              <div>
                <label htmlFor="text" className="block text-sm font-medium text-gray-700 mb-2">
                  Enter your text
                </label>
                <textarea
                  id="text"
                  value={text}
                  onChange={(e) => setText(e.target.value)}
                  rows={12}
                  className="input-field font-mono text-sm resize-none"
                  placeholder="Paste your text here..."
                />
                <p className="mt-2 text-sm text-gray-500">
                  {text.length} characters
                </p>
              </div>
            )}

            {/* File Input */}
            {activeTab === 'file' && (
              <div>
                <label htmlFor="file" className="block text-sm font-medium text-gray-700 mb-2">
                  Select a file
                </label>
                <div className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center hover:border-primary-400 transition-colors duration-200">
                  <input
                    type="file"
                    id="file"
                    onChange={handleFileChange}
                    className="hidden"
                  />
                  <label
                    htmlFor="file"
                    className="cursor-pointer flex flex-col items-center"
                  >
                    <svg
                      className="w-12 h-12 text-gray-400 mb-4"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"
                      />
                    </svg>
                    <span className="text-gray-600 font-medium">
                      {file ? file.name : 'Click to upload or drag and drop'}
                    </span>
                    {file && (
                      <span className="text-sm text-gray-500 mt-2">
                        {(file.size / 1024 / 1024).toFixed(2)} MB
                        {file.size > 50 * 1024 * 1024 && (
                          <span className="text-red-600 ml-2">(Max 50MB)</span>
                        )}
                      </span>
                    )}
                  </label>
                </div>
              </div>
            )}

            {/* Security Options */}
            <div className="space-y-4 border-t pt-4">
              <div>
                <label htmlFor="expiresInMinutes" className="block text-sm font-medium text-gray-700 mb-2">
                  Expires in (minutes)
                </label>
                <input
                  type="number"
                  id="expiresInMinutes"
                  value={expiresInMinutes}
                  onChange={(e) => setExpiresInMinutes(e.target.value)}
                  min="1"
                  className="input-field w-32"
                  placeholder="10"
                />
                <p className="mt-2 text-sm text-gray-500">
                  Default: 10 minutes. Content will be automatically deleted after expiry.
                </p>
              </div>

              <div>
                <label htmlFor="expiresAt" className="block text-sm font-medium text-gray-700 mb-2">
                  Or set exact expiry date & time (optional)
                </label>
                <input
                  type="datetime-local"
                  id="expiresAt"
                  value={expiresAt}
                  onChange={(e) => setExpiresAt(e.target.value)}
                  className="input-field max-w-xs"
                />
                <p className="mt-2 text-sm text-gray-500">
                  If set, this overrides “expires in minutes”.
                </p>
              </div>

              <div>
                <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-2">
                  Password (optional)
                </label>
                <input
                  type="password"
                  id="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="input-field"
                  placeholder="Protect with password"
                />
                <p className="mt-2 text-sm text-gray-500">
                  Require a password to view/download this content.
                </p>
              </div>

              {/* Text: view count options */}
              {activeTab === 'text' && (
                <>
                  <div>
                    <label htmlFor="maxViews" className="block text-sm font-medium text-gray-700 mb-2">
                      Max views (optional)
                    </label>
                    <input
                      type="number"
                      id="maxViews"
                      value={maxViews}
                      onChange={(e) => setMaxViews(e.target.value)}
                      min="1"
                      className="input-field w-32"
                      placeholder="Unlimited"
                    />
                    <p className="mt-2 text-sm text-gray-500">
                      Remaining views decrease after each view. Leave empty for unlimited.
                    </p>
                  </div>
                  <div className="flex items-center gap-4">
                    <label className="flex items-center cursor-pointer">
                      <input
                        type="checkbox"
                        checked={oneTimeView}
                        onChange={(e) => setOneTimeView(e.target.checked)}
                        className="w-4 h-4 text-primary-600 rounded focus:ring-primary-500"
                      />
                      <span className="ml-2 text-sm text-gray-700">One-time view</span>
                    </label>
                    <p className="text-xs text-gray-500">Content deleted after first view</p>
                  </div>
                </>
              )}

              {/* File: download count options */}
              {activeTab === 'file' && (
                <>
                  <div>
                    <label htmlFor="maxDownloads" className="block text-sm font-medium text-gray-700 mb-2">
                      Max downloads (optional)
                    </label>
                    <input
                      type="number"
                      id="maxDownloads"
                      value={maxDownloads}
                      onChange={(e) => setMaxDownloads(e.target.value)}
                      min="1"
                      className="input-field w-32"
                      placeholder="Unlimited"
                    />
                    <p className="mt-2 text-sm text-gray-500">
                      Only downloads are counted. Leave empty for unlimited.
                    </p>
                  </div>
                  <div className="flex items-center gap-4">
                    <label className="flex items-center cursor-pointer">
                      <input
                        type="checkbox"
                        checked={oneTimeDownload}
                        onChange={(e) => setOneTimeDownload(e.target.checked)}
                        className="w-4 h-4 text-primary-600 rounded focus:ring-primary-500"
                      />
                      <span className="ml-2 text-sm text-gray-700">One-time download</span>
                    </label>
                    <p className="text-xs text-gray-500">File deleted after first download</p>
                  </div>
                </>
              )}
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={uploading}
              className="btn-primary w-full py-3 text-lg disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {uploading ? 'Uploading...' : 'Generate Shareable Link'}
            </button>
          </form>

          {/* Shareable link shown just below form (no redirect, so password/one-time not consumed) */}
          {uploadResult && (
            <div className="mt-6 pt-6 border-t border-gray-200">
              <p className="text-sm font-medium text-gray-700 mb-2">Your shareable link</p>
              <div className="flex gap-2">
                <input
                  type="text"
                  readOnly
                  value={uploadResult.url}
                  className="input-field flex-1 font-mono text-sm bg-gray-50"
                />
                <button
                  type="button"
                  onClick={copyLink}
                  className="btn-primary whitespace-nowrap"
                >
                  {linkCopied ? '✓ Copied' : 'Copy'}
                </button>
              </div>
              {uploadResult.passwordProtected && (
                <p className="mt-2 text-sm text-amber-700">
                  🔒 Password protected — recipients will need the password to view or download.
                </p>
              )}
              {uploadResult.oneTimeView && (
                <p className="mt-1 text-sm text-amber-700">
                  ⚠️ One-time view — text will be deleted after the first view.
                </p>
              )}
              {uploadResult.oneTimeDownload && (
                <p className="mt-1 text-sm text-amber-700">
                  ⚠️ One-time download — file will be deleted after the first download.
                </p>
              )}
              <div className="mt-4 flex gap-3">
                <Link
                  to={`/content/${uploadResult.uniqueId}`}
                  state={{ deleteToken: uploadResult.deleteToken }}
                  className="btn-secondary text-sm inline-block"
                >
                  Open content page
                </Link>
                <button
                  type="button"
                  onClick={() => { setUploadResult(null); setText(''); setFile(null); }}
                  className="text-sm text-gray-600 hover:text-gray-900"
                >
                  Create another link
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Features */}
        <div className="mt-12 grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="card text-center">
            <div className="text-3xl mb-3">🔒</div>
            <h3 className="font-semibold text-gray-900 mb-2">Secure</h3>
            <p className="text-sm text-gray-600">
              Content accessible only via unique link
            </p>
          </div>
          <div className="card text-center">
            <div className="text-3xl mb-3">⏱️</div>
            <h3 className="font-semibold text-gray-900 mb-2">Auto-Expiry</h3>
            <p className="text-sm text-gray-600">
              Automatically deletes after expiry time
            </p>
          </div>
          <div className="card text-center">
            <div className="text-3xl mb-3">⚡</div>
            <h3 className="font-semibold text-gray-900 mb-2">Fast</h3>
            <p className="text-sm text-gray-600">
              Quick upload and instant link generation
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}

export default Home
