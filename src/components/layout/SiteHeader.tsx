import Image from "next/image";
import Link from "next/link";

export const SiteHeader = () => {
  return (
    <header className="sticky top-0 z-50 w-full border-b border-slate-800 bg-[#121212] shadow-md">
      <div className="mx-auto flex h-16 w-full max-w-6xl items-center justify-between px-4 md:px-6">
        <Link href="/" className="flex items-center gap-3" aria-label="Footics home">
          <Image src="/logo.png" alt="Footics logo" width={36} height={36} className="rounded-lg" priority />
          <span className="bg-clip-text text-xl font-bold tracking-tight text-gray-300">
            Footics
          </span>
        </Link>
        <nav aria-label="Site actions" className="text-muted-foreground flex items-center gap-4 text-sm">
          {/* Placeholder for future header actions (e.g., GitHub link, debug menu) */}
        </nav>
      </div>
    </header>
  );
};

export default SiteHeader;
