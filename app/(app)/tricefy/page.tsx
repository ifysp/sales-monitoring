import Link from "next/link";
import { customerOptions, listTricefy, toFilters } from "@/lib/queries";
import { tanggal, todayDate } from "@/lib/format";
import { Card, Empty, FilterBar, FilterField, Input, LinkButton, PageHeader, Select, Table, TricefyBadge } from "@/components/ui";

export default async function TricefyPage({ searchParams }: PageProps<"/tricefy">) {
  const f = toFilters(await searchParams);
  const today = todayDate();
  const [rows, customers] = await Promise.all([listTricefy(f, today), customerOptions()]);
  const qs = new URLSearchParams(f as Record<string, string>).toString();
  return (
    <>
      <PageHeader title="Tricefy" subtitle="Langganan terbaru per akun · masa aktif default 3 tahun sejak aktivasi" actions={<LinkButton href="/tricefy/accounts/new">+ Akun Tricefy</LinkButton>} />
      <Card>
        <FilterBar exportHref={`/api/export/tricefy?${qs}`}>
          <FilterField label="Cari"><Input name="q" defaultValue={f.q} placeholder="ID Tricefy, customer, SN" className="w-56" /></FilterField>
          <FilterField label="Customer">
            <Select name="customer" defaultValue={f.customer ?? ""} className="w-48">
              <option value="">Semua</option>
              {customers.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
            </Select>
          </FilterField>
          <FilterField label="Status">
            <Select name="status" defaultValue={f.status ?? ""} className="w-36">
              <option value="">Semua</option>
              <option value="AKTIF">Aktif</option>
              <option value="AKAN_HABIS">Akan habis (≤ 90 hari)</option>
              <option value="KEDALUWARSA">Kedaluwarsa</option>
            </Select>
          </FilterField>
          <FilterField label="Riwayat">
            <Select name="history" defaultValue={f.history ?? ""} className="w-44">
              <option value="">Terbaru per akun</option>
              <option value="1">Termasuk perpanjangan lama</option>
            </Select>
          </FilterField>
        </FilterBar>
        {rows.length === 0 ? <Empty>Belum ada langganan Tricefy.</Empty> : (
          <Table>
            <thead><tr><th>Customer / ID Tricefy</th><th>Alat (SN)</th><th>Aktivasi</th><th>Berakhir</th><th>Status</th></tr></thead>
            <tbody>
              {rows.map((s) => (
                <tr key={s.id}>
                  <td><Link className="font-medium text-teal-800 hover:underline" href={`/tricefy/accounts/${s.accountId}`}>{s.account.customer.name}</Link><div className="font-mono text-xs text-slate-500">{s.account.tricefyId}</div></td>
                  <td className="font-mono text-xs">{s.devices.map((d) => d.device.serialNumber).join(", ") || "-"}</td>
                  <td className="whitespace-nowrap">{tanggal(s.activationDate)}</td>
                  <td className="whitespace-nowrap">{tanggal(s.endDate)}</td>
                  <td><TricefyBadge status={s.status} daysLeft={s.daysLeft} /></td>
                </tr>
              ))}
            </tbody>
          </Table>
        )}
      </Card>
    </>
  );
}
