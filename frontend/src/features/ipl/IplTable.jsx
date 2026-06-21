export default function IplTable() {
  return (
    <div className="overflow-x-auto mt-4">
      <table className="min-w-full bg-white rounded shadow">
        <thead className="bg-gray-100">
          <tr>
            <th className="p-3 text-left">No</th>
            <th className="p-3 text-left">Nama</th>
            <th className="p-3 text-left">Bulan</th>
            <th className="p-3 text-left">Status</th>
            <th className="p-3 text-left">Aksi</th>
          </tr>
        </thead>
        <tbody></tbody>
      </table>
    </div>
  );
}
