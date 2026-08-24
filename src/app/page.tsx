import Link from "next/link";
import { ListaInformes } from "@/components/ListaInformes";

export default function Home() {
  return (
    <div className="pt-12 pb-xl">
      <header className="fixed top-0 left-0 w-full z-50 flex justify-between items-center px-margin h-12 bg-primary text-on-primary border-b border-primary-container shadow-sm">
        <h1 className="text-title-md font-title-md font-bold tracking-tight">
          Informes Técnicos
        </h1>
        <Link
          href="/informe/nuevo"
          className="text-label-caps font-label-caps font-bold tracking-wider hover:bg-primary-container transition-colors px-3 py-1.5 rounded"
        >
          NUEVO
        </Link>
      </header>
      <main className="max-w-7xl mx-auto md:px-margin">
        <div className="bg-white border-b border-outline-variant px-md py-1 flex justify-between items-center mb-md shadow-sm">
          <span className="text-title-md font-title-md font-bold text-primary">AIR POWER S.A.</span>
        </div>
        <ListaInformes />
      </main>
    </div>
  );
}
