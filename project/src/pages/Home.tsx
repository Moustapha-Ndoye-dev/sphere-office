import React from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  ArrowRight,
  BadgeCheck,
  MessageCircle,
  Phone,
  ShieldCheck,
  Sparkles,
  Truck,
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { CatalogSkeleton } from '../components/ui/CatalogSkeleton';
import { ProductCard } from '../components/ui/ProductCard';
import { MobileProductCard } from '../components/mobile/MobileProductCard';
import { supabase } from '../lib/supabase';
import { buildWhatsAppUrl, normalizePhoneForTel } from '../lib/site';
import { getCategories, getProducts } from '../services/products';

const DECOR_IMAGES = [
  'https://images.unsplash.com/photo-1497366754035-f200968a6e72?auto=format&fit=crop&w=900&q=80',
  'https://images.unsplash.com/photo-1497366811353-6870744d04b2?auto=format&fit=crop&w=700&q=80',
  'https://images.unsplash.com/photo-1497366412874-3415097a27e7?auto=format&fit=crop&w=700&q=80',
];

const FEATURES = [
  {
    icon: Truck,
    title: 'Livraison au Senegal',
    description: 'Dakar, banlieue et toutes les regions - nous livrons partout au Senegal.',
  },
  {
    icon: ShieldCheck,
    title: 'Conseil professionnel',
    description: 'Des recommandations pensees pour les entreprises et les equipes.',
  },
  {
    icon: BadgeCheck,
    title: 'Selection fiable',
    description: 'Des produits choisis pour allier image, confort et efficacite.',
  },
];

function MagneticLink({ to, children, className }: { to: string; children: React.ReactNode; className: string }) {
  const ref = React.useRef<HTMLAnchorElement>(null);

  const handleMouseMove = (event: React.MouseEvent) => {
    if (!ref.current) return;
    const rect = ref.current.getBoundingClientRect();
    const x = ((event.clientX - rect.left) / rect.width - 0.5) * 10;
    const y = ((event.clientY - rect.top) / rect.height - 0.5) * 10;
    ref.current.style.transform = `translate(${x}px, ${y}px)`;
  };

  const handleMouseLeave = () => {
    if (ref.current) ref.current.style.transform = '';
  };

  return (
    <Link
      ref={ref}
      to={to}
      className={className}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
      style={{ transition: 'transform 0.28s cubic-bezier(0.34, 1.56, 0.64, 1)' }}
    >
      {children}
    </Link>
  );
}

export function Home() {
  const { data: productsData, isLoading: isLoadingProducts, isError: isProductsError, error: productsError } = useQuery({
    queryKey: ['products', 'home'],
    queryFn: () => getProducts(1, 4),
  });
  const featuredProducts = productsData?.data || [];
  const productCount = productsData?.totalCount;
  const productCountUnit = productCount === 1 ? 'produit' : 'produits';

  const { data: categories, isLoading: isLoadingCategories } = useQuery({
    queryKey: ['categories', 'home'],
    queryFn: getCategories,
    staleTime: 1000 * 60 * 5,
  });

  const { data: settings } = useQuery({
    queryKey: ['site-settings'],
    queryFn: async () => {
      const { data, error } = await supabase.from('site_settings').select('*').single();
      if (error) throw error;
      return data;
    },
  });

  const curatedCollections = (categories || []).slice(0, 3);
  const phone = settings?.location_phone || '+221 33 848 46 68';
  const whatsappUrl = buildWhatsAppUrl(
    settings?.whatsapp_number || phone,
    'Bonjour, je souhaite etre accompagne pour choisir des produits Sphere Office.'
  );

  return (
    <div className="mobile-home-page bg-slate-50 text-slate-900 dark:bg-slate-950 dark:text-white">

      {/* ── Hero ──────────────────────────────────────────────────── */}
      <section className="mobile-app-hero md:hidden">
        <div className="mobile-app-hero-bg">
          <img src="/assets/hero-bureau.jpg" alt="Bureau premium Sphere Office" />
        </div>
        <div className="mobile-app-hero-content">
          <span className="mobile-app-kicker">Sphere Office</span>
          <h1>Bureaux premium, choix simple.</h1>
          <p>Mobilier et fournitures pour creer un espace de travail clair, confortable et professionnel.</p>
          <div className="mobile-app-hero-actions">
            <Link to="/products" className="mobile-app-primary">
              Voir la boutique
              <ArrowRight />
            </Link>
            <a href={whatsappUrl} target="_blank" rel="noopener noreferrer" className="mobile-app-secondary">
              <MessageCircle />
              WhatsApp
            </a>
          </div>
          <div className="mobile-app-hero-stats">
            <div className="mobile-app-product-count" aria-label={productCount != null ? `${productCount} ${productCountUnit}` : 'Produits du catalogue'}>
              <strong>
                <span>{productCount ?? '...'}</span>
                {' '}
                {productCountUnit}
              </strong>
              {' '}
              <small>au catalogue</small>
            </div>
            <div>
              <strong>SN</strong>
              <span>Livraison</span>
            </div>
            <div>
              <strong>B2B</strong>
              <span>Conseil</span>
            </div>
          </div>
        </div>
      </section>

      <section className="mobile-hero hidden grain-overlay relative overflow-hidden bg-[linear-gradient(135deg,#f8fbff_0%,#eef4fa_45%,#e4edf7_100%)] md:block dark:bg-[linear-gradient(135deg,#020617_0%,#0f172a_45%,#1e293b_100%)]">
        <div className="mobile-hero-inner mx-auto grid w-full max-w-[1800px] grid-cols-1 items-center gap-8 px-4 py-8 sm:min-h-[calc(100dvh-9rem)] sm:gap-12 sm:px-6 sm:py-14 lg:grid-cols-[minmax(0,1fr)_minmax(440px,1fr)] lg:gap-16 lg:px-8 lg:py-16 2xl:px-12 2xl:py-20">

          {/* Left: text */}
          <div className="min-w-0 max-w-3xl">
            <div className="hero-badge animate-fade-in">
              <Sparkles className="h-3 w-3" />
              Collection professionnelle
            </div>

            <h1 className="mobile-hero-title mt-5 animate-fade-in-up font-display text-[1.7rem] font-bold leading-[1.08] tracking-tight text-slate-950 sm:mt-7 sm:text-5xl md:text-[3.5rem] lg:text-[3.8rem] dark:text-white">
              Equipez votre espace avec{' '}
              <em className="font-light not-italic text-slate-400 dark:text-slate-500">style, clarte</em>
              {' '}et{' '}
              <span className="text-sky-700 dark:text-sky-300">efficacite.</span>
            </h1>

            <p className="mt-5 animate-fade-in-up text-base leading-7 text-slate-600 sm:mt-7 sm:max-w-xl sm:text-lg sm:leading-8 dark:text-slate-300" style={{ animationDelay: '80ms' }}>
              Sphere Office selectionne le mobilier et les fournitures qui valorisent vos bureaux, fluidifient le travail et renforcent votre image professionnelle.
            </p>

            {/* CTA buttons */}
            <div className="mobile-hero-actions mt-8 flex animate-fade-in-up flex-wrap gap-3 sm:mt-10 sm:gap-4" style={{ animationDelay: '160ms' }}>
              <MagneticLink
                to="/products"
                className="btn-liquid btn-lift inline-flex items-center justify-center rounded-full bg-sky-900 px-7 py-3.5 text-sm font-semibold text-white shadow-lg shadow-sky-900/25 hover:bg-sky-800 sm:px-8 sm:py-4"
              >
                Explorer la boutique
                <ArrowRight className="ml-2 h-4 w-4" />
              </MagneticLink>
              <a
                href={`tel:${normalizePhoneForTel(phone)}`}
                className="inline-flex min-h-[48px] items-center justify-center rounded-full border border-slate-300/80 bg-white/80 px-5 py-3 text-sm font-semibold text-slate-900 transition-all duration-200 hover:border-sky-400 hover:bg-white hover:text-sky-800 sm:px-7 sm:py-4 dark:border-slate-700 dark:bg-slate-900/80 dark:text-white dark:hover:border-sky-400 dark:hover:text-sky-300"
              >
                <Phone className="mr-2 h-4 w-4 shrink-0" />
                Appeler maintenant
              </a>
              <a
                href={whatsappUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex min-h-[48px] items-center justify-center rounded-full border border-slate-300/80 bg-white/80 px-5 py-3 text-sm font-semibold text-slate-900 transition-all duration-200 hover:border-emerald-400 hover:bg-white hover:text-emerald-700 sm:px-7 sm:py-4 dark:border-slate-700 dark:bg-slate-900/80 dark:text-white dark:hover:border-emerald-400 dark:hover:text-emerald-300"
              >
                <MessageCircle className="mr-2 h-4 w-4 shrink-0" />
                WhatsApp
              </a>
            </div>

            {/* Feature pills */}
            <div
              className="mobile-feature-strip no-scrollbar -mx-4 mt-7 flex snap-x snap-mandatory gap-3 overflow-x-auto px-4 pb-1 sm:mx-0 sm:mt-10 sm:grid sm:grid-cols-3 sm:gap-4 sm:overflow-visible sm:px-0 sm:pb-0"
              style={{ animationDelay: '240ms' }}
            >
              {FEATURES.map((feature) => (
                <div key={feature.title} className="feature-pill min-w-[148px] shrink-0 snap-start sm:min-w-0">
                  <feature.icon className="h-4 w-4 text-sky-700 sm:h-5 sm:w-5 dark:text-sky-300" />
                  <h2 className="mt-2.5 text-[11px] font-bold leading-snug text-slate-900 sm:mt-3.5 sm:text-sm dark:text-slate-100">
                    {feature.title}
                  </h2>
                  <p className="mt-1.5 hidden text-xs leading-6 text-slate-500 sm:block dark:text-slate-400">
                    {feature.description}
                  </p>
                </div>
              ))}
            </div>
          </div>

          {/* Right: images */}
          <div className="relative animate-slide-in-right">
            {/* Mobile: single image */}
            <div className="relative overflow-hidden rounded-[22px] shadow-[0_24px_64px_-32px_rgba(15,23,42,0.35)] sm:hidden">
              <img
                src="/assets/hero-bureau.jpg"
                alt="Bureau premium Sphere Office"
                className="aspect-[16/10] w-full object-cover"
                loading="eager"
              />
              <div className="absolute inset-x-3 bottom-3 flex items-center justify-between rounded-[16px] border border-white/20 bg-slate-950/52 px-4 py-3 text-white backdrop-blur-md">
                <div>
                  <p className="text-[9px] font-semibold uppercase tracking-[0.24em] text-sky-200">Showroom digital</p>
                  <p className="mt-0.5 text-sm font-semibold">Une selection qui inspire.</p>
                </div>
                <Sparkles className="h-5 w-5 text-sky-200 shrink-0" />
              </div>
            </div>

            {/* Desktop: image mosaic */}
            <div className="hidden sm:block">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-4 pt-10">
                  <img
                    src="/assets/hero-bureau.jpg"
                    alt="Bureau premium Sphere Office"
                    className="h-[400px] w-full rounded-[30px] object-cover shadow-[0_36px_80px_-28px_rgba(15,23,42,0.32)] ring-1 ring-white/80 transition-transform duration-700 hover:-translate-y-1 xl:h-[440px]"
                    loading="eager"
                  />
                  <img
                    src={DECOR_IMAGES[1]}
                    alt="Ambiance showroom"
                    className="h-44 w-full rounded-[24px] object-cover shadow-xl ring-1 ring-white/70 transition-transform duration-700 hover:-translate-y-1"
                    loading="lazy"
                  />
                </div>
                <div className="space-y-4">
                  <img
                    src={DECOR_IMAGES[0]}
                    alt="Collection de bureaux"
                    className="h-48 w-full rounded-[24px] object-cover shadow-xl ring-1 ring-white/70 transition-transform duration-700 hover:-translate-y-1"
                    loading="lazy"
                  />
                  <img
                    src={DECOR_IMAGES[2]}
                    alt="Open space moderne"
                    className="h-[330px] w-full rounded-[30px] object-cover shadow-[0_36px_80px_-28px_rgba(15,23,42,0.32)] ring-1 ring-white/80 transition-transform duration-700 hover:-translate-y-1 xl:h-[360px]"
                    loading="lazy"
                  />
                </div>
              </div>

              {/* Floating badge */}
              <div className="absolute -bottom-5 -left-5 hidden max-w-[260px] animate-float rounded-[24px] border border-white/85 bg-white p-5 shadow-2xl lg:block dark:border-slate-800 dark:bg-slate-900">
                <div className="flex items-center gap-3">
                  <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-sky-100 text-sky-800 dark:bg-sky-950/60 dark:text-sky-300">
                    <Sparkles className="h-5 w-5" />
                  </div>
                  <div>
                    <p className="text-sm font-bold text-slate-900 dark:text-white">Design premium</p>
                    <p className="mt-0.5 text-xs leading-5 text-slate-500 dark:text-slate-400">
                      Une vitrine plus credible pour les entreprises.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── Marquee ticker ──────────────────────────────────────── */}
      <div className="marquee-wrap overflow-hidden border-y border-slate-200/60 bg-white/85 py-4 backdrop-blur-sm dark:border-slate-800/50 dark:bg-slate-900/60">
        <div className="marquee-inner">
          {[0, 1].map((index) => (
            <div key={index} className="flex shrink-0 items-center">
              {[
                'Qualite professionnelle',
                'Design elabore',
                'Confort au bureau',
                'Sphere Office',
                'Mobilier premium',
                'Excellence quotidienne',
                'Espaces de travail',
                'Esthetique raffinee',
              ].map((text) => (
                <span
                  key={text}
                  className="flex shrink-0 items-center gap-5 px-7 text-[10px] font-semibold uppercase tracking-[0.28em] text-slate-400 dark:text-slate-500"
                >
                  {text}
                  <span className="inline-block h-1 w-1 rounded-full bg-sky-400/60" />
                </span>
              ))}
            </div>
          ))}
        </div>
      </div>

      {/* ── Collections ─────────────────────────────────────────── */}
      <section className="mobile-section mx-auto w-full max-w-[1800px] px-4 py-14 sm:px-6 sm:py-20 lg:px-8 md:py-24 2xl:px-12">
        <div className="mobile-section-header section-header-divider mb-10 sm:mb-14">
          <div className="flex items-start gap-5">
            <span className="sec-counter hidden pt-1 sm:block">01</span>
            <div>
              <p className="section-label">Nos collections</p>
              <h2 className="mt-3 font-display text-3xl font-bold tracking-tight text-slate-950 md:text-4xl dark:text-white">
                Des univers penses pour la performance.
              </h2>
            </div>
          </div>
          <Link
            to="/products"
            className="hidden shrink-0 items-center text-sm font-semibold text-sky-800 transition-colors hover:text-sky-600 md:inline-flex dark:text-sky-300 dark:hover:text-sky-200"
          >
            Voir toute la boutique
            <ArrowRight className="ml-1.5 h-3.5 w-3.5" />
          </Link>
        </div>

        {isLoadingCategories ? (
          <div className="no-scrollbar -mx-4 flex snap-x snap-mandatory gap-4 overflow-x-auto px-4 pb-3 sm:mx-0 sm:grid sm:grid-cols-2 sm:gap-5 sm:overflow-visible sm:px-0 sm:pb-0 lg:grid-cols-3 lg:gap-6">
            {[0, 1, 2].map((i) => (
              <div key={i} className="h-72 w-[80vw] max-w-[320px] shrink-0 animate-pulse rounded-[26px] bg-slate-200 sm:w-auto sm:max-w-none dark:bg-slate-800 lg:h-[380px] xl:h-[440px]" />
            ))}
          </div>
        ) : curatedCollections.length === 0 ? (
          <div className="flex flex-col items-center justify-center rounded-[26px] border border-slate-200 bg-white/60 py-16 text-center dark:border-slate-800 dark:bg-slate-900/60">
            <p className="section-label justify-center">Collections bientot disponibles</p>
            <p className="mt-3 text-sm text-slate-500 dark:text-slate-400">
              Le catalogue est en cours de configuration. Decouvrez tous les produits disponibles.
            </p>
            <Link
              to="/products"
              className="mt-6 inline-flex items-center rounded-full bg-sky-900 px-5 py-2.5 text-sm font-semibold text-white transition-all hover:bg-sky-800 dark:bg-sky-500 dark:hover:bg-sky-400"
            >
              Voir tous les produits
              <ArrowRight className="ml-2 h-3.5 w-3.5" />
            </Link>
          </div>
        ) : (
          <div className="no-scrollbar -mx-4 flex snap-x snap-mandatory gap-4 overflow-x-auto px-4 pb-3 sm:mx-0 sm:grid sm:grid-cols-2 sm:gap-5 sm:overflow-visible sm:px-0 sm:pb-0 lg:grid-cols-3 lg:gap-6">
            {curatedCollections.map((category, index) => (
              <Link
                key={category.id}
                to={`/categories/${category.slug}`}
                className="group relative w-[80vw] max-w-[320px] shrink-0 snap-start overflow-hidden rounded-[26px] bg-slate-900 shadow-[0_24px_64px_-38px_rgba(15,23,42,0.5)] transition-shadow duration-500 hover:shadow-[0_32px_80px_-32px_rgba(15,23,42,0.6)] sm:w-auto sm:max-w-none"
                data-reveal="scale"
                data-delay={String(index * 80)}
              >
                <div className="collection-card-overlay absolute inset-0 z-10 transition-opacity duration-500 group-hover:opacity-80" />
                <img
                  src={DECOR_IMAGES[index]}
                  alt={category.name}
                  className="h-72 w-full object-cover transition-transform duration-700 group-hover:scale-[1.06] lg:h-[380px] xl:h-[440px]"
                  loading="lazy"
                />
                <div className="absolute inset-x-0 bottom-0 z-20 p-5 text-white sm:p-7">
                  <p className="text-[9px] font-semibold uppercase tracking-[0.34em] text-white/45">
                    Collection — {String(index + 1).padStart(2, '0')}
                  </p>
                  <h3 className="mt-2.5 font-display text-2xl font-semibold leading-tight sm:text-3xl">
                    {category.name}
                  </h3>
                  <span className="mt-4 inline-flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.22em] text-white/65 transition-all duration-300 group-hover:gap-3 group-hover:text-white/90">
                    Explorer
                    <ArrowRight className="h-3.5 w-3.5" />
                  </span>
                </div>
              </Link>
            ))}
          </div>
        )}

        {/* Mobile: see all link */}
        <div className="mt-6 flex justify-center sm:hidden">
          <Link
            to="/products"
            className="inline-flex items-center rounded-full border border-slate-300 bg-white px-5 py-2.5 text-sm font-semibold text-slate-900 shadow-sm transition-all hover:border-sky-400 hover:text-sky-800 dark:border-slate-700 dark:bg-slate-900 dark:text-white dark:hover:border-sky-400"
          >
            Voir toute la boutique
            <ArrowRight className="ml-2 h-3.5 w-3.5" />
          </Link>
        </div>
      </section>

      {/* ── About strip ─────────────────────────────────────────── */}
      <section className="mobile-section bg-white py-14 sm:py-20 md:py-24 dark:bg-slate-900">
        <div className="mx-auto grid w-full max-w-[1800px] items-center gap-10 px-4 sm:gap-14 sm:px-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)] lg:gap-16 lg:px-8 2xl:px-12">
          <div data-reveal="fade-left">
            <div className="flex items-start gap-5">
              <span className="sec-counter hidden pt-1 sm:block">02</span>
              <div>
                <p className="section-label">Sphere Office</p>
                <h2 className="mt-4 font-display text-3xl font-bold tracking-tight text-slate-950 md:text-4xl dark:text-white">
                  L'excellence pour votre{' '}
                  <em className="font-light not-italic text-slate-400 dark:text-slate-500">espace de travail.</em>
                </h2>
              </div>
            </div>
            <p className="mt-6 text-lg leading-8 text-slate-600 dark:text-slate-300">
              Nous construisons une experience d'achat plus claire pour les professionnels qui veulent des bureaux bien equipes, sans perdre de temps dans des catalogues confus.
            </p>
            <p className="mt-5 text-sm leading-7 text-slate-500 dark:text-slate-400">
              La selection, la presentation et les points de contact sont penses pour aider a choisir plus vite, commander plus sereinement et mieux valoriser votre environnement de travail.
            </p>
            <div className="mt-10 flex flex-wrap gap-4">
              <MagneticLink
                to="/about"
                className="btn-liquid btn-lift inline-flex items-center rounded-full bg-sky-900 px-6 py-3.5 text-sm font-semibold text-white shadow-md shadow-sky-900/20 hover:bg-sky-800"
              >
                Decouvrir notre histoire
              </MagneticLink>
              <Link
                to="/contact"
                className="inline-flex items-center rounded-full border border-slate-300 px-6 py-3.5 text-sm font-semibold text-slate-900 transition-colors hover:border-sky-400 hover:text-sky-800 dark:border-slate-700 dark:text-white dark:hover:border-sky-400 dark:hover:text-sky-300"
              >
                Demander un accompagnement
              </Link>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4 xl:gap-5" data-reveal="fade-right" data-delay="100">
            <img
              src={DECOR_IMAGES[0]}
              alt="Showroom haut de gamme"
              className="h-56 w-full rounded-[26px] object-cover shadow-xl transition-transform duration-500 hover:-translate-y-1 sm:h-72 md:h-80"
              loading="lazy"
            />
            <div className="hidden space-y-4 pt-10 sm:block">
              <img
                src={DECOR_IMAGES[1]}
                alt="Materiaux premium"
                className="h-44 w-full rounded-[22px] object-cover shadow-xl transition-transform duration-500 hover:-translate-y-1 md:h-52"
                loading="lazy"
              />
              <img
                src={DECOR_IMAGES[2]}
                alt="Open space equipe"
                className="h-44 w-full rounded-[22px] object-cover shadow-xl transition-transform duration-500 hover:-translate-y-1 md:h-52"
                loading="lazy"
              />
            </div>
          </div>
        </div>
      </section>

      {/* ── Featured products ────────────────────────────────────── */}
      <section className="mobile-section mx-auto w-full max-w-[1800px] px-4 pb-14 pt-12 sm:px-6 sm:pb-20 sm:pt-16 lg:px-8 md:pb-24 2xl:px-12">
        <div className="mobile-section-header section-header-divider mb-10 sm:mb-14">
          <div className="flex items-start gap-5">
            <span className="sec-counter hidden pt-1 sm:block">03</span>
            <div>
              <p className="section-label">Nouveautes</p>
              <h2 className="mt-3 font-display text-3xl font-bold tracking-tight text-slate-950 md:text-4xl dark:text-white">
                Les derniers produits ajoutes au catalogue.
              </h2>
            </div>
          </div>
          <Link
            to="/products"
            className="hidden shrink-0 items-center text-sm font-semibold text-sky-800 transition-colors hover:text-sky-600 md:inline-flex dark:text-sky-300 dark:hover:text-sky-200"
          >
            Voir toute la boutique
            <ArrowRight className="ml-1.5 h-3.5 w-3.5" />
          </Link>
        </div>

        {isLoadingProducts ? (
          <CatalogSkeleton count={4} title="Chargement des nouveautes" subtitle="Les derniers produits arrivent dans la vitrine." />
        ) : isProductsError ? (
          <div className="rounded-[28px] border border-dashed border-red-300 bg-red-50 px-6 py-16 text-center dark:border-red-900/40 dark:bg-red-950/20">
            <h3 className="text-xl font-semibold text-red-700 dark:text-red-400">Erreur de connexion</h3>
            <p className="mt-3 font-mono text-sm text-red-600 dark:text-red-500">
              {productsError instanceof Error ? productsError.message : String(productsError)}
            </p>
          </div>
        ) : (
          <>
          <div className="mobile-app-products-grid md:hidden">
            {featuredProducts.map((product) => (
              <MobileProductCard key={product.id} product={product} compact />
            ))}
          </div>
          <div className="mobile-product-grid hidden grid-cols-2 gap-3 sm:gap-4 md:grid md:grid-cols-3 xl:grid-cols-4">
            {featuredProducts.map((product) => (
              <ProductCard key={product.id} product={product} size="featured" />
            ))}
          </div>
          </>
        )}

        {/* Mobile: see all link */}
        <div className="mt-8 flex justify-center md:hidden">
          <Link
            to="/products"
            className="inline-flex items-center text-sm font-semibold text-sky-800 dark:text-sky-300"
          >
            Voir toute la boutique
            <ArrowRight className="ml-2 h-4 w-4" />
          </Link>
        </div>
      </section>
    </div>
  );
}
