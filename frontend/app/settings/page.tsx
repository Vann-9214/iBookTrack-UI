'use client'

import { DashboardSidebar } from '@/components/dashboard-sidebar'
import { DashboardNavbar } from '@/components/top-bar'
import { PageHeader } from '@/components/page-header'
import { Settings } from 'lucide-react'
import { useSettings } from '@/features/settings/hooks'
import {
  SettingsTabs,
  ProfileSettingsForm,
  PasswordSettingsForm,
} from '@/features/settings/components'

export default function SettingsPage() {
  const {
    loading,
    message,
    activeTab,
    setActiveTab,
    profileData,
    setProfileData,
    passwordData,
    setPasswordData,
    initials,
    handleProfileSubmit,
    handlePasswordSubmit,
    handleImageUpload,
  } = useSettings()

  return (
    <div className="flex h-dvh overflow-hidden bg-background">
      <DashboardSidebar />

      {/* Main Content */}
      <main className="flex-1 flex flex-col overflow-hidden">
        <DashboardNavbar />
        <div className="ambient-bg flex-1 h-0 min-h-0 overflow-y-auto">
          <div className="flex flex-col gap-6 p-6 lg:p-8 pb-safe-6">
            {/* Page Header */}
            <PageHeader
              title="Settings"
              subtitle="Manage your account settings and preferences"
              icon={Settings}
            />

            {/* Tabs */}
            <SettingsTabs activeTab={activeTab} onTabChange={setActiveTab} />

            {/* Message */}
            {message && (
              <div
                className={`p-4 rounded-lg ${
                  message.includes('successfully')
                    ? 'bg-green-50 text-green-800 border border-green-200'
                    : 'bg-red-50 text-red-800 border border-red-200'
                }`}
              >
                {message}
              </div>
            )}

            {/* Profile Tab */}
            {activeTab === 'profile' && (
              <ProfileSettingsForm
                profileData={profileData}
                initials={initials}
                loading={loading}
                onProfileDataChange={setProfileData}
                onImageUpload={handleImageUpload}
                onSubmit={handleProfileSubmit}
              />
            )}

            {/* Password Tab */}
            {activeTab === 'password' && (
              <PasswordSettingsForm
                passwordData={passwordData}
                loading={loading}
                onPasswordDataChange={setPasswordData}
                onSubmit={handlePasswordSubmit}
              />
            )}
          </div>
        </div>
      </main>
    </div>
  )
}
