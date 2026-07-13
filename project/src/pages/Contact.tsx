import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { Facebook, Instagram, Linkedin, Mail, MapPin, MessageCircle, Phone, Send } from 'lucide-react';
import toast from 'react-hot-toast';
import { buildWhatsAppUrl, getSafeExternalUrl, normalizePhoneForTel } from '../lib/site';
import { supabase } from '../lib/supabase';
import { TikTokIcon } from '../components/ui/SocialIcons';

const HERO_IMAGE =
  'https://images.unsplash.com/photo-1497366412874-3415097a27e7?auto=format&fit=crop&w=1800&q=80';

export function Contact() {
  const [formData, setFormData] = React.useState({
    name: '',
    email: '',
    subject: '',
    message: '',
  });

  const { data: settings } = useQuery({
    queryKey: ['site-settings'],
    queryFn: async () => {
      const { data, error } = await supabase.from('site_settings').select('*').single();
      if (error) throw error;
      return data;
    },
  });

  const handleSubmit = (event: React.FormEvent) => {
    event.preventDefault();
    const subject = encodeURIComponent(formData.subject);
    const body = encodeURIComponent(`Nom : ${formData.name}\nEmail : ${formData.email}\n\n${formData.message}`);
    window.location.href = `mailto:${email}?subject=${subject}&body=${body}`;
    toast.success("Ouverture de votre messagerie pour finaliser l'envoi.");
  };

  const phone = settings?.location_phone || '+221 33 848 46 68';
  const email = settings?.location_email || 'contact@sphereoffice.sn';
  const address = settings?.location_address || 'Dakar, Senegal';
  const whatsappUrl = buildWhatsAppUrl(
    settings?.whatsapp_number || phone,
    'Bonjour, je souhaite entrer en contact avec Sphere Office.'
  );

  const socialLinks = [
    { href: getSafeExternalUrl(settings?.facebook_url), icon: Facebook, label: 'Facebook' },
    { href: getSafeExternalUrl(settings?.instagram_url), icon: Instagram, label: 'Instagram' },
    { href: getSafeExternalUrl(settings?.linkedin_url), icon: Linkedin, label: 'LinkedIn' },
    { href: getSafeExternalUrl(settings?.tiktok_url), icon: TikTokIcon, label: 'TikTok' },
  ].filter((item) => item.href);

  const contactCards = [
    {
      href: `tel:${normalizePhoneForTel(phone)}`,
      icon: Phone,
      iconBg: 'bg-sky-100 text-sky-800 dark:bg-sky-950/60 dark:text-sky-300',
      title: 'Telephone',
      description: phone,
      cta: 'Appeler maintenant',
      ctaColor: 'text-sky-800 dark:text-sky-300',
      delay: '0',
    },
    {
      href: `mailto:${email}`,
      icon: Mail,
      iconBg: 'bg-sky-100 text-sky-800 dark:bg-sky-950/60 dark:text-sky-300',
      title: 'Email',
      description: email,
      cta: 'Envoyer un email',
      ctaColor: 'text-sky-800 dark:text-sky-300',
      delay: '80',
    },
    {
      href: whatsappUrl,
      icon: MessageCircle,
      iconBg: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/50 dark:text-emerald-400',
      title: 'WhatsApp',
      description: 'Echangez rapidement avec nous si vous preferez une conversation directe.',
      cta: 'Ouvrir WhatsApp',
      ctaColor: 'text-emerald-700 dark:text-emerald-400',
      target: '_blank',
      delay: '160',
    },
    {
      href: getSafeExternalUrl(settings?.location_link) || '#',
      icon: MapPin,
      iconBg: 'bg-sky-100 text-sky-800 dark:bg-sky-950/60 dark:text-sky-300',
      title: 'Adresse',
      description: address,
      cta: 'Voir la localisation',
      ctaColor: 'text-sky-800 dark:text-sky-300',
      target: '_blank',
      delay: '240',
    },
  ];

  return (
    <div className="contact-page overflow-hidden bg-slate-50 dark:bg-slate-950">

      {/* ── Hero image ─────────────────────────────────────────── */}
      <section className="contact-hero relative min-h-[280px] overflow-hidden sm:min-h-[360px]">
        <img
          src={settings?.contact_image || HERO_IMAGE}
          alt="Contact Sphere Office"
          className="absolute inset-0 h-full w-full object-cover"
          loading="eager"
        />
        <div className="contact-hero-overlay absolute inset-0 bg-[linear-gradient(105deg,rgba(2,6,23,0.88)_0%,rgba(2,6,23,0.62)_52%,rgba(2,6,23,0.28)_100%)]" />
        <div className="relative mx-auto w-full max-w-[1800px] px-4 py-16 sm:px-6 sm:py-24 lg:px-8 md:py-32 2xl:px-12">
          <div className="max-w-2xl text-white">
            <p className="section-label animate-fade-in" style={{ color: '#bae6fd' }}>
              Contact
            </p>
            <h1
              className="animate-fade-in-up mt-5 font-display text-3xl font-bold leading-tight tracking-tight sm:text-4xl md:text-[3.2rem] md:leading-[1.1]"
              style={{ animationDelay: '100ms' }}
            >
              Parlons de votre projet, de vos besoins et de vos contraintes.
            </h1>
            <p
              className="animate-fade-in-up mt-5 max-w-xl text-base leading-8 text-slate-300 sm:mt-6 sm:text-lg"
              style={{ animationDelay: '220ms' }}
            >
              Que vous cherchiez un produit precis, un conseil rapide ou une orientation plus complete, nous avons structure la page pour vous laisser choisir le canal le plus simple.
            </p>
          </div>
        </div>
      </section>

      {/* ── Contact content ────────────────────────────────────── */}
      <div className="relative z-10 mx-auto -mt-10 w-full max-w-[1800px] px-4 pb-16 sm:-mt-14 sm:px-6 sm:pb-20 lg:px-8 2xl:px-12">

        {/* Contact cards grid */}
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {contactCards.map((card) => (
            <a
              key={card.title}
              href={card.href}
              target={card.target}
              rel={card.target === '_blank' ? 'noopener noreferrer' : undefined}
              data-reveal="scale"
              data-delay={card.delay}
              className="contact-card group block"
            >
              <div className={`flex h-12 w-12 items-center justify-center rounded-2xl transition-transform duration-300 group-hover:scale-110 ${card.iconBg}`}>
                <card.icon className="h-5 w-5" />
              </div>
              <h2 className="mt-5 text-lg font-bold text-slate-950 dark:text-white">{card.title}</h2>
              <p className="mt-2 text-sm leading-7 text-slate-500 dark:text-slate-400">{card.description}</p>
              <span className={`mt-4 inline-flex items-center text-sm font-semibold hover-underline ${card.ctaColor}`}>
                {card.cta}
              </span>
            </a>
          ))}
        </div>

        {/* Content grid */}
        <div className="mt-8 grid gap-6 lg:grid-cols-[0.85fr_1.15fr] lg:gap-8">

          {/* Info panel */}
          <div
            className="contact-panel rounded-[26px] border border-slate-200 bg-white p-6 shadow-[0_16px_56px_-30px_rgba(15,23,42,0.32)] sm:rounded-[32px] sm:p-8 dark:border-slate-800 dark:bg-slate-900"
            data-reveal="fade-left"
          >
            <p className="section-label">Canaux</p>
            <h2 className="mt-4 font-display text-2xl font-bold tracking-tight text-slate-950 sm:text-3xl dark:text-white">
              Choisissez le mode de contact le plus simple pour vous.
            </h2>
            <p className="mt-4 text-sm leading-7 text-slate-500 dark:text-slate-400">
              Pour une demande urgente, privilegiez l'appel ou WhatsApp. Pour une demande plus detaillee, utilisez le formulaire ou l'e-mail.
            </p>

            <div className="mt-8 rounded-[22px] bg-slate-50 p-6 dark:bg-slate-950">
              <h3 className="text-sm font-bold text-slate-950 dark:text-white">Reseaux sociaux</h3>
              <div className="mt-4 flex flex-wrap gap-3">
                {socialLinks.length > 0 ? (
                  socialLinks.map((item) => (
                    <a
                      key={item.label}
                      href={item.href}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex h-11 w-11 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-700 transition-all duration-200 hover:scale-110 hover:border-sky-400 hover:text-sky-700 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300 dark:hover:border-sky-400 dark:hover:text-sky-300"
                      aria-label={item.label}
                    >
                      <item.icon className="h-5 w-5" />
                    </a>
                  ))
                ) : (
                  <p className="text-sm text-slate-500 dark:text-slate-400">
                    Aucun lien social configure pour le moment.
                  </p>
                )}
              </div>
            </div>
          </div>

          {/* Contact form */}
          <div
            className="contact-panel rounded-[26px] border border-slate-200 bg-white p-6 shadow-[0_16px_56px_-30px_rgba(15,23,42,0.32)] sm:rounded-[32px] sm:p-8 dark:border-slate-800 dark:bg-slate-900"
            data-reveal="fade-right"
            data-delay="100"
          >
            <h2 className="font-display text-2xl font-bold tracking-tight text-slate-950 sm:text-3xl dark:text-white">
              Envoyez-nous un message
            </h2>
            <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">
              Nous repondons sous 24h en jours ouvrables.
            </p>

            <form onSubmit={handleSubmit} className="contact-form mt-7 space-y-5">
              <div className="grid gap-5 sm:grid-cols-2">
                <div>
                  <label className="mb-2 block text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-500 dark:text-slate-400">
                    Nom complet
                  </label>
                  <input
                    type="text"
                    value={formData.name}
                    onChange={(event) => setFormData((prev) => ({ ...prev, name: event.target.value }))}
                    className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 placeholder:text-slate-400 shadow-sm transition-all duration-200 focus:border-sky-400 focus:outline-none focus:ring-2 focus:ring-sky-500/20 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100 dark:placeholder:text-slate-500"
                    required
                    placeholder="Votre nom"
                  />
                </div>
                <div>
                  <label className="mb-2 block text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-500 dark:text-slate-400">
                    Email
                  </label>
                  <input
                    type="email"
                    value={formData.email}
                    onChange={(event) => setFormData((prev) => ({ ...prev, email: event.target.value }))}
                    className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 placeholder:text-slate-400 shadow-sm transition-all duration-200 focus:border-sky-400 focus:outline-none focus:ring-2 focus:ring-sky-500/20 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100 dark:placeholder:text-slate-500"
                    required
                    placeholder="votre@email.com"
                  />
                </div>
              </div>

              <div>
                <label className="mb-2 block text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-500 dark:text-slate-400">
                  Sujet
                </label>
                <input
                  type="text"
                  value={formData.subject}
                  onChange={(event) => setFormData((prev) => ({ ...prev, subject: event.target.value }))}
                  className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 placeholder:text-slate-400 shadow-sm transition-all duration-200 focus:border-sky-400 focus:outline-none focus:ring-2 focus:ring-sky-500/20 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100 dark:placeholder:text-slate-500"
                  required
                  placeholder="Objet de votre message"
                />
              </div>

              <div>
                <label className="mb-2 block text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-500 dark:text-slate-400">
                  Message
                </label>
                <textarea
                  value={formData.message}
                  onChange={(event) => setFormData((prev) => ({ ...prev, message: event.target.value }))}
                  rows={6}
                  className="w-full resize-none rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 placeholder:text-slate-400 shadow-sm transition-all duration-200 focus:border-sky-400 focus:outline-none focus:ring-2 focus:ring-sky-500/20 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100 dark:placeholder:text-slate-500"
                  required
                  placeholder="Decrivez votre besoin, vos questions ou votre projet..."
                />
              </div>

              <button
                type="submit"
                className="btn-liquid btn-lift inline-flex w-full items-center justify-center gap-2 rounded-full bg-sky-900 px-7 py-4 text-sm font-semibold text-white shadow-md shadow-sky-900/20 transition-all hover:bg-sky-800 sm:w-auto dark:bg-sky-500 dark:hover:bg-sky-400"
              >
                <Send className="h-4 w-4" />
                Envoyer le message
              </button>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}
