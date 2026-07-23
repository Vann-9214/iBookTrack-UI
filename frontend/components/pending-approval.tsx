'use client'

import { Mail, Clock, LogOut } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card'
import { useAuth } from '@/features/authentication/hooks/useAuth'

export function PendingApproval() {
  const { logout } = useAuth()

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <Card className="w-full max-w-md shadow-lg border-0 bg-white">
        <CardHeader className="text-center pb-2">
          <div className="w-16 h-16 mx-auto bg-amber-100 rounded-full flex items-center justify-center mb-4">
            <Clock className="w-8 h-8 text-amber-600" />
          </div>
          <CardTitle className="text-2xl font-bold text-gray-900">Account Pending Approval</CardTitle>
          <CardDescription className="text-gray-500 pt-2 text-base">
            Your account has been created successfully, but it requires administrator approval before you can access the system.
          </CardDescription>
        </CardHeader>
        
        <CardContent className="pt-6">
          <div className="bg-gray-50 rounded-xl p-4 border border-gray-100 flex items-start gap-4">
            <div className="bg-blue-100 p-2 rounded-lg mt-0.5">
              <Mail className="w-5 h-5 text-blue-600" />
            </div>
            <div>
              <h3 className="font-semibold text-gray-900 text-sm">Need access urgently?</h3>
              <p className="text-sm text-gray-500 mt-1">
                Please contact the system administrator or your supervisor to approve your role assignment.
              </p>
              <a href="mailto:support@innodata.com" className="text-blue-600 text-sm font-medium mt-2 inline-block hover:underline">
                support@innodata.com
              </a>
            </div>
          </div>
        </CardContent>

        <CardFooter className="flex flex-col gap-3 pb-8 pt-2">
          <Button 
            className="w-full h-11" 
            onClick={() => window.location.reload()}
          >
            Check Status Again
          </Button>
          <Button 
            variant="ghost" 
            className="w-full text-gray-500 hover:text-gray-900" 
            onClick={logout}
          >
            <LogOut className="w-4 h-4 mr-2" />
            Sign Out
          </Button>
        </CardFooter>
      </Card>
    </div>
  )
}
