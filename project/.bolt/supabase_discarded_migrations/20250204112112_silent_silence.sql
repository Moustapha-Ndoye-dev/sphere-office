-- Insert categories
INSERT INTO categories (id, name, slug) VALUES
('c0a80121-736e-4f2e-8ac9-3f8f9bf8a416', 'Papeterie', 'papeterie'),
('c0a80121-736e-4f2e-8ac9-3f8f9bf8a417', 'Mobilier', 'mobilier'),
('c0a80121-736e-4f2e-8ac9-3f8f9bf8a418', 'Informatique', 'informatique'),
('c0a80121-736e-4f2e-8ac9-3f8f9bf8a419', 'Classement', 'classement');

-- Insert products
INSERT INTO products (id, name, slug, description, price, category_id, images, stock) VALUES
('p0a80121-736e-4f2e-8ac9-3f8f9bf8a416', 'Cahier A4 Premium', 'cahier-a4-premium', 'Cahier A4 de qualité supérieure, 96 pages', 4.99, 'c0a80121-736e-4f2e-8ac9-3f8f9bf8a416', '["https://images.unsplash.com/photo-1517842645767-c639042777db?w=800"]', 100),
('p0a80121-736e-4f2e-8ac9-3f8f9bf8a417', 'Bureau Ergonomique', 'bureau-ergonomique', 'Bureau ergonomique réglable en hauteur', 299.99, 'c0a80121-736e-4f2e-8ac9-3f8f9bf8a417', '["https://images.unsplash.com/photo-1518455027359-f3f8164ba6bd?w=800"]', 20),
('p0a80121-736e-4f2e-8ac9-3f8f9bf8a418', 'Support Laptop', 'support-laptop', 'Support ergonomique pour ordinateur portable', 29.99, 'c0a80121-736e-4f2e-8ac9-3f8f9bf8a418', '["https://images.unsplash.com/photo-1527864550417-7fd91fc51a46?w=800"]', 50),
('p0a80121-736e-4f2e-8ac9-3f8f9bf8a419', 'Classeur A4', 'classeur-a4', 'Classeur A4 à levier, dos 75mm', 6.99, 'c0a80121-736e-4f2e-8ac9-3f8f9bf8a419', '["https://images.unsplash.com/photo-1586075010923-2dd4570fb338?w=800"]', 200);

-- Insert promotions
INSERT INTO promotions (id, name, description, discount_type, discount_value, start_date, end_date) VALUES
('pr080121-736e-4f2e-8ac9-3f8f9bf8a416', 'Soldes d''été', 'Profitez de nos soldes d''été !', 'percentage', 20, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP + INTERVAL '30 days');

-- Link promotions to products
INSERT INTO promotion_products (promotion_id, product_id) VALUES
('pr080121-736e-4f2e-8ac9-3f8f9bf8a416', 'p0a80121-736e-4f2e-8ac9-3f8f9bf8a417'),
('pr080121-736e-4f2e-8ac9-3f8f9bf8a416', 'p0a80121-736e-4f2e-8ac9-3f8f9bf8a418');

-- Insert reviews
INSERT INTO reviews (product_id, customer_name, rating, comment, is_approved) VALUES
('p0a80121-736e-4f2e-8ac9-3f8f9bf8a417', 'Jean Dupont', 5, 'Excellent bureau, très confortable !', true),
('p0a80121-736e-4f2e-8ac9-3f8f9bf8a418', 'Marie Martin', 4, 'Bon support, installation facile', true);

-- Insert notifications for admins
INSERT INTO notifications (type, title, content, recipient_email, metadata) VALUES
('low_stock', 'Stock bas - Bureau Ergonomique', 'Le produit Bureau Ergonomique a un stock bas (20 unités restantes).', 'youneshachami9@gmail.com', '{"product_id": "p0a80121-736e-4f2e-8ac9-3f8f9bf8a417", "product_name": "Bureau Ergonomique", "stock": 20}'),
('review_approved', 'Nouvel avis approuvé', 'Un nouvel avis a été approuvé pour le Bureau Ergonomique', 'youneshachami9@gmail.com', '{"product_id": "p0a80121-736e-4f2e-8ac9-3f8f9bf8a417", "product_name": "Bureau Ergonomique", "rating": 5}');