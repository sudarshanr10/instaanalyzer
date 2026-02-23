import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Users, UserMinus, UserPlus, Heart, Search,
  Upload, Download, RefreshCw, ExternalLink,
  TrendingUp, BarChart3, Sparkles, Instagram
} from 'lucide-react'
import './App.css'

const isExtension = typeof chrome !== 'undefined' && chrome.storage

const generateSampleData = () => {
  const names = ['alex.creates', 'jordan_photo', 'sam.designs', 'taylor.dev', 'morgan.art',
    'casey_music', 'riley.codes', 'drew.films', 'jamie.writes', 'quinn.builds',
    'avery.shoots', 'blake.makes', 'cameron.draws', 'dakota.sings', 'emerson.plays',
    'finley.edits', 'harper.snaps', 'indigo.vibes', 'jules.crafts', 'kai.streams']

  const fullNames = ['Alex Johnson', 'Jordan Smith', 'Sam Williams', 'Taylor Brown', 'Morgan Davis',
    'Casey Miller', 'Riley Wilson', 'Drew Moore', 'Jamie Taylor', 'Quinn Anderson',
    'Avery Thomas', 'Blake Jackson', 'Cameron White', 'Dakota Harris', 'Emerson Martin',
    'Finley Adams', 'Harper Lee', 'Indigo Ray', 'Jules Kim', 'Kai Chen']

  const createUser = (i) => ({
    username: names[i % names.length] + (i > 19 ? `_${i}` : ''),
    full_name: fullNames[i % fullNames.length],
    profile_pic_url: `https://i.pravatar.cc/150?img=${(i % 70) + 1}`,
    id: `user_${i}`
  })

  const followers = Array.from({ length: 67 }, (_, i) => createUser(i))
  const following = Array.from({ length: 74 }, (_, i) => createUser(i + 8))

  return { followers, following }
}

function App() {
  const [data, setData] = useState(null)
  const [activeTab, setActiveTab] = useState('dontFollowBack')
  const [searchTerm, setSearchTerm] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [showUpload, setShowUpload] = useState(false)
  const [dragActive, setDragActive] = useState(false)
  const [fetchedAt, setFetchedAt] = useState(null)
  const [ready, setReady] = useState(false)

  useEffect(() => {
    loadFromStorage()
  }, [])

  const loadFromStorage = async () => {
    if (isExtension) {
      try {
        const stored = await chrome.storage.local.get(['instagramData', 'fetchedAt'])

        if (stored.instagramData) {
          setData(analyzeData(stored.instagramData))
          setFetchedAt(stored.fetchedAt)
          setShowUpload(false)
        } else {
          setShowUpload(true)
        }
      } catch (error) {
        console.error('Error loading from storage:', error)
        setShowUpload(true)
      }
    } else {
      setShowUpload(true)
    }

    setReady(true)
  }

  const analyzeData = (rawData) => {
    const { followers, following } = rawData
    const followerUsernames = new Set(followers.map(f => f.username.toLowerCase()))
    const followingUsernames = new Set(following.map(f => f.username.toLowerCase()))

    return {
      followers,
      following,
      dontFollowBack: following.filter(u => !followerUsernames.has(u.username.toLowerCase())),
      iDontFollowBack: followers.filter(u => !followingUsernames.has(u.username.toLowerCase())),
      mutuals: following.filter(u => followerUsernames.has(u.username.toLowerCase()))
    }
  }

  const loadDemoData = () => {
    setIsLoading(true)
    setTimeout(() => {
      setData(analyzeData(generateSampleData()))
      setShowUpload(false)
      setIsLoading(false)
    }, 1800)
  }

  const handleFileUpload = async (files) => {
    setIsLoading(true)
    const rawData = { followers: null, following: null }

    for (const file of files) {
      if (file.name.endsWith('.json')) {
        const text = await file.text()
        const json = JSON.parse(text)
        const fileName = file.name.toLowerCase()

        if (fileName.includes('follower') && !fileName.includes('following')) {
          rawData.followers = parseInstagramData(json, 'followers')
        } else if (fileName.includes('following')) {
          rawData.following = parseInstagramData(json, 'following')
        }
      }
    }

    if (rawData.followers && rawData.following) {
      setData(analyzeData(rawData))
      setShowUpload(false)
    } else {
      alert('Please upload both followers and following JSON files')
    }
    setIsLoading(false)
  }

  const parseInstagramData = (json, type) => {
    const key = type === 'followers' ? 'relationships_followers' : 'relationships_following'
    const arr = json[key] || json

    return (Array.isArray(arr) ? arr : []).map(item => {
      const userData = item.string_list_data?.[0] || {}
      return {
        username: userData.value || item.value || 'Unknown',
        full_name: '',
        profile_pic_url: `https://i.pravatar.cc/150?u=${userData.value || item.value}`,
        id: userData.value
      }
    }).filter(u => u.username !== 'Unknown')
  }

  const handleDrop = (e) => {
    e.preventDefault()
    setDragActive(false)
    handleFileUpload(e.dataTransfer.files)
  }

  const clearData = async () => {
    if (isExtension) {
      await chrome.storage.local.remove(['instagramData', 'fetchedAt'])
    }
    setData(null)
    setShowUpload(true)
    setSearchTerm('')
    setFetchedAt(null)
  }

  const refreshData = () => {
    if (isExtension) {
      chrome.tabs.create({ url: 'https://www.instagram.com/' })
    }
    clearData()
  }

  const filteredUsers = data ?
    data[activeTab]?.filter(u =>
      u.username.toLowerCase().includes(searchTerm.toLowerCase()) ||
      u.full_name?.toLowerCase().includes(searchTerm.toLowerCase())
    ) : []

  const tabs = [
    { id: 'dontFollowBack', label: "Don't Follow Back", icon: UserMinus, color: '#ff6b6b' },
    { id: 'iDontFollowBack', label: "Fans Only", icon: UserPlus, color: '#4ecdc4' },
    { id: 'mutuals', label: 'Mutuals', icon: Heart, color: '#f472b6' },
    { id: 'followers', label: 'All Followers', icon: Users, color: '#00d4ff' },
    { id: 'following', label: 'All Following', icon: TrendingUp, color: '#fbbf24' },
  ]

  const downloadCSV = () => {
    const csv = filteredUsers.map(u => `${u.username},${u.full_name || ''}`).join('\n')
    const blob = new Blob([`username,full_name\n${csv}`], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `instagram-${activeTab}.csv`
    a.click()
    URL.revokeObjectURL(url)
  }

  const downloadJSON = () => {
    const blob = new Blob([JSON.stringify(filteredUsers, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `instagram-${activeTab}.json`
    a.click()
    URL.revokeObjectURL(url)
  }

  const formatDate = (timestamp) => {
    if (!timestamp) return ''
    return new Date(timestamp).toLocaleDateString('en-US', {
      month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit'
    })
  }

  if (!ready) return null

  return (
    <div className="app">
      <div className="bg-effects">
        <div className="gradient-sphere sphere-1" />
        <div className="gradient-sphere sphere-2" />
        <div className="gradient-sphere sphere-3" />
        <div className="grid-overlay" />
        <div className="noise" />
      </div>

      <header className="header">
        <motion.div
          className="logo"
          initial={{ opacity: 0, x: -30 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.6 }}
        >
          <div className="logo-icon">
            <BarChart3 size={26} />
            <Sparkles size={14} className="sparkle" />
          </div>
          <div className="logo-text">
            <h1>InstaAnalyzer</h1>
            <span>Follower Intelligence</span>
          </div>
        </motion.div>

        {data && (
          <motion.div
            className="header-actions"
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
          >
            {fetchedAt && (
              <span className="fetched-time">Updated {formatDate(fetchedAt)}</span>
            )}
            <motion.button
              className="reset-btn"
              onClick={refreshData}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
            >
              <RefreshCw size={18} />
              <span>Refresh</span>
            </motion.button>
          </motion.div>
        )}
      </header>

      <main className="main">
        <AnimatePresence mode="wait">
          {showUpload ? (
            <motion.section
              className="upload-section"
              key="upload"
              initial={{ opacity: 0, y: 50 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -50 }}
              transition={{ duration: 0.5 }}
            >
              <motion.div
                className="hero-text"
                initial={{ opacity: 0, y: 30 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 }}
              >
                <h2>
                  Discover Your
                  <span className="gradient-text"> True Connections</span>
                </h2>
                <p>Analyze your Instagram relationships and find out who really has your back</p>
              </motion.div>

              {isExtension ? (
                <motion.div
                  className="extension-prompt"
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: 0.3 }}
                >
                  <div className="prompt-icon">
                    <Instagram size={48} />
                  </div>
                  <h3>No data yet</h3>
                  <p>Go to Instagram and click the extension icon to analyze your followers</p>
                  <motion.a
                    href="https://www.instagram.com/"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="demo-btn"
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                  >
                    <Instagram size={20} />
                    <span>Open Instagram</span>
                  </motion.a>
                </motion.div>
              ) : (
                <>
                  <motion.div
                    className={`upload-zone ${dragActive ? 'active' : ''} ${isLoading ? 'loading' : ''}`}
                    onDragOver={(e) => { e.preventDefault(); setDragActive(true) }}
                    onDragLeave={() => setDragActive(false)}
                    onDrop={handleDrop}
                    onClick={() => !isLoading && document.getElementById('fileInput').click()}
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ delay: 0.3 }}
                    whileHover={!isLoading ? { scale: 1.02, transition: { duration: 0.2 } } : {}}
                  >
                    <input
                      type="file"
                      id="fileInput"
                      multiple
                      accept=".json"
                      hidden
                      onChange={(e) => handleFileUpload(e.target.files)}
                    />

                    {isLoading ? (
                      <div className="loading-state">
                        <div className="loader">
                          <div className="loader-ring" />
                          <div className="loader-ring" />
                          <div className="loader-ring" />
                        </div>
                        <span>Analyzing your connections...</span>
                      </div>
                    ) : (
                      <>
                        <div className="upload-icon">
                          <Upload size={40} />
                        </div>
                        <h3>Drop your Instagram data</h3>
                        <p>Upload followers.json & following.json</p>
                        <span className="upload-cta">Click or drag files here</span>
                      </>
                    )}

                    <div className="upload-glow" />
                  </motion.div>

                  <motion.div
                    className="divider"
                    initial={{ opacity: 0, scaleX: 0 }}
                    animate={{ opacity: 1, scaleX: 1 }}
                    transition={{ delay: 0.4 }}
                  >
                    <span>or try it out</span>
                  </motion.div>

                  <motion.button
                    className="demo-btn"
                    onClick={loadDemoData}
                    disabled={isLoading}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.5 }}
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                  >
                    <Sparkles size={20} />
                    <span>Load Demo Data</span>
                  </motion.button>
                </>
              )}

              <motion.div
                className="instructions"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.6 }}
              >
                <h4>{isExtension ? 'How to use' : 'How to get your data'}</h4>
                <div className="steps">
                  {isExtension ? (
                    <>
                      <div className="step"><span className="step-num">1</span><p>Go to instagram.com and log in</p></div>
                      <div className="step"><span className="step-num">2</span><p>Click the InstaAnalyzer extension icon</p></div>
                      <div className="step"><span className="step-num">3</span><p>Click "Analyze My Followers"</p></div>
                      <div className="step"><span className="step-num">4</span><p>Wait for analysis to complete</p></div>
                    </>
                  ) : (
                    <>
                      <div className="step"><span className="step-num">1</span><p>Open Instagram Settings</p></div>
                      <div className="step"><span className="step-num">2</span><p>Go to Accounts Center → Download your information</p></div>
                      <div className="step"><span className="step-num">3</span><p>Select "Followers and following" in JSON format</p></div>
                      <div className="step"><span className="step-num">4</span><p>Download and upload here</p></div>
                    </>
                  )}
                </div>
              </motion.div>
            </motion.section>
          ) : (
            <motion.section
              className="dashboard"
              key="dashboard"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.5 }}
            >
              <div className="stats-grid">
                {[
                  { label: 'Total Followers', value: data.followers.length, icon: Users, gradient: 'cyan' },
                  { label: 'Total Following', value: data.following.length, icon: TrendingUp, gradient: 'purple' },
                  { label: "Don't Follow Back", value: data.dontFollowBack.length, icon: UserMinus, gradient: 'red' },
                  { label: 'Fans Only', value: data.iDontFollowBack.length, icon: UserPlus, gradient: 'teal' },
                  { label: 'Mutuals', value: data.mutuals.length, icon: Heart, gradient: 'pink' },
                ].map((stat, i) => (
                  <motion.div
                    key={stat.label}
                    className={`stat-card gradient-${stat.gradient}`}
                    initial={{ opacity: 0, y: 40, rotateX: -15 }}
                    animate={{ opacity: 1, y: 0, rotateX: 0 }}
                    transition={{ delay: i * 0.1 }}
                    whileHover={{ y: -8, transition: { duration: 0.2 } }}
                  >
                    <div className="stat-icon">
                      <stat.icon size={22} />
                    </div>
                    <div className="stat-content">
                      <span className="stat-value">{stat.value.toLocaleString()}</span>
                      <span className="stat-label">{stat.label}</span>
                    </div>
                    <div className="stat-bg" />
                  </motion.div>
                ))}
              </div>

              <motion.div
                className="tabs-wrapper"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.5 }}
              >
                <div className="tabs">
                  {tabs.map((tab) => (
                    <button
                      key={tab.id}
                      className={`tab ${activeTab === tab.id ? 'active' : ''}`}
                      onClick={() => { setActiveTab(tab.id); setSearchTerm(''); }}
                      style={{ '--color': tab.color }}
                    >
                      <tab.icon size={18} />
                      <span className="tab-label">{tab.label}</span>
                      <span className="tab-badge">{data[tab.id]?.length || 0}</span>
                    </button>
                  ))}
                </div>
              </motion.div>

              <motion.div
                className="users-panel"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.6 }}
              >
                <div className="panel-header">
                  <div className="search-container">
                    <Search size={20} />
                    <input
                      type="text"
                      placeholder="Search users..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                    />
                    {searchTerm && (
                      <button className="clear-search" onClick={() => setSearchTerm('')}>×</button>
                    )}
                  </div>
                  <div className="panel-actions">
                    <button className="action-btn" onClick={downloadCSV}>
                      <Download size={16} />
                      CSV
                    </button>
                    <button className="action-btn" onClick={downloadJSON}>
                      <Download size={16} />
                      JSON
                    </button>
                  </div>
                </div>

                <div className="users-count">
                  Showing <strong>{filteredUsers.length}</strong> users
                </div>

                <div className="users-grid">
                  <AnimatePresence mode="popLayout">
                    {filteredUsers.map((user, i) => (
                      <motion.a
                        key={user.username + user.id}
                        href={`https://instagram.com/${user.username}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="user-card"
                        initial={{ opacity: 0, scale: 0.8 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0, scale: 0.8 }}
                        transition={{ delay: Math.min(i * 0.015, 0.3) }}
                        whileHover={{ y: -6, transition: { duration: 0.15 } }}
                        layout
                      >
                        <div className="avatar-wrapper">
                          <img
                            src={user.profile_pic_url}
                            alt={user.username}
                            loading="lazy"
                            onError={(e) => {
                              e.target.src = `https://ui-avatars.com/api/?name=${user.username.charAt(0)}&background=random&color=fff&size=150`
                            }}
                          />
                          <div className="avatar-border" />
                        </div>
                        <div className="user-details">
                          <span className="username">@{user.username}</span>
                          {user.full_name && <span className="fullname">{user.full_name}</span>}
                        </div>
                        <ExternalLink size={14} className="link-icon" />
                      </motion.a>
                    ))}
                  </AnimatePresence>
                </div>

                {filteredUsers.length === 0 && (
                  <motion.div
                    className="empty-state"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                  >
                    <Search size={48} />
                    <h4>No users found</h4>
                    <p>Try a different search term</p>
                  </motion.div>
                )}
              </motion.div>
            </motion.section>
          )}
        </AnimatePresence>
      </main>
    </div>
  )
}

export default App
