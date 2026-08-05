import React from 'react'
import type { PasswordData } from '../types/settings.types'

interface PasswordSettingsFormProps {
  passwordData: PasswordData
  loading: boolean
  onPasswordDataChange: React.Dispatch<React.SetStateAction<PasswordData>>
  onSubmit: (e: React.FormEvent) => Promise<void>
}

export function PasswordSettingsForm({
  passwordData,
  loading,
  onPasswordDataChange,
  onSubmit,
}: PasswordSettingsFormProps) {
  return (
    <div className="bg-card rounded-lg shadow-sm border border-border p-6">
      <form onSubmit={onSubmit} className="space-y-6">
        {/* Current Password */}
        <div>
          <label htmlFor="current-password" className="block text-sm font-medium text-gray-700 mb-2">
            Current Password
          </label>
          <input
            id="current-password"
            type="password"
            value={passwordData.currentPassword}
            onChange={(e) => onPasswordDataChange((prev) => ({ ...prev, currentPassword: e.target.value }))}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary"
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
            onChange={(e) => onPasswordDataChange((prev) => ({ ...prev, newPassword: e.target.value }))}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary"
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
            onChange={(e) => onPasswordDataChange((prev) => ({ ...prev, confirmPassword: e.target.value }))}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary"
            required
            minLength={6}
          />
        </div>

        {/* Submit Button */}
        <div className="flex justify-end">
          <button
            type="submit"
            disabled={loading}
            className="px-6 py-2 bg-primary text-white font-medium rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? 'Updating...' : 'Update Password'}
          </button>
        </div>
      </form>
    </div>
  )
}
