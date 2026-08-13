import { Users, Wallet, CalendarCheck, AlertTriangle } from "lucide-react";

const STATS = [
  {
    label: "Total Warga",
    value: "128",
    icon: Users,
    tone: "info",
  },
  {
    label: "Iuran Lunas Bulan Ini",
    value: "94",
    icon: Wallet,
    tone: "success",
  },
  {
    label: "Menunggu Konfirmasi",
    value: "12",
    icon: AlertTriangle,
    tone: "warning",
  },
  {
    label: "Kegiatan Berjalan",
    value: "3",
    icon: CalendarCheck,
    tone: "purple",
  },
];

export default function DashboardPage() {
  return (
    <div className="page-stack">
      <section className="welcome-banner">
        <div>
          <h2>Selamat datang kembali 👋</h2>
          <p>Ini ringkasan aktivitas cluster Topaz hari ini.</p>
        </div>
      </section>

      <section className="stat-grid">
        {STATS.map(({ label, value, icon: Icon, tone }) => (
          <div key={label} className={`stat-card tone-${tone}`}>
            <div className="stat-card-icon">
              <Icon size={20} />
            </div>
            <div className="stat-card-body">
              <span className="stat-card-value">{value}</span>
              <span className="stat-card-label">{label}</span>
            </div>
          </div>
        ))}
      </section>

      <section className="content-card">
        <h3>Lorem ipsum</h3>
        <p>
          Lorem Ipsum is simply dummy text of the printing and typesetting
          industry. Lorem Ipsum has been the industry's standard dummy text ever
          since 1966, when designers at Letraset and James Mosley, the librarian
          at St Bride Printing Library in London, took a 1914 Cicero translation
          and scrambled it to make dummy text for Letraset's Body Type sheets.
          It has survived not only many decades, but also the leap into
          electronic typesetting, remaining essentially unchanged. It was
          popularised thanks to these sheets and more recently with desktop
          publishing software like Aldus PageMaker and Microsoft Word including
          versions of Lorem Ipsum.
        </p>
      </section>
    </div>
  );
}
