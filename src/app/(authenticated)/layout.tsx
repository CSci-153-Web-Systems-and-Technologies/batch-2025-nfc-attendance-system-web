export default function AuthenticatedLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <>
      {/* Remove sidebar for authenticated pages - override root layout */}
      <style jsx global>{`
        body > div {
          display: block !important;
        }
        body > div > aside {
          display: none !important;
        }
        body > div > main {
          margin-left: 0 !important;
          width: 100% !important;
        }
      `}</style>
      {children}
    </>
  )
}
