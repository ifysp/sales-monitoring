import { LinkButton } from "@/components/ui";

export default function NotFound() {
  return (
    <div className="py-20 text-center">
      <h1 className="text-lg font-semibold">Data tidak ditemukan</h1>
      <p className="mt-1 text-sm text-slate-500">Mungkin sudah dihapus atau alamatnya salah.</p>
      <LinkButton className="mt-4" href="/">Ke dashboard</LinkButton>
    </div>
  );
}
