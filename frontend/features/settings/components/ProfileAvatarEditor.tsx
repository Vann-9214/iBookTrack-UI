import React from 'react'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'

interface ProfileAvatarEditorProps {
  name: string
  profilePicture: string | null
  initials: string
  onImageUpload: (e: React.ChangeEvent<HTMLInputElement>) => void
}

export function ProfileAvatarEditor({
  name,
  profilePicture,
  initials,
  onImageUpload,
}: ProfileAvatarEditorProps) {
  return (
    <div className="flex items-center space-x-6">
      <div className="relative">
        <Avatar className="h-24 w-24 border border-border shadow-sm">
          <AvatarImage src={profilePicture || undefined} alt={name} />
          <AvatarFallback className="bg-muted text-xl font-semibold text-foreground">
            {initials}
          </AvatarFallback>
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
            onChange={onImageUpload}
            className="hidden"
          />
        </label>
      </div>
      <div>
        <h3 className="text-lg font-medium text-foreground">Profile Picture</h3>
        <p className="text-sm text-muted-foreground">JPG, PNG or GIF. Max size 2MB.</p>
      </div>
    </div>
  )
}
