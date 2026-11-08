"use client";

import { useEffect } from "react";

function pesanUntuk(el) {
  const v = el.validity;
  const tipe = (el.type || "").toLowerCase();
  if (v.valueMissing) {
    if (tipe === "checkbox") return "Centang kotak ini untuk melanjutkan.";
    if (tipe === "radio") return "Pilih salah satu opsi.";
    if (tipe === "file") return "Pilih file terlebih dahulu.";
    if (el.tagName === "SELECT") return "Pilih salah satu opsi.";
    return "Tidak boleh kosong.";
  }
  if (v.typeMismatch) {
    if (tipe === "url") return "Format alamat web tidak valid.";
    return "Format tidak sesuai.";
  }
  if (v.tooShort) return `Minimal ${el.minLength} karakter.`;
  if (v.tooLong) return `Maksimal ${el.maxLength} karakter.`;
  if (v.rangeUnderflow) return `Nilai minimal ${el.min}.`;
  if (v.rangeOverflow) return `Nilai maksimal ${el.max}.`;
  if (v.patternMismatch) return el.title || "Format tidak sesuai.";
  if (v.badInput) return "Isi dengan nilai yang valid.";
  return "";
}

const NS = "http://www.w3.org/2000/svg";
const DURASI = 4000;

let gelembung = null;
let sasaran = null;
let timer = null;
let sedangAntre = false;

function bangunGelembung() {
  const el = document.createElement("div");
  el.className = "vld-bubble";
  el.setAttribute("role", "alert");
  const ikon = document.createElementNS(NS, "svg");
  ikon.setAttribute("viewBox", "0 0 24 24");
  ikon.setAttribute("class", "vld-ikon");
  ikon.setAttribute("aria-hidden", "true");
  const lingkar = document.createElementNS(NS, "circle");
  lingkar.setAttribute("cx", "12");
  lingkar.setAttribute("cy", "12");
  lingkar.setAttribute("r", "10");
  const garis = document.createElementNS(NS, "path");
  garis.setAttribute("d", "M12 7v6M12 16.5v.01");
  ikon.append(lingkar, garis);
  const teks = document.createElement("span");
  teks.className = "vld-teks";
  el.append(ikon, teks);
  document.body.appendChild(el);
  return el;
}

function posisikan() {
  if (!gelembung || !sasaran?.isConnected) return sembunyikan();
  const r = sasaran.getBoundingClientRect();
  const lebar = gelembung.offsetWidth;
  const tinggi = gelembung.offsetHeight;
  const jarak = 10;
  const tepi = 12;
  const diBawah = r.bottom + jarak + tinggi + tepi <= window.innerHeight || r.top - jarak - tinggi < tepi;
  const top = diBawah ? r.bottom + jarak : r.top - jarak - tinggi;
  let left = r.left + Math.min(r.width / 2, 40) - 20;
  left = Math.max(tepi, Math.min(left, window.innerWidth - lebar - tepi));
  const panah = Math.max(14, Math.min(r.left + Math.min(r.width / 2, 40) - left, lebar - 14));
  gelembung.style.top = `${top}px`;
  gelembung.style.left = `${left}px`;
  gelembung.style.setProperty("--vld-panah", `${panah}px`);
  gelembung.dataset.arah = diBawah ? "bawah" : "atas";
}

function sembunyikan() {
  clearTimeout(timer);
  sasaran?.classList.remove("vld-salah");
  sasaran = null;
  gelembung?.classList.remove("tampil");
}

function tampilkan(el, pesan) {
  if (!gelembung) gelembung = bangunGelembung();
  sasaran?.classList.remove("vld-salah");
  sasaran = el;
  sasaran.classList.add("vld-salah");
  gelembung.querySelector(".vld-teks").textContent = pesan;
  gelembung.classList.add("tampil");
  el.scrollIntoView?.({ block: "center", behavior: "smooth" });
  el.focus?.({ preventScroll: true });
  posisikan();
  clearTimeout(timer);
  timer = setTimeout(sembunyikan, DURASI);
}

/** Mengganti gelembung validasi bawaan browser dengan gelembung sendiri berbahasa Indonesia di seluruh aplikasi. */
export default function PesanValidasi() {
  useEffect(() => {
    const onInvalid = (e) => {
      const el = e.target;
      if (!el?.validity) return;
      e.preventDefault();
      if (sedangAntre) return;
      sedangAntre = true;
      setTimeout(() => {
        sedangAntre = false;
      }, 0);
      const pesan = pesanUntuk(el) || el.validationMessage;
      if (pesan) tampilkan(el, pesan);
    };
    const onInput = (e) => {
      if (e.target === sasaran) sembunyikan();
    };
    const onGeser = () => posisikan();
    document.addEventListener("invalid", onInvalid, true);
    document.addEventListener("input", onInput, true);
    document.addEventListener("change", onInput, true);
    document.addEventListener("focusout", onInput, true);
    window.addEventListener("scroll", onGeser, true);
    window.addEventListener("resize", onGeser);
    return () => {
      document.removeEventListener("invalid", onInvalid, true);
      document.removeEventListener("input", onInput, true);
      document.removeEventListener("change", onInput, true);
      document.removeEventListener("focusout", onInput, true);
      window.removeEventListener("scroll", onGeser, true);
      window.removeEventListener("resize", onGeser);
      sembunyikan();
      gelembung?.remove();
      gelembung = null;
    };
  }, []);
  return null;
}
