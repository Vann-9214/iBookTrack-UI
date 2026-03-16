'use client'

import { useState } from 'react'
import { DashboardSidebar } from "@/components/dashboard-sidebar"
import { ScrollArea } from "@/components/ui/scroll-area"
import Image from 'next/image'

export default function SettingsPage() {
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState('')
  const [activeTab, setActiveTab] = useState('profile')

  // Profile state
  const [profileData, setProfileData] = useState({
    name: 'John Doe',
    email: 'john.doe@example.com',
    profilePicture: '/default-avatar.png'
  })

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

    // Simulate API call
    await new Promise((res) => setTimeout(res, 1000))
    
    setLoading(false)
    setMessage('Profile updated successfully!')
    setTimeout(() => setMessage(''), 3000)
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

    if (passwordData.newPassword.length < 6) {
      setMessage('Password must be at least 6 characters long')
      setLoading(false)
      return
    }

    // Simulate API call
    await new Promise((res) => setTimeout(res, 1000))
    
    setLoading(false)
    setMessage('Password updated successfully!')
    setPasswordData({ currentPassword: '', newPassword: '', confirmPassword: '' })
    setTimeout(() => setMessage(''), 3000)
  }

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      // In a real app, you would upload to a server
      // For now, we'll use a placeholder
      setProfileData(prev => ({
        ...prev,
        profilePicture: URL.createObjectURL(file)
      }))
    }
  }

  return (
    <div className="flex h-screen overflow-hidden bg-background">
      <DashboardSidebar />

      {/* Main Content */}
      <main className="flex-1 flex flex-col overflow-hidden">
        <ScrollArea className="flex-1 h-0 min-h-0">
          <div className="flex flex-col gap-6 p-6 lg:p-8">
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
              <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                <form onSubmit={handleProfileUpdate} className="space-y-6">
                  {/* Profile Picture */}
                  <div className="flex items-center space-x-6">
                    <div className="relative">
                      <Image
                        src={profileData.profilePicture}
                        alt="Profile"
                        width={100}
                        height={100}
                        className="rounded-full object-cover"
                      />
                      <label
                        htmlFor="profile-picture"
                        className="absolute bottom-0 right-0 bg-blue-600 text-white p-2 rounded-full cursor-pointer hover:bg-blue-700 transition-colors"
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
                      <h3 className="text-lg font-medium text-gray-900">Profile Picture</h3>
                      <p className="text-sm text-gray-500">JPG, PNG or GIF. Max size 2MB.</p>
                    </div>
                  </div>

                  {/* Name */}
                  <div>
                    <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-2">
                      Full Name
                    </label>
                    <input
                      id="name"
                      type="text"
                      value={profileData.name}
                      onChange={(e) => setProfileData(prev => ({ ...prev, name: e.target.value }))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      required
                    />
                  </div>

                  {/* Email */}
                  <div>
                    <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-2">
                      Email Address
                    </label>
                    <input
                      id="email"
                      type="email"
                      value={profileData.email}
                      onChange={(e) => setProfileData(prev => ({ ...prev, email: e.target.value }))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      required
                    />
                  </div>

                  {/* Submit Button */}
                  <div className="flex justify-end">
                    <button
                      type="submit"
                      disabled={loading}
                      className="px-6 py-2 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {loading ? 'Saving...' : 'Save Changes'}
                    </button>
                  </div>
                </form>
              </div>
            )}

            {/* Password Tab */}
            {activeTab === 'password' && (
              <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
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
        </ScrollArea>
      </main>
    </div>
  )
}
