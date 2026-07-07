'use client'

import { useEffect, useMemo, useState } from 'react'
import { DashboardSidebar } from "@/components/dashboard-sidebar"
import { DashboardNavbar } from '@/components/top-bar'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { authFetch } from '@/lib/auth-api'

type ProfileData = {
  name: string
  email: string
  profilePicture: string | null
}

const USER_STORAGE_KEY = 'ibooktrack_user'
const PROFILE_PICTURE_KEY = 'ibooktrack_profile_picture'

function getDisplayNameFromEmail(email: string) {
  const localPart = email.split('@')[0] || ''

  const formattedName = localPart
    .split(/[._\-\s]+/)
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1).toLowerCase())
    .join(' ')

  return formattedName || 'User Account'
}

function getInitials(name: string, email: string) {
  const source = name.trim() || getDisplayNameFromEmail(email)

  return source
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part.charAt(0).toUpperCase())
    .join('') || 'UA'
}

function parseStoredUser(rawUser: string | null): { name?: string; email?: string } | null {
  if (!rawUser) return null

  try {
    return JSON.parse(rawUser) as { name?: string; email?: string }
  } catch {
    return null
  }
}

function decodeTokenUser(token: string | null): { name?: string; email?: string } | null {
  if (!token) return null

  try {
    const payload = token.split('.')[1]
    if (!payload) return null

    const normalizedPayload = payload.replace(/-/g, '+').replace(/_/g, '/')
    const decodedPayload = window.atob(normalizedPayload)
    const parsed = JSON.parse(decodedPayload) as {
      email?: string
      name?: string
      full_name?: string
      user_metadata?: {
        name?: string
        full_name?: string
      }
    }

    const email = parsed.email || ''
    const name = parsed.user_metadata?.full_name || parsed.user_metadata?.name || parsed.full_name || parsed.name || getDisplayNameFromEmail(email)

    if (!name && !email) return null

    return {
      name: name || 'User Account',
      email: email || 'No email available',
    }
  } catch {
    return null
  }
}

export default function SettingsPage() {
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState('')
  const [activeTab, setActiveTab] = useState('profile')

  const [profileData, setProfileData] = useState<ProfileData>({
    name: 'User Account',
    email: 'No email available',
    profilePicture: null,
  })

  useEffect(() => {
    const storedUser = parseStoredUser(window.localStorage.getItem(USER_STORAGE_KEY))
    const tokenUser = decodeTokenUser(window.localStorage.getItem('access_token'))
    const storedPicture = window.localStorage.getItem(PROFILE_PICTURE_KEY)

    setProfileData({
      name: storedUser?.name || tokenUser?.name || 'User Account',
      email: storedUser?.email || tokenUser?.email || 'No email available',
      profilePicture: storedPicture,
    })
  }, [])

  // Password state
  const [passwordData, setPasswordData] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: ''
  })

  const handleProfileUpdate = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setMessage('')

    try {
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000'
      const response = await authFetch(`${apiUrl}/api/auth/profile`, {
        method: 'PATCH',
        body: JSON.stringify({
          name: profileData.name.trim(),
          email: profileData.email.trim().toLowerCase(),
        }),
      })

      const data = await response.json()
      if (!response.ok) {
        throw new Error(data.error || 'Profile update failed')
      }

      const storedUser = {
        name: data.user?.name || profileData.name.trim(),
        email: data.user?.email || profileData.email.trim().toLowerCase(),
        profilePicture: profileData.profilePicture,
      }

      window.localStorage.setItem(USER_STORAGE_KEY, JSON.stringify(storedUser))

      if (profileData.profilePicture) {
        window.localStorage.setItem(PROFILE_PICTURE_KEY, profileData.profilePicture)
      } else {
        window.localStorage.removeItem(PROFILE_PICTURE_KEY)
      }

      window.dispatchEvent(new Event('ibooktrack-user-updated'))
      setMessage(data.message || 'Profile updated successfully!')
      setTimeout(() => setMessage(''), 3000)
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Profile update failed')
    } finally {
      setLoading(false)
    }
  }

  const handlePasswordUpdate = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setMessage('')

    if (passwordData.newPassword !== passwordData.confirmPassword) {
      setMessage('New passwords do not match')
      setLoading(false)
      return
    }

    if (passwordData.newPassword.length < 8) {
      setMessage('Password must be at least 8 characters long')
      setLoading(false)
      return
    }

    try {
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000'
      const response = await authFetch(`${apiUrl}/api/auth/password`, {
        method: 'POST',
        body: JSON.stringify({
          currentPassword: passwordData.currentPassword,
          newPassword: passwordData.newPassword,
        }),
      })

      const data = await response.json()
      if (!response.ok) {
        throw new Error(data.error || 'Password update failed')
      }

      setMessage(data.message || 'Password updated successfully!')
      setPasswordData({ currentPassword: '', newPassword: '', confirmPassword: '' })
      setTimeout(() => setMessage(''), 3000)
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Password update failed')
    } finally {
      setLoading(false)
    }
  }

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      const reader = new FileReader()
      reader.onload = () => {
        setProfileData((prev) => ({
          ...prev,
          profilePicture: typeof reader.result === 'string' ? reader.result : null,
        }))
      }
      reader.readAsDataURL(file)
    }
  }

  const initials = useMemo(() => getInitials(profileData.name, profileData.email), [profileData.email, profileData.name])

  return (
    <div className="flex h-dvh overflow-hidden bg-background">
      <DashboardSidebar />

      {/* Main Content */}
      <main className="flex-1 flex flex-col overflow-hidden">
        <DashboardNavbar />
        <div className="flex-1 h-0 min-h-0 overflow-y-auto">
          <div className="flex flex-col gap-6 p-6 lg:p-8 pb-safe-6">
            {/* Page Header */}
            <header>
              <h1 className="text-2xl font-bold tracking-tight text-foreground">
                Settings
              </h1>
              <p className="mt-1 text-sm text-muted-foreground">
                Manage your account settings and preferences
              </p>
            </header>

            {/* Tabs */}
            <div className="border-b border-gray-200">
              <nav className="flex space-x-8">
                <button
                  onClick={() => setActiveTab('profile')}
                  className={`py-2 px-1 border-b-2 font-medium text-sm transition-colors ${
                    activeTab === 'profile'
                      ? 'border-blue-500 text-blue-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  }`}
                >
                  Edit Profile
                </button>
                <button
                  onClick={() => setActiveTab('password')}
                  className={`py-2 px-1 border-b-2 font-medium text-sm transition-colors ${
                    activeTab === 'password'
                      ? 'border-blue-500 text-blue-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  }`}
                >
                  Reset Password
                </button>
              </nav>
            </div>

            {/* Message */}
            {message && (
              <div className={`p-4 rounded-lg ${
                message.includes('successfully') 
                  ? 'bg-green-50 text-green-800 border border-green-200' 
                  : 'bg-red-50 text-red-800 border border-red-200'
              }`}>
                {message}
              </div>
            )}

            {/* Profile Tab */}
            {activeTab === 'profile' && (
              <div className="bg-card rounded-lg shadow-sm border border-border p-6">
                <form onSubmit={handleProfileUpdate} className="space-y-6">
                  {/* Profile Picture */}
                  <div className="flex items-center space-x-6">
                    <div className="relative">
                      <Avatar className="h-24 w-24 border border-border shadow-sm">
                        <AvatarImage src={profileData.profilePicture || undefined} alt={profileData.name} />
                        <AvatarFallback className="bg-muted text-xl font-semibold text-foreground">{initials}</AvatarFallback>
                      </Avatar>
                      <label
                        htmlFor="profile-picture"
                        className="absolute bottom-0 right-0 cursor-pointer rounded-full bg-primary p-2 text-primary-foreground transition-colors hover:bg-primary/90"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                        </svg>
                        <input
                          id="profile-picture"
                          type="file"
                          accept="image/*"
                          onChange={handleImageUpload}
                          className="hidden"
                        />
                      </label>
                    </div>
                    <div>
                      <h3 className="text-lg font-medium text-foreground">Profile Picture</h3>
                      <p className="text-sm text-muted-foreground">JPG, PNG or GIF. Max size 2MB.</p>
                    </div>
                  </div>

                  {/* Name */}
                  <div>
                    <label htmlFor="name" className="mb-2 block text-sm font-medium text-foreground">
                      Full Name
                    </label>
                    <input
                      id="name"
                      type="text"
                      value={profileData.name}
                      onChange={(e) => setProfileData((prev) => ({ ...prev, name: e.target.value }))}
                      className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm text-foreground outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20"
                      required
                    />
                  </div>

                  {/* Email */}
                  <div>
                    <label htmlFor="email" className="mb-2 block text-sm font-medium text-foreground">
                      Email Address
                    </label>
                    <input
                      id="email"
                      type="email"
                      value={profileData.email}
                      onChange={(e) => setProfileData((prev) => ({ ...prev, email: e.target.value }))}
                      className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm text-foreground outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20"
                      required
                    />
                  </div>

                  {/* Submit Button */}
                  <div className="flex justify-end">
                    <button
                      type="submit"
                      disabled={loading}
                      className="rounded-lg bg-primary px-6 py-2 font-medium text-primary-foreground transition-colors hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      {loading ? 'Saving...' : 'Save Changes'}
                    </button>
                  </div>
                </form>
              </div>
            )}

            {/* Password Tab */}
            {activeTab === 'password' && (
              <div className="bg-card rounded-lg shadow-sm border border-border p-6">
                <form onSubmit={handlePasswordUpdate} className="space-y-6">
                  {/* Current Password */}
                  <div>
                    <label htmlFor="current-password" className="block text-sm font-medium text-gray-700 mb-2">
                      Current Password
                    </label>
                    <input
                      id="current-password"
                      type="password"
                      value={passwordData.currentPassword}
                      onChange={(e) => setPasswordData(prev => ({ ...prev, currentPassword: e.target.value }))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      required
                    />
                  </div>

                  {/* New Password */}
                  <div>
                    <label htmlFor="new-password" className="block text-sm font-medium text-gray-700 mb-2">
                      New Password
                    </label>
                    <input
                      id="new-password"
                      type="password"
                      value={passwordData.newPassword}
                      onChange={(e) => setPasswordData(prev => ({ ...prev, newPassword: e.target.value }))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      required
                      minLength={6}
                    />
                    <p className="text-sm text-gray-500 mt-1">Must be at least 6 characters long</p>
                  </div>

                  {/* Confirm New Password */}
                  <div>
                    <label htmlFor="confirm-password" className="block text-sm font-medium text-gray-700 mb-2">
                      Confirm New Password
                    </label>
                    <input
                      id="confirm-password"
                      type="password"
                      value={passwordData.confirmPassword}
                      onChange={(e) => setPasswordData(prev => ({ ...prev, confirmPassword: e.target.value }))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      required
                      minLength={6}
                    />
                  </div>

                  {/* Submit Button */}
                  <div className="flex justify-end">
                    <button
                      type="submit"
                      disabled={loading}
                      className="px-6 py-2 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {loading ? 'Updating...' : 'Update Password'}
                    </button>
                  </div>
                </form>
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  )
}
