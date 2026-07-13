import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { ArrowUp, Facebook, Instagram, Linkedin, Mail, MapPin, Phone, Truck } from 'lucide-react';
import { Link } from 'react-router-dom';
import { supabase } from '../../lib/supabase';
import { buildWhatsAppUrl, getSafeExternalUrl, normalizePhoneForTel } from '../../lib/site';
import { TikTokIcon } from '../ui/SocialIcons';

function DesktopFooter({
  phone,
  email,
  address,
  whatsappUrl,
  socialLinks,
}: {
  phone: string;
  email: string;
  address: string;
  whatsappUrl: string;
  socialLinks: Array<{ href: string; label: string; icon: React.ComponentType<{ className?: string }> }>;
}) {
  return (
    <footer className="site-footer bg-slate-950 text-slate-300">
      {/* Main content */}
      <div className="mx-auto w-full max-w-[1800px] px-4 py-16 sm:px-6 lg:px-8 2xl:px-12">
        <div className="site-footer-grid grid grid-cols-1 gap-8 lg:grid-cols-[1.18fr_0.74fr_0.98fr_1.04fr]">
          {/* Brand */}
          <div data-reveal>
            <div className="flex items-baseline gap-0.5">
              <span className="font-display text-2xl font-bold text-white">Sphere</span>
              <span className="font-display text-2xl font-light text-sky-500">-</span>
              <span className="ml-1.5 font-sans text-[0.6rem] font-bold uppercase tracking-[0.14em] text-slate-500">Office</span>
            </div>
            <h4 className="mt-5 font-display text-3xl font-bold text-white leading-snug">
              Le showroom digital du bureau professionnel.
            </h4>
            <p className="mt-4 max-w-md text-sm leading-7 text-slate-400">
              Nous aidons les entreprises et les professionnels a amenager des espaces de travail plus efficaces, plus credibles et plus confortables.
            </p>
            <div className="mt-7 flex flex-wrap gap-3">
              {socialLinks.map((link) => (
                <a
                  key={link.label}
                  href={link.href}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex h-12 w-12 items-center justify-center rounded-full border border-slate-800 bg-slate-900 text-slate-400 transition-all duration-200 hover:scale-105 hover:border-sky-500/70 hover:bg-sky-500/10 hover:text-sky-300 focus:outline-none focus:ring-2 focus:ring-sky-400/40"
                  aria-label={link.label}
                >
                  <link.icon className="h-5 w-5" />
                </a>
              ))}
            </div>
          </div>

          {/* Navigation */}
          <div data-reveal data-delay="100">
            <h4 className="text-xs font-semibold uppercase tracking-[0.16em] text-white">Navigation</h4>
            <ul className="mt-5 space-y-1 text-sm text-slate-400">
              {[
                { to: '/', label: 'Accueil' },
                { to: '/products', label: 'Boutique' },
                { to: '/about', label: 'A propos' },
                { to: '/contact', label: 'Contact' },
                { to: '/cart', label: 'Panier' },
              ].map((item) => (
                <li key={item.to}>
                  <Link to={item.to} className="site-footer-link inline-flex min-h-11 items-center rounded-xl px-3 -mx-3 transition-colors hover:bg-white/[0.04] hover:text-white focus:outline-none focus:ring-2 focus:ring-sky-400/30">
                    {item.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Contact */}
          <div data-reveal data-delay="200">
            <h4 className="text-xs font-semibold uppercase tracking-[0.16em] text-white">Contact</h4>
            <ul className="mt-5 space-y-2 text-sm text-slate-400">
              <li className="flex min-h-11 items-start gap-3 rounded-xl px-3 py-2 -mx-3">
                <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-sky-400/70" />
                <span>{address}</span>
              </li>
              <li className="flex items-center gap-3">
                <Phone className="h-4 w-4 shrink-0 text-sky-400/70" />
                <a
                  href={`tel:${normalizePhoneForTel(phone)}`}
                  className="site-footer-link inline-flex min-h-11 items-center rounded-xl px-3 -mx-3 transition-colors hover:bg-white/[0.04] hover:text-white focus:outline-none focus:ring-2 focus:ring-sky-400/30"
                >
                  {phone}
                </a>
              </li>
              <li className="flex items-center gap-3">
                <Mail className="h-4 w-4 shrink-0 text-sky-400/70" />
                <a
                  href={`mailto:${email}`}
                  className="site-footer-link inline-flex min-h-11 items-center rounded-xl px-3 -mx-3 transition-colors hover:bg-white/[0.04] hover:text-white focus:outline-none focus:ring-2 focus:ring-sky-400/30"
                >
                  {email}
                </a>
              </li>
              <li className="mt-2 flex min-h-11 items-center gap-3 rounded-2xl border border-emerald-400/15 bg-emerald-400/10 px-3">
                <Truck className="h-4 w-4 shrink-0 text-emerald-400/80" />
                <span className="font-medium text-emerald-400">Livraison partout au Senegal</span>
              </li>
            </ul>
          </div>

          {/* CTA */}
          <div data-reveal data-delay="300">
            <h4 className="text-xs font-semibold uppercase tracking-[0.16em] text-white">Parlons de votre projet</h4>
            <p className="mt-5 text-sm leading-7 text-slate-400">
              Besoin d'un devis, d'une recommandation produit ou d'un accompagnement rapide pour votre bureau ?
            </p>
            <div className="mt-6 flex flex-col gap-3">
              <a
                href={`tel:${normalizePhoneForTel(phone)}`}
                className="inline-flex min-h-12 items-center justify-center rounded-full bg-white px-5 py-3 text-sm font-semibold text-slate-950 shadow-lg shadow-white/10 transition-all hover:-translate-y-0.5 hover:bg-slate-100 active:scale-95 focus:outline-none focus:ring-2 focus:ring-sky-400/40"
              >
                Appeler maintenant
              </a>
              <a
                href={whatsappUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex min-h-12 items-center justify-center rounded-full border border-slate-700 px-5 py-3 text-sm font-semibold text-white transition-all hover:-translate-y-0.5 hover:border-sky-500/60 hover:bg-sky-500/10 hover:text-sky-300 active:scale-95 focus:outline-none focus:ring-2 focus:ring-sky-400/40"
              >
                Continuer sur WhatsApp
              </a>
            </div>
          </div>
        </div>
      </div>

      {/* Bottom bar */}
      <div className="border-t border-slate-800/70">
        <div className="mx-auto w-full max-w-[1800px] px-4 py-6 sm:px-6 lg:px-8 2xl:px-12">
          <div className="flex flex-col items-center justify-between gap-4 md:flex-row">
            <p className="text-sm text-slate-400">
              © {new Date().getFullYear()} Sphere Office. Tous droits reserves.
            </p>
            <div className="flex items-center gap-2">
              <Link to="/contact" className="inline-flex min-h-11 items-center rounded-full px-4 text-sm text-slate-400 transition-colors hover:bg-white/[0.04] hover:text-white">Contact</Link>
              <Link to="/about" className="inline-flex min-h-11 items-center rounded-full px-4 text-sm text-slate-400 transition-colors hover:bg-white/[0.04] hover:text-white">Notre histoire</Link>
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
}

function MobileFooter({ phone, email, whatsappUrl }: { phone: string; email: string; whatsappUrl: string }) {
  const scrollToTop = () => window.scrollTo({ top: 0, behavior: 'smooth' });

  return (
    <footer className="footer-mobile-pad mobile-premium-footer bg-slate-950 px-4 pt-8 text-center text-slate-300">
      <div className="mb-5">
        <button
          onClick={scrollToTop}
          className="mx-auto flex min-h-11 items-center justify-center gap-2 rounded-full border border-slate-800 bg-slate-900 px-5 py-2.5 text-sm font-semibold text-slate-300 transition-all hover:border-sky-500/50 hover:text-sky-300 active:scale-95 focus:outline-none focus:ring-2 focus:ring-sky-400/35"
        >
          <ArrowUp className="h-4 w-4" />
          <span>HAUT DE LA PAGE</span>
        </button>
      </div>

      <div className="mb-6 rounded-[28px] border border-slate-800 bg-slate-900 p-5 shadow-[0_22px_60px_-34px_rgba(0,0,0,0.8)]">
        <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-sky-500/10 text-sky-300 ring-1 ring-sky-300/15">
          <Phone className="h-5 w-5" />
        </div>
        <p className="text-[11px] uppercase tracking-[0.18em] text-slate-400 font-bold">Contact rapide</p>
        <p className="mx-auto mt-2 max-w-[16rem] text-sm leading-6 text-slate-400">
          Une question produit ou un devis ? Choisissez le canal le plus direct.
        </p>
        <div className="mt-5 flex flex-col gap-3">
          <a
            href={`tel:${normalizePhoneForTel(phone)}`}
            className="inline-flex min-h-12 items-center justify-center rounded-full bg-white px-4 py-3.5 text-sm font-semibold text-slate-950 transition-all hover:bg-slate-100 active:scale-95 focus:outline-none focus:ring-2 focus:ring-sky-400/40"
          >
            Appeler maintenant
          </a>
          <a
            href={whatsappUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex min-h-12 items-center justify-center rounded-full border border-slate-700 px-4 py-3.5 text-sm font-semibold text-white transition-all hover:border-sky-500/60 hover:bg-sky-500/10 active:scale-95 focus:outline-none focus:ring-2 focus:ring-sky-400/40"
          >
            Ouvrir WhatsApp
          </a>
          <a
            href={`mailto:${email}`}
            className="inline-flex min-h-12 items-center justify-center rounded-full border border-slate-800 px-4 py-3.5 text-sm font-semibold text-slate-300 transition-all hover:border-sky-500/60 hover:bg-sky-500/10 hover:text-sky-200 active:scale-95 focus:outline-none focus:ring-2 focus:ring-sky-400/40"
          >
            Envoyer un email
          </a>
        </div>
      </div>

      <div className="mb-5 inline-flex items-center gap-1.5 rounded-full bg-emerald-950/50 px-4 py-2 text-xs font-semibold text-emerald-400">
        <Truck className="h-3.5 w-3.5" />
        Livraison partout au Senegal
      </div>

      <div className="mb-5 grid grid-cols-3 gap-2 text-xs font-bold uppercase tracking-[0.08em] text-slate-400">
        <Link to="/products" className="inline-flex min-h-11 items-center justify-center rounded-2xl border border-slate-800 bg-slate-900/70 px-2 transition-colors hover:text-white">Produits</Link>
        <Link to="/about" className="inline-flex min-h-11 items-center justify-center rounded-2xl border border-slate-800 bg-slate-900/70 px-2 transition-colors hover:text-white">A propos</Link>
        <Link to="/contact" className="inline-flex min-h-11 items-center justify-center rounded-2xl border border-slate-800 bg-slate-900/70 px-2 transition-colors hover:text-white">Contact</Link>
      </div>

      <hr className="mx-auto my-5 w-11/12 border-slate-800" />

      <div className="text-xs text-slate-500">
        Tous droits reserves © {new Date().getFullYear()} Sphere Office
      </div>
    </footer>
  );
}

export function Footer() {
  const [isMobile, setIsMobile] = React.useState(false);
  const { data: settings } = useQuery({
    queryKey: ['site-settings'],
    queryFn: async () => {
      const { data, error } = await supabase.from('site_settings').select('*').single();
      if (error) throw error;
      return data;
    },
  });

  const phone = settings?.location_phone || '+221 33 848 46 68';
  const email = settings?.location_email || 'contact@sphereoffice.sn';
  const address = settings?.location_address || 'Dakar, Senegal';
  const whatsappUrl = buildWhatsAppUrl(
    settings?.whatsapp_number || phone,
    'Bonjour, je souhaite echanger avec Sphere Office au sujet de mon projet.'
  );
  const socialLinks = [
    { href: getSafeExternalUrl(settings?.facebook_url), label: 'Facebook', icon: Facebook },
    { href: getSafeExternalUrl(settings?.instagram_url), label: 'Instagram', icon: Instagram },
    { href: getSafeExternalUrl(settings?.linkedin_url), label: 'LinkedIn', icon: Linkedin },
    { href: getSafeExternalUrl(settings?.tiktok_url), label: 'TikTok', icon: TikTokIcon },
  ].filter((link) => link.href);

  React.useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth < 768);
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  return isMobile ? (
    <MobileFooter phone={phone} email={email} whatsappUrl={whatsappUrl} />
  ) : (
    <DesktopFooter
      phone={phone}
      email={email}
      address={address}
      whatsappUrl={whatsappUrl}
      socialLinks={socialLinks}
    />
  );
}
