import { Sidebar } from "@/components/shared/Sidebar"
import { currentUser } from "@clerk/nextjs/server"
import { redirect } from "next/navigation"

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const user = await currentUser()

  if (!user || user.publicMetadata?.platform_admin !== true) {
    return (
      <div className="flex h-screen w-full bg-zinc-50 dark:bg-black font-sans">
        <Sidebar />
        <main className="flex-1 flex flex-col items-center justify-center p-24 bg-red-50 dark:bg-red-900/10">
          <div className="max-w-md text-center">
            <h1 className="text-4xl font-black text-red-600 mb-4 tracking-tight">ACCESS DENIED</h1>
            <p className="text-lg text-zinc-600 dark:text-zinc-400 mb-8">
              This administrative console is restricted to Platform Administrators. 
              Your account does not have the required <code>platform_admin</code> metadata.
            </p>
            <div className="p-4 bg-white dark:bg-zinc-900 rounded-xl border border-red-100 dark:border-red-900/30 text-sm text-left">
              <p className="font-bold text-red-600 mb-2">How to fix this:</p>
              <ol className="list-decimal ml-4 space-y-2 text-zinc-500">
                <li>Go to Clerk Dashboard</li>
                <li>Find your user account</li>
                <li>Set <strong>Public Metadata</strong> to <code>{"{ \"platform_admin\": true }"}</code></li>
                <li>Sign out and sign back in to refresh your session</li>
              </ol>
            </div>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="flex h-screen w-full bg-zinc-50 dark:bg-black overflow-hidden font-sans">
      <Sidebar />
      <main className="flex-1 overflow-y-auto p-8">
        {children}
      </main>
    </div>
  )
}
