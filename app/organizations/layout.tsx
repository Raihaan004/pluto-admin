import DashboardLayout from "../dashboard-layout"

export default function OrganizationsLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return <DashboardLayout>{children}</DashboardLayout>
}
