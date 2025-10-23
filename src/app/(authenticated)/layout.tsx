import { AuthenticatedWrapper } from './authenticated-wrapper'

export default function AuthenticatedLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return <AuthenticatedWrapper>{children}</AuthenticatedWrapper>
}
