import React from 'react';
import { Star } from 'lucide-react';
import type { Database } from '../../types/database';

type Review = Database['public']['Tables']['reviews']['Row'];

interface ReviewListProps {
  reviews: Review[];
}

export function ReviewList({ reviews }: ReviewListProps) {
  return (
    <div className="space-y-4">
      {reviews.map((review) => (
        <div
          key={review.id}
          className="bg-white dark:bg-gray-800 p-4 rounded-lg shadow"
        >
          <div className="flex items-center justify-between mb-2">
            <span className="font-medium text-gray-900 dark:text-gray-100">
              {review.customer_name}
            </span>
            <div className="flex">
              {[1, 2, 3, 4, 5].map((star) => (
                <Star
                  key={star}
                  className={`h-5 w-5 ${
                    star <= review.rating
                      ? 'text-yellow-400 fill-current'
                      : 'text-gray-300 dark:text-gray-600'
                  }`}
                />
              ))}
            </div>
          </div>
          {review.comment && (
            <p className="text-gray-600 dark:text-gray-400">{review.comment}</p>
          )}
        </div>
      ))}
    </div>
  );
}