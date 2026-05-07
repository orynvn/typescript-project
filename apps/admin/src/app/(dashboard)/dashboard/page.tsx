const stats = [
  { label: 'Total Users', value: 120 },
  { label: 'Active Users', value: 95 },
  { label: 'New This Month', value: 18 },
  { label: 'Revenue', value: '$0' },
];

export default function DashboardPage(): JSX.Element {
  return (
    <section>
      <h1>Dashboard</h1>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, minmax(0, 1fr))', gap: 12 }}>
        {stats.map((stat) => (
          <article
            key={stat.label}
            style={{ border: '1px solid #ddd', borderRadius: 8, padding: 12 }}
          >
            <p>{stat.label}</p>
            <strong>{stat.value}</strong>
          </article>
        ))}
      </div>
    </section>
  );
}
