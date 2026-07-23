import { useState, useCallback } from 'react'
import { PROFILE_PICTURE_KEY } from '../utils/settings.helpers'

export function useProfilePicture(
  initialPicture: string | null = null,
  onPictureChange?: (picture: string | null) => void
) {
  const [profilePicture, setProfilePicture] = useState<string | null>(initialPicture)

  const handleImageUpload = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0]
      if (file) {
        const reader = new FileReader()
        reader.onload = () => {
          const result = typeof reader.result === 'string' ? reader.result : null
          setProfilePicture(result)
          if (onPictureChange) {
            onPictureChange(result)
          }
        }
        reader.readAsDataURL(file)
      }
    },
    [onPictureChange]
  )

  const saveProfilePicture = useCallback((picture: string | null) => {
    if (typeof window === 'undefined') return
    if (picture) {
      window.localStorage.setItem(PROFILE_PICTURE_KEY, picture)
    } else {
      window.localStorage.removeItem(PROFILE_PICTURE_KEY)
    }
  }, [])

  const getStoredProfilePicture = useCallback((): string | null => {
    if (typeof window === 'undefined') return null
    return window.localStorage.getItem(PROFILE_PICTURE_KEY)
  }, [])

  return {
    profilePicture,
    setProfilePicture,
    handleImageUpload,
    saveProfilePicture,
    getStoredProfilePicture,
  }
}
