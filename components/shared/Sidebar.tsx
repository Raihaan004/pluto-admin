"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { LayoutDashboard, Users, Shield, Settings, Activity, ClipboardList } from "lucide-react"
import { UserButton } from "@clerk/nextjs"
import { cn } from "@/lib/utils"

const menuItems = [
  { title: "Dashboard", href: "/", icon: LayoutDashboard },
  { title: "Organizations", href: "/organizations", icon: Users },
  { title: "Licenses", href: "/licenses", icon: Shield },
  { title: "System Health", href: "/health", icon: Activity },
  { title: "Global Logs", href: "/logs", icon: ClipboardList },
  { title: "Global Settings", href: "/settings", icon: Settings },
]

export function Sidebar() {
  const pathname = usePathname()

  return (
    <div className="flex h-screen w-64 flex-col border-r bg-white dark:bg-zinc-950">
      <div className="flex h-16 items-center border-bottom px-6">
        <span className="text-xl font-bold text-blue-600">Pluto Admin</span>
      </div>
      
      <nav className="flex-1 space-y-1 px-4 py-4">
        {menuItems.map((item) => {
          const isActive = pathname === item.href
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "group flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
                isActive 
                  ? "bg-blue-50 text-blue-700 dark:bg-blue-900/20 dark:text-blue-300" 
                  : "text-zinc-600 hover:bg-zinc-50 hover:text-zinc-900 dark:text-zinc-400 dark:hover:bg-zinc-900 dark:hover:text-zinc-100"
              )}
            >
              <item.icon className={cn("h-5 w-5", isActive ? "text-blue-600" : "text-zinc-500")} />
              {item.title}
            </Link>
          )
        })}
      </nav>

      <div className="border-t p-4">
        <div className="flex items-center gap-3 px-2">
          <UserButton afterSignOutUrl="/sign-in" />
          <div className="flex flex-col overflow-hidden">
            <span className="text-sm font-medium truncate">Admin Console</span>
          </div>
        </div>
      </div>
    </div>
  )
}
