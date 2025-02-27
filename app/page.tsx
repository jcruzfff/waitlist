import Link from 'next/link';

export default function Home() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-[#1a1a1a]">
      <div className="space-y-8 text-center">
        <h1 className="text-4xl font-bold mb-8 text-white">Waitlist Management System</h1>
        <Link 
          href="/admin"
          className="inline-block bg-[#4169e1] text-white px-12 py-6 rounded-lg hover:bg-[#3154b3] transition-all duration-200 shadow-lg text-xl"
        >
          Open Admin Dashboard
        </Link>
      </div>
    </div>
  );
}
