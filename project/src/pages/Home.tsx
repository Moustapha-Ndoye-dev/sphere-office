import React, { useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { ArrowRight, Truck, Clock, Shield, TrendingUp, Search, Tag, Star } from 'lucide-react';
import { getProducts, getPromotedProducts } from '../services/products';
import { getProductReviews } from '../services/reviews';
import { ProductCard } from '../components/ui/ProductCard';
import { LoadingSpinner } from '../components/LoadingSpinner';
import { motion } from 'framer-motion';

export function Home() {
  const { data: productsData, isLoading: isLoadingProducts } = useQuery({
    queryKey: ['products', 1],
    queryFn: () => getProducts(),
  });
  const { data: promotedProducts, isLoading: isLoadingPromos } = useQuery({
    queryKey: ['promoted-products'],
    queryFn: () => getPromotedProducts(),
  });

  // Récupérer les avis pour le premier produit (pour la démo)
  const { data: reviews } = useQuery({
    queryKey: ['product-reviews', productsData?.data?.[0]?.id],
    queryFn: () => getProductReviews(productsData?.data?.[0]?.id!),
    enabled: !!productsData?.data?.[0]?.id,
  });

  // Trier les avis par note et prendre les 3 meilleurs
  const topReviews = React.useMemo(() => {
    if (!reviews) return [];
    return [...reviews]
      .sort((a, b) => b.rating - a.rating)
      .slice(0, 3);
  }, [reviews]);

  // Animation variants
  const containerVariants = {
    hidden: { opacity: 0 },
    visible: { 
      opacity: 1,
      transition: { 
        staggerChildren: 0.2,
        delayChildren: 0.3
      }
    }
  };
  
  const itemVariants = {
    hidden: { y: 20, opacity: 0 },
    visible: { 
      y: 0, 
      opacity: 1,
      transition: { type: 'spring', stiffness: 100 }
    }
  };

  if (isLoadingProducts || isLoadingPromos) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <LoadingSpinner variant="pulse" size="md" text="Chargement des produits..." />
      </div>
    );
  }

  const features = [
    {
      icon: Truck,
      title: 'Expédition rapide',
      description: 'Livraison sous 24-48h partout en France',
      color: 'from-blue-500 to-blue-600'
    },
    {
      icon: Clock,
      title: 'Horaires étendus',
      description: 'Ouvert de 8h à 18h du lundi au samedi',
      color: 'from-green-500 to-green-600'
    },
    {
      icon: Shield,
      title: 'Service client premium',
      description: 'Disponible 7j/7 pour vous accompagner',
      color: 'from-purple-500 to-purple-600'
    },
  ];

  return (
    <div className="overflow-hidden">
      {/* Hero Section avec parallax */}
      <section className="relative min-h-[70vh] flex flex-col md:flex-row items-center bg-gradient-to-r from-primary-700 to-primary-900 text-white overflow-hidden">
        <div className="flex-1 flex flex-col items-start justify-center px-4 sm:px-6 py-12 md:py-32 z-10 max-w-2xl">
          <motion.h1 
            className="text-3xl sm:text-4xl md:text-6xl font-extrabold mb-4 sm:mb-8 leading-tight drop-shadow-xl"
            initial={{ opacity: 0, y: 40 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 1 }}
          >
            <span className="bg-clip-text text-transparent bg-gradient-to-r from-white via-blue-200 to-blue-400">
              Équipez votre espace de travail avec style et efficacité
            </span>
          </motion.h1>
          <motion.p
            className="text-lg sm:text-xl md:text-2xl mb-6 sm:mb-10 text-gray-100 leading-relaxed drop-shadow-lg"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3, duration: 1 }}
          >
            Découvrez notre sélection premium de fournitures de bureau pour booster votre productivité.
          </motion.p>
          <motion.div
            whileHover={{ scale: 1.07 }}
            whileTap={{ scale: 0.97 }}
            className="flex flex-col sm:flex-row gap-4 w-full sm:w-auto"
          >
            <Link
              to="/products"
              className="w-full sm:w-auto inline-flex items-center justify-center px-6 sm:px-10 py-3 sm:py-4 bg-gradient-to-r from-blue-500 to-primary-600 text-white rounded-full font-bold text-base sm:text-lg shadow-xl hover:from-blue-600 hover:to-primary-700 transition-all duration-300"
            >
              Découvrir la boutique
              <ArrowRight className="ml-2 sm:ml-3 h-5 w-5 sm:h-6 sm:w-6" />
            </Link>
            <Link
              to="/contact"
              className="w-full sm:w-auto inline-flex items-center justify-center px-6 sm:px-8 py-3 sm:py-4 bg-white/20 text-white border border-white/30 rounded-full font-medium hover:bg-white/30 transition-colors shadow-lg backdrop-blur"
            >
              Contactez-nous
            </Link>
          </motion.div>
        </div>
        <div className="hidden md:flex flex-1 items-center justify-center w-full h-full relative px-0">
          <img
            src="/assets/hero-bureau.jpg"
            alt="Bureau moderne"
            className="w-full max-w-xl h-auto max-h-[500px] object-cover rounded-3xl shadow-2xl border-4 border-white/10 bg-white/10"
            style={{ minHeight: '220px' }}
          />
          <div className="absolute top-1/4 left-1/2 w-72 h-72 bg-blue-400 opacity-10 rounded-full blur-3xl -translate-x-1/2 -z-10 animate-pulse"></div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-12 sm:py-20 bg-gradient-to-b from-gray-50 to-white dark:from-gray-900 dark:to-gray-800">
        <div className="container mx-auto px-4 sm:px-6">
          <motion.div 
            className="text-center mb-8 sm:mb-16"
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
          >
            <h2 className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-white mb-4">Nos avantages</h2>
            <div className="w-24 h-1 bg-gradient-to-r from-primary-500 to-primary-700 mx-auto rounded-full"></div>
          </motion.div>
          
          <motion.div 
            className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6 sm:gap-10"
            variants={containerVariants}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true }}
          >
            {features.map((feature, index) => (
              <motion.div
                key={feature.title}
                variants={itemVariants}
                className="group"
              >
                <div className="flex flex-col items-center p-6 sm:p-8 bg-white dark:bg-gray-800 rounded-2xl shadow-lg hover:shadow-2xl transition-all duration-300 transform hover:-translate-y-2 h-full border border-gray-100 dark:border-gray-700">
                  <div className={`p-3 sm:p-4 rounded-full mb-4 sm:mb-6 bg-gradient-to-br ${feature.color} shadow-lg group-hover:scale-110 transition-transform duration-300`}>
                    <feature.icon className="h-6 w-6 sm:h-8 sm:w-8 text-white" />
                  </div>
                  <h3 className="text-lg sm:text-xl font-bold text-gray-900 dark:text-white mb-2 sm:mb-3">
                    {feature.title}
                  </h3>
                  <p className="text-center text-sm sm:text-base text-gray-600 dark:text-gray-300">
                    {feature.description}
                  </p>
                </div>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* Section Promotions */}
      <section className="py-12 sm:py-20 bg-gradient-to-b from-gray-50 to-white dark:from-gray-900 dark:to-gray-800 overflow-hidden relative">
        <div className="container mx-auto px-4 sm:px-6">
          <motion.div 
            className="max-w-2xl mx-auto text-center mb-8 sm:mb-12"
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
          >
            <div className="flex justify-center mb-4">
              <Star className="h-8 w-8 sm:h-10 sm:w-10 text-yellow-400" />
            </div>
            <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold text-gray-900 dark:text-white mb-4">L'excellence pour votre espace de travail</h2>
            <p className="text-base sm:text-lg text-gray-600 dark:text-gray-300 mb-6">
              Chez Sphere Office, nous sélectionnons des fournitures et du mobilier de bureau haut de gamme pour transformer votre quotidien professionnel.
            </p>
            <Link
              to="/about"
              className="inline-flex items-center px-6 sm:px-8 py-2 sm:py-3 bg-primary-600 text-white rounded-full font-medium hover:bg-primary-700 transition-colors shadow-lg"
            >
              En savoir plus
              <ArrowRight className="ml-2 h-4 w-4 sm:h-5 sm:w-5" />
            </Link>
          </motion.div>
        </div>
      </section>

      {/* Section Nouveautés */}
      <section className="py-12 sm:py-20 bg-white dark:bg-gray-800 relative overflow-hidden">
        <div className="absolute top-0 inset-0 bg-gradient-to-br from-primary-50/30 to-transparent dark:from-primary-900/10 dark:to-transparent transform -skew-y-6 z-0"></div>
        <div className="container mx-auto px-4 sm:px-6 relative z-10">
          <motion.div 
            className="flex items-center mb-8 sm:mb-12"
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            viewport={{ once: true }}
          >
            <div className="flex items-center">
              <div className="p-2 sm:p-3 bg-green-100 dark:bg-green-900/30 rounded-full mr-3 sm:mr-4">
                <Tag className="h-5 w-5 sm:h-6 sm:w-6 text-green-600 dark:text-green-400" />
              </div>
              <div>
                <h2 className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-gray-100">
                  Nouveautés
                </h2>
                <p className="mt-1 sm:mt-2 text-sm sm:text-base text-gray-600 dark:text-gray-400">
                  Découvrez nos derniers arrivages
                </p>
              </div>
            </div>
          </motion.div>
          <motion.div 
            className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-8"
            variants={containerVariants}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true }}
          >
            {productsData?.data?.slice(0, 3).map((product, index) => (
              <motion.div key={product.id} variants={itemVariants} className="relative">
                <ProductCard product={product} size="large" />
                <span className="absolute top-2 sm:top-3 left-2 sm:left-3 bg-primary-600 text-white text-xs font-bold px-2 sm:px-3 py-1 rounded-full shadow-lg">Nouveau</span>
              </motion.div>
            ))}
          </motion.div>
          <div className="flex justify-center mt-8 sm:mt-10">
            <Link
              to="/products"
              className="inline-flex items-center px-6 sm:px-8 py-2 sm:py-3 bg-primary-600 text-white rounded-full font-medium hover:bg-primary-700 transition-colors shadow-lg"
            >
              Voir tout
              <ArrowRight className="ml-2 h-4 w-4 sm:h-5 sm:w-5" />
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}