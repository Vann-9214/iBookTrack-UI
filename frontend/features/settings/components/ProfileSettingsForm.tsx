import React from 'react'
import type { ProfileData } from '../types/settings.types'
import { ProfileAvatarEditor } from './ProfileAvatarEditor'

interface ProfileSettingsFormProps {
  profileData: ProfileData
  initials: string
  loading: boolean
  onProfileDataChange: React.Dispatch<React.SetStateAction<ProfileData>>
  onImageUpload: (e: React.ChangeEvent<HTMLInputElement>) => void
  onSubmit: (e: React.FormEvent) => Promise<void>
}

export function ProfileSettingsForm({
  profileData,
  initials,
  loading,
  onProfileDataChange,
  onImageUpload,
  onSubmit,
}: ProfileSettingsFormProps) {
  return (
    <div className="bg-card rounded-lg shadow-sm border border-border p-6">
      <form onSubmit={onSubmit} className="space-y-6">
        {/* Profile Picture */}
        <ProfileAvatarEditor
          name={profileData.name}
          profilePicture={profileData.profilePicture}
          initials={initials}
          onImageUpload={onImageUpload}
        />

        {/* Name */}
        <div>
          <label htmlFor="name" className="mb-2 block text-sm font-medium text-foreground">
            Full Name
          </label>
          <input
            id="name"
            type="text"
            value={profileData.name}
            onChange={(e) => onProfileDataChange((prev) => ({ ...prev, name: e.target.value }))}
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
            onChange={(e) => onProfileDataChange((prev) => ({ ...prev, email: e.target.value }))}
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
  )
}
