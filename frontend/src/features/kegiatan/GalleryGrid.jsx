export default function GalleryGrid({ items = [] }) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mt-4">
      {items.map((item) => (
        <div key={item.id} className="rounded-lg overflow-hidden shadow bg-white">
          <img src={item.imageUrl} alt={item.title} className="w-full h-48 object-cover" />
          <div className="p-3"><p className="font-semibold">{item.title}</p></div>
        </div>
      ))}
    </div>
  );
}
