let antrian = [];
let urutan = 0;
const pendengar = new Set();

const kabarkan = () => {
  const depan = antrian[0] ?? null;
  pendengar.forEach((fn) => fn(depan));
};

export function buka(spec) {
  return new Promise((resolve) => {
    antrian.push({ ...spec, resolve, id: ++urutan });
    kabarkan();
  });
}

export function tutup(id, hasil) {
  const i = antrian.findIndex((d) => d.id === id);
  if (i < 0) return;
  const [dialog] = antrian.splice(i, 1);
  kabarkan();
  dialog.resolve(hasil);
}

export function langganan(fn) {
  pendengar.add(fn);
  fn(antrian[0] ?? null);
  return () => {
    pendengar.delete(fn);
  };
}
