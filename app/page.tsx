'use client';

import { useRouter } from "next/navigation";

export default function Home() {
  const router = useRouter();

  return (
    <div className="flex flex-col items-center justify-center h-screen">
      <button className="border border-gray-300 rounded-md p-2 px-4" onClick={() => router.push('/file')}>file</button>
    </div>
  );
}
