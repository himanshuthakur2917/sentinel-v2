"use client"
import Navbar from "@/components/Header/Navbar";
import { Button } from "@/components/ui/button";
import { useRouter } from "next/navigation";

export default function Home() {
  const router = useRouter();
  return (
    <div className="flex flex-col min-h-screen bg-zinc-50 font-sans dark:bg-black">
      <header className="fixed top-0 right-0 left-0 z-50 border-b border-white/20 px-4 pt-4">
        <Navbar/>
      </header>
      <main className="flex min-h-screen w-full flex-col items-center justify-between py-32 px-16 bg-white dark:bg-black sm:items-start">
        <Button onClick={() => router.push("/dashboard")}>Go to Dashboard</Button>
      </main>
    </div>
  );
}
