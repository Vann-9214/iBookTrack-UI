import { useEffect, useState, useMemo, useCallback } from 'react'
import type { ProfileData, PasswordData, SettingsTab } from '../types/settings.types'
import { getProfile, updateProfile, updatePassword } from '../services/settings.service'
import { getInitials, PROFILE_PICTURE_KEY } from '../utils/settings.helpers'

export function useSettings() {
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState('')
  const [activeTab, setActiveTab] = useState<SettingsTab>('profile')

  const [profileData, setProfileData] = useState<ProfileData>({
    name: 'User Account',
    email: 'No email available',
    profilePicture: null,
  })

  const [passwordData, setPasswordData] = useState<PasswordData>({
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
  })

  useEffect(() => {
    const syncUser = async () => {
      const profile = await getProfile()
      const storedPicture = typeof window !== 'undefined' ? window.localStorage.getItem(PROFILE_PICTURE_KEY) : null
      setProfileData({
        name: profile?.name || 'User Account',
        email: profile?.email || 'No email available',
        profilePicture: storedPicture,
      })
    }
    syncUser()
  }, [])

  const initials = useMemo(
    () => getInitials(profileData.name, profileData.email),
    [profileData.email, profileData.name]
  )

  const handleProfileSubmit = useCallback(async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setMessage('')

    try {
      // Only the name is submitted — the email shown on the form is read-only
      // account information, not an editable field.
      const data = await updateProfile({
        name: profileData.name,
      })

      if (typeof window !== 'undefined') {
        if (profileData.profilePicture) {
          window.localStorage.setItem(PROFILE_PICTURE_KEY, profileData.profilePicture)
        } else {
          window.localStorage.removeItem(PROFILE_PICTURE_KEY)
        }
        window.dispatchEvent(new Event('ibooktrack-user-updated'))
      }

      setMessage(data.message || 'Profile updated successfully!')
      setTimeout(() => setMessage(''), 3000)
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Profile update failed')
    } finally {
      setLoading(false)
    }
  }, [profileData])

  const handlePasswordSubmit = useCallback(async (e: React.FormEvent) => {
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
      const data = await updatePassword({
        currentPassword: passwordData.currentPassword,
        newPassword: passwordData.newPassword,
      })

      setMessage(data.message || 'Password updated successfully!')
      setPasswordData({ currentPassword: '', newPassword: '', confirmPassword: '' })
      setTimeout(() => setMessage(''), 3000)
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Password update failed')
    } finally {
      setLoading(false)
    }
  }, [passwordData])

  const handleImageUpload = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
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
  }, [])

  return {
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
  }
}
