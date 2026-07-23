"use client"
import React, { createContext, useContext, useEffect, useState } from "react"
import { fetchUserProfile } from "@/lib/auth-api"

type UserProfile = {
  id: string;
  name: string;
  email: string;
  role?: string | null;
}

type UserContextType = {
  user: UserProfile | null;
  isLoading: boolean;
  refreshUser: () => Promise<void>;
}

const UserContext = createContext<UserContextType | undefined>(undefined)

export function UserProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<UserProfile | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  const refreshUser = async () => {
    setIsLoading(true)
    const fetchedUser = await fetchUserProfile()
    setUser(fetchedUser)
    setIsLoading(false)
  }

  useEffect(() => {
    refreshUser()
  }, [])

  return (
    <UserContext.Provider value={{ user, isLoading, refreshUser }}>
      {children}
    </UserContext.Provider>
  )
}

export function useUser() {
  const context = useContext(UserContext)
  if (context === undefined) {
    throw new Error("useUser must be used within a UserProvider")
  }
  return context
}
