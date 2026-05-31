import Link from 'next/link';

export default function Home() {
  return (
    <main style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100vh' }}>
      <h1>Welcome to WaSender</h1>
      <p>Your multi-tenant WhatsApp automation platform.</p>
      <div style={{ marginTop: '20px' }}>
        <Link href="/auth" style={{ padding: '10px 20px', background: '#0070f3', color: 'white', borderRadius: '5px', textDecoration: 'none' }}>
          Get Started
        </Link>
      </div>
    </main>
  );
}
