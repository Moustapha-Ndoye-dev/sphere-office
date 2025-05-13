import React from 'react';
import { useParams, Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { CheckCircle, Phone, Mail, Truck, Clock, Calendar, ShoppingBag } from 'lucide-react';
import { getOrderById } from '../services/orders';
import { formatPrice } from '../lib/utils';

export function OrderConfirmation() {
  const { orderId } = useParams<{ orderId: string }>();

  const { data: order, isLoading } = useQuery({
    queryKey: ['order', orderId],
    queryFn: () => getOrderById(orderId!),
    enabled: !!orderId,
  });

  // Animation de confettis
  React.useEffect(() => {
    const createConfetti = () => {
      const confettiCount = 100;
      const colors = ['#FFC107', '#FF9800', '#4CAF50', '#2196F3', '#9C27B0'];
      
      for (let i = 0; i < confettiCount; i++) {
        const confetti = document.createElement('div');
        confetti.className = 'confetti';
        confetti.style.setProperty('--x', Math.random() * 100 + 'vw');
        confetti.style.setProperty('--y', Math.random() * -100 + 'vh');
        confetti.style.setProperty('--r', Math.random() * 360 + 'deg');
        confetti.style.setProperty('--s', Math.random() * 1 + 0.5);
        confetti.style.backgroundColor = colors[Math.floor(Math.random() * colors.length)];
        
        document.getElementById('confetti-container')?.appendChild(confetti);
        
        // Suppression après l'animation
        setTimeout(() => {
          confetti.remove();
        }, 3000);
      }
    };
    
    if (order) {
      createConfetti();
    }
  }, [order]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
      </div>
    );
  }

  if (!order) {
    return (
      <div className="container mx-auto px-4 py-8">
        <p className="text-center text-gray-600 dark:text-gray-400">
          Commande non trouvée
        </p>
      </div>
    );
  }

  // Calcul d'une date de livraison estimée (3-5 jours ouvrés)
  const estimatedDeliveryDate = new Date();
  estimatedDeliveryDate.setDate(estimatedDeliveryDate.getDate() + 3 + Math.floor(Math.random() * 3));
  const formattedDeliveryDate = estimatedDeliveryDate.toLocaleDateString('fr-FR', {
    weekday: 'long',
    day: 'numeric',
    month: 'long'
  });

  return (
    <div className="container mx-auto px-4 py-8 relative">
      {/* Conteneur pour les confettis */}
      <div id="confetti-container" className="fixed inset-0 pointer-events-none z-50 overflow-hidden"></div>
      
      <style jsx>{`
        .confetti {
          position: absolute;
          width: 10px;
          height: 10px;
          top: 0;
          left: var(--x);
          opacity: 0;
          transform: translateY(var(--y)) rotate(var(--r)) scale(var(--s));
          animation: confetti-fall 3s ease-in-out forwards;
          z-index: 100;
        }
        
        @keyframes confetti-fall {
          0% {
            opacity: 1;
            transform: translateY(var(--y)) rotate(0) scale(var(--s));
          }
          100% {
            opacity: 0;
            transform: translateY(100vh) rotate(var(--r)) scale(var(--s));
          }
        }
      `}</style>

      <div className="max-w-2xl mx-auto">
        {/* En-tête avec icône de succès */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-20 h-20 bg-green-100 dark:bg-green-900/50 rounded-full mb-4 animate-bounce">
            <CheckCircle className="h-10 w-10 text-green-500" />
          </div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100 mb-3">
            Commande confirmée !
          </h1>
          <p className="text-xl text-gray-600 dark:text-gray-400 max-w-md mx-auto">
            Merci pour votre achat. Votre commande a été enregistrée avec succès et sera traitée rapidement.
          </p>
        </div>

        {/* Carte avec numéro de commande */}
        <div className="bg-gradient-to-r from-primary-600 to-primary-800 rounded-lg p-6 mb-8 text-white shadow-lg">
          <div className="flex justify-between items-center">
            <div>
              <p className="text-primary-100 text-sm">Numéro de commande</p>
              <p className="text-2xl font-bold">#{order.id.slice(0, 8).toUpperCase()}</p>
            </div>
            <ShoppingBag className="h-12 w-12 opacity-80" />
          </div>
          <div className="mt-4 pt-4 border-t border-primary-500">
            <div className="flex justify-between">
              <span>Date de commande</span>
              <span className="font-medium">{new Date().toLocaleDateString('fr-FR')}</span>
            </div>
            <div className="flex justify-between mt-2">
              <span>Total</span>
              <span className="font-bold text-xl">{formatPrice(order.total)}</span>
            </div>
          </div>
        </div>

        {/* Message d'appel */}
        <div className="bg-primary-50 dark:bg-primary-900/50 rounded-lg p-6 mb-8 shadow-md">
          <div className="flex items-start">
            <div className="flex-shrink-0">
              <Phone className="h-6 w-6 text-primary-600 dark:text-primary-400" />
            </div>
            <div className="ml-4">
              <h2 className="text-lg font-medium text-gray-900 dark:text-gray-100">
                Confirmation par téléphone
              </h2>
              <p className="mt-1 text-gray-600 dark:text-gray-400">
                Nous vous appellerons prochainement au <span className="font-medium">{order.phone}</span> pour confirmer votre commande et organiser la livraison.
              </p>
            </div>
          </div>
        </div>

        {/* Détails de la commande */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6 mb-6">
          <h2 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-4 flex items-center">
            <ShoppingBag className="h-5 w-5 mr-2 text-primary-600" />
            Détails de la commande
          </h2>

          <dl className="divide-y dark:divide-gray-700">
            <div className="py-4 flex justify-between">
              <dt className="text-gray-600 dark:text-gray-400">
                Client
              </dt>
              <dd className="text-gray-900 dark:text-gray-100 font-medium">
                {order.customer_name}
              </dd>
            </div>

            <div className="py-4 flex justify-between">
              <dt className="text-gray-600 dark:text-gray-400">Email</dt>
              <dd className="text-gray-900 dark:text-gray-100 font-medium">
                {order.email}
              </dd>
            </div>

            <div className="py-4 flex justify-between">
              <dt className="text-gray-600 dark:text-gray-400">Téléphone</dt>
              <dd className="text-gray-900 dark:text-gray-100 font-medium">
                {order.phone}
              </dd>
            </div>

            <div className="py-4">
              <dt className="text-gray-600 dark:text-gray-400 mb-2">
                Adresse de livraison
              </dt>
              <dd className="text-gray-900 dark:text-gray-100">
                {order.address}
              </dd>
            </div>

            {order.notes && (
              <div className="py-4">
                <dt className="text-gray-600 dark:text-gray-400 mb-2">
                  Notes
                </dt>
                <dd className="text-gray-900 dark:text-gray-100 italic">
                  "{order.notes}"
                </dd>
              </div>
            )}
          </dl>
        </div>

        {/* Prochaines étapes */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6 mb-6">
          <h2 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-4">
            Prochaines étapes
          </h2>

          <div className="space-y-6">
            <div className="flex items-start">
              <div className="flex-shrink-0 bg-primary-100 dark:bg-primary-900/50 p-2 rounded-full">
                <Mail className="h-5 w-5 text-primary-600 dark:text-primary-400" />
              </div>
              <div className="ml-4">
                <h3 className="text-md font-medium text-gray-900 dark:text-gray-100">
                  Email de confirmation
                </h3>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  Un récapitulatif de votre commande a été envoyé à <span className="font-medium">{order.email}</span>
                </p>
              </div>
            </div>

            <div className="flex items-start">
              <div className="flex-shrink-0 bg-primary-100 dark:bg-primary-900/50 p-2 rounded-full">
                <Clock className="h-5 w-5 text-primary-600 dark:text-primary-400" />
              </div>
              <div className="ml-4">
                <h3 className="text-md font-medium text-gray-900 dark:text-gray-100">
                  Traitement de la commande
                </h3>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  Votre commande est en cours de préparation dans nos entrepôts
                </p>
              </div>
            </div>

            <div className="flex items-start">
              <div className="flex-shrink-0 bg-primary-100 dark:bg-primary-900/50 p-2 rounded-full">
                <Calendar className="h-5 w-5 text-primary-600 dark:text-primary-400" />
              </div>
              <div className="ml-4">
                <h3 className="text-md font-medium text-gray-900 dark:text-gray-100">
                  Date de livraison estimée
                </h3>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  <span className="font-medium">{formattedDeliveryDate}</span> (sous réserve de confirmation)
                </p>
              </div>
            </div>

            <div className="flex items-start">
              <div className="flex-shrink-0 bg-primary-100 dark:bg-primary-900/50 p-2 rounded-full">
                <Truck className="h-5 w-5 text-primary-600 dark:text-primary-400" />
              </div>
              <div className="ml-4">
                <h3 className="text-md font-medium text-gray-900 dark:text-gray-100">
                  Livraison
                </h3>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  Nous vous communiquerons les détails de livraison lors de la confirmation téléphonique
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Contact et support */}
        <div className="bg-gray-50 dark:bg-gray-900/50 rounded-lg p-8 text-center shadow-md">
          <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-3">
            Une question sur votre commande ?
          </h3>
          <p className="text-gray-600 dark:text-gray-400 mb-6 max-w-md mx-auto">
            Notre équipe de support client est disponible pour vous aider avec toutes vos questions.
          </p>
          <div className="space-x-4">
            <Link
              to="/contact"
              className="inline-flex items-center px-6 py-3 border border-transparent rounded-md shadow-sm text-base font-medium text-white bg-primary-600 hover:bg-primary-700 transition-colors"
            >
              Nous contacter
            </Link>
            <Link
              to="/"
              className="inline-flex items-center px-6 py-3 border border-gray-300 dark:border-gray-700 rounded-md shadow-sm text-base font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
            >
              Retour à l'accueil
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}