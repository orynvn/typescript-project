export default function AuthLayout({ children }: { children: React.ReactNode }): JSX.Element {
  return <main style={{ maxWidth: 420, margin: '3rem auto' }}>{children}</main>;
}
