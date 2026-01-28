import DashboardLayout from "../dashboard-layout"

export default function LogsLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return <DashboardLayout>{children}</DashboardLayout>
}
