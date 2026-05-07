export default function AuthLayout({ children }: { children: React.ReactNode }): JSX.Element {
  return <main style={{ maxWidth: 480, margin: '2rem auto' }}>{children}</main>;
}
