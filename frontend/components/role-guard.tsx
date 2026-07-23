"use client"
import React, { cloneElement, isValidElement } from "react"
import { useUser } from "@/hooks/use-user"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"

interface RoleGuardProps {
  allowedRoles: string[];
  children: React.ReactNode;
  action?: "hide" | "disable";
}

export function RoleGuard({ allowedRoles, children, action = "disable" }: RoleGuardProps) {
  const { user, isLoading } = useUser()

  if (isLoading) {
    // Return children as disabled while loading to prevent flashes, 
    // or just return null if hiding.
    if (action === "hide") return null;
    
    if (isValidElement(children)) {
      const childElem = children as React.ReactElement<any>;
      return cloneElement(childElem, {
        disabled: true,
        className: `${(childElem.props.className || "")} opacity-50 cursor-not-allowed`
      });
    }
    return <>{children}</>;
  }

  const hasAccess = user?.role && (user.role === 'supervisor' || allowedRoles.includes(user.role))

  if (hasAccess) {
    return <>{children}</>
  }

  // If action is hide, don't render anything
  if (action === "hide") {
    return null
  }

  // If action is disable, we clone the child element and force it to be disabled
  if (isValidElement(children)) {
    const childElem = children as React.ReactElement<any>;
    const disabledChild = cloneElement(childElem, {
      disabled: true,
      onClick: (e: React.MouseEvent) => {
        e.preventDefault();
        e.stopPropagation();
      },
      "aria-disabled": true,
      className: `${(childElem.props.className || "")} opacity-50 cursor-not-allowed pointer-events-none`
    });

    return (
      <TooltipProvider delayDuration={100}>
        <Tooltip>
          {/* We wrap in a span so the tooltip still triggers even if the inner button is pointer-events-none */}
          <TooltipTrigger asChild>
            <span className="inline-block cursor-not-allowed">
              {disabledChild}
            </span>
          </TooltipTrigger>
          <TooltipContent side="top">
            <p className="text-sm">You do not have permission to perform this action.</p>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    )
  }

  return null
}
