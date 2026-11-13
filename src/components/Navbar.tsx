import { useEffect, useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { Menu, X, LogIn, CalendarCheck } from "lucide-react";
import { Monogram, IconInstagram } from "./decor/Icons";
import { business } from "../data/business";
import { useClientAuthStore } from "../store/useClientAuthStore";

const navLinks = [
  { href: "#sobre", label: "Sobre" },
  { href: "#servicos", label: "Serviços" },
  { href: "#galeria", label: "Galeria" },
  { href: "#localizacao", label: "Localização" },
];

export function Navbar() {
  const [open, setOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const location = useLocation();
  const onHome = location.pathname === "/";
  const clientLoggedIn = useClientAuthStore((s) => s.isAuthenticated && !s.needsProfile);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 12);
    window.addEventListener("scroll", onScroll);
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <header
      className={`fixed top-0 inset-x-0 z-50 transition-all duration-300 ${
        scrolled ? "bg-cream-50/90 backdrop-blur-md shadow-[0_4px_20px_-8px_rgba(74,31,48,0.15)]" : "bg-transparent"
      }`}
    >
      <div className="mx-auto max-w-7xl px-5 sm:px-8 flex items-center justify-between h-16 md:h-20">
        <Link to="/" className="flex items-center gap-2 group">
          <Monogram className="h-9 w-9 transition-transform group-hover:scale-105" />
          <span className="font-display text-lg md:text-xl text-rose-800 tracking-wide">
            Studio Rosely Lebarch
          </span>
        </Link>

        <nav className="hidden md:flex items-center gap-8">
          {navLinks.map((l) => (
            <a
              key={l.href}
              href={onHome ? l.href : import.meta.env.BASE_URL + l.href}
              onClick={(e) => {
                if (!onHome) return;
                e.preventDefault();
                document.querySelector(l.href)?.scrollIntoView({ behavior: "smooth" });
              }}
              className="text-sm font-medium text-ink-700 hover:text-rose-600 transition-colors"
            >
              {l.label}
            </a>
          ))}
          <a
            href={business.instagramUrl}
            target="_blank"
            rel="noreferrer"
            className="text-ink-700 hover:text-rose-600 transition-colors"
            aria-label="Instagram"
          >
            <IconInstagram className="h-5 w-5" />
          </a>
          <Link
            to="/login"
            className="flex items-center gap-1.5 text-sm font-medium text-ink-500 hover:text-rose-600 transition-colors"
          >
            <LogIn className="h-4 w-4" /> Área da profissional
          </Link>
          {clientLoggedIn ? (
            <Link
              to="/conta/agendamentos"
              className="flex items-center gap-1.5 text-sm font-medium text-ink-500 hover:text-rose-600 transition-colors"
            >
              <CalendarCheck className="h-4 w-4" /> Meus agendamentos
            </Link>
          ) : (
            <Link
              to="/conta/entrar"
              className="flex items-center gap-1.5 text-sm font-medium text-ink-500 hover:text-rose-600 transition-colors"
            >
              <LogIn className="h-4 w-4" /> Minha conta
            </Link>
          )}
          <Link
            to="/agendar"
            className="rounded-full bg-rose-600 hover:bg-rose-700 text-cream-50 text-sm font-semibold px-5 py-2.5 shadow-soft transition-colors"
          >
            Agendar horário
          </Link>
        </nav>

        <button
          className="md:hidden text-ink-900 p-2"
          onClick={() => setOpen((o) => !o)}
          aria-label="Abrir menu"
        >
          {open ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
        </button>
      </div>

      {open && (
        <div className="md:hidden bg-cream-50 border-t border-blush-200 px-5 py-4 flex flex-col gap-4 animate-fade-up">
          {navLinks.map((l) => (
            <a
              key={l.href}
              href={onHome ? l.href : import.meta.env.BASE_URL + l.href}
              onClick={(e) => {
                setOpen(false);
                if (!onHome) return;
                e.preventDefault();
                document.querySelector(l.href)?.scrollIntoView({ behavior: "smooth" });
              }}
              className="text-base font-medium text-ink-700"
            >
              {l.label}
            </a>
          ))}
          <Link to="/login" onClick={() => setOpen(false)} className="text-base font-medium text-ink-500">
            Área da profissional
          </Link>
          {clientLoggedIn ? (
            <Link to="/conta/agendamentos" onClick={() => setOpen(false)} className="text-base font-medium text-ink-500">
              Meus agendamentos
            </Link>
          ) : (
            <Link to="/conta/entrar" onClick={() => setOpen(false)} className="text-base font-medium text-ink-500">
              Minha conta
            </Link>
          )}
          <Link
            to="/agendar"
            onClick={() => setOpen(false)}
            className="rounded-full bg-rose-600 text-cream-50 text-center text-base font-semibold px-5 py-3"
          >
            Agendar horário
          </Link>
        </div>
      )}
    </header>
  );
}
