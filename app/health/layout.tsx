import DashboardLayout from "../dashboard-layout"

export default function HealthLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return <DashboardLayout>{children}</DashboardLayout>
}
