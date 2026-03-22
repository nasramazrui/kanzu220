import React, { useState, useEffect } from 'react';
import { collection, onSnapshot, query, orderBy, where } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { handleFirestoreError, OperationType } from '../lib/firestore-errors';
import { Product } from '../App';
import { motion, AnimatePresence } from 'framer-motion';
import { Link } from 'react-router-dom';
import { useApp } from '../App';
import { ChevronLeft, ChevronRight, ArrowRight } from 'lucide-react';
import { cn, getDirectImageUrl } from '../lib/utils';

export const StoreHome = () => {
  const [products, setProducts] = useState<Product[]>([]);
  const [banners, setBanners] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Fetch Products
    const qProducts = query(collection(db, 'products'), orderBy('created_at', 'desc'));
    const unsubProducts = onSnapshot(qProducts, (snapshot) => {
      const prods = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Product));
      setProducts(prods);
      setLoading(false);
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, 'products');
    });

    // Fetch Banners
    const qBanners = query(
      collection(db, 'banners'), 
      orderBy('order', 'asc')
    );
    const unsubBanners = onSnapshot(qBanners, (snapshot) => {
      const allBanners = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      // Filter active banners in memory to avoid index requirements
      setBanners(allBanners.filter((b: any) => b.is_active !== false));
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, 'banners');
    });

    return () => {
      unsubProducts();
      unsubBanners();
    };
  }, []);

  return (
    <div className="space-y-12">
      {/* Banner Slider */}
      {banners.length > 0 && <BannerSlider banners={banners} />}

      <div className="container mx-auto px-4 py-8">
        <div className="mb-12 text-center">
          <h1 className="font-serif text-4xl md:text-6xl font-bold mb-4">
            Bidhaa <span className="text-[#c9a84c] italic">Zetu</span>
          </h1>
          <p className="text-white/60 max-w-2xl mx-auto">
            Tunaleta uzuri wa Swahili hadi mlangoni mwako. Ubora wa juu, bei ya haki.
          </p>
        </div>

        {loading ? (
          <div className="flex justify-center py-20">
            <div className="h-12 w-12 animate-spin rounded-full border-4 border-[#c9a84c] border-t-transparent"></div>
          </div>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-6">
            {products.map((product) => (
              <ProductCard key={product.id} product={product} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

const BannerSlider = ({ banners }: { banners: any[] }) => {
  const [currentIndex, setCurrentIndex] = useState(0);

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentIndex((prev) => (prev + 1) % banners.length);
    }, 5000);
    return () => clearInterval(timer);
  }, [banners.length]);

  const next = () => setCurrentIndex((prev) => (prev + 1) % banners.length);
  const prev = () => setCurrentIndex((prev) => (prev - 1 + banners.length) % banners.length);

  return (
    <div className="relative h-[400px] md:h-[600px] w-full overflow-hidden bg-black">
      <AnimatePresence mode="wait">
        <motion.div
          key={currentIndex}
          initial={{ opacity: 0, x: 100 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -100 }}
          transition={{ duration: 0.6, ease: "easeInOut" }}
          className="absolute inset-0"
        >
          {/* Background Image */}
          <div className="absolute inset-0">
            <img
              key={banners[currentIndex].id}
              src={getDirectImageUrl(banners[currentIndex].image_url)}
              alt={banners[currentIndex].title}
              className="h-full w-full object-cover opacity-80"
              referrerPolicy="no-referrer"
              onError={(e) => {
                (e.target as HTMLImageElement).src = 'https://picsum.photos/seed/kanzu/1920/1080?blur=10';
              }}
            />
            <div className="absolute inset-0 bg-gradient-to-r from-black via-black/20 to-transparent" />
          </div>

          {/* Content */}
          <div className="container relative mx-auto flex h-full items-center px-4 md:px-12">
            <div className="max-w-2xl space-y-6">
              {banners[currentIndex].badge && (
                <motion.span
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.2 }}
                  className="inline-block rounded-full bg-[#c9a84c]/20 px-4 py-1 text-xs font-bold uppercase tracking-widest text-[#c9a84c]"
                >
                  {banners[currentIndex].badge}
                </motion.span>
              )}
              <motion.h2
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3 }}
                className="font-serif text-4xl font-bold leading-tight text-white md:text-7xl"
              >
                {banners[currentIndex].title}
              </motion.h2>
              <motion.p
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.4 }}
                className="text-lg text-white/70 md:text-xl"
              >
                {banners[currentIndex].subtitle}
              </motion.p>
              
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.5 }}
              >
                {banners[currentIndex].button_link ? (
                  <Link
                    to={banners[currentIndex].button_link}
                    className="group inline-flex items-center gap-2 rounded-full bg-[#c9a84c] px-8 py-4 text-sm font-bold text-black transition-all hover:scale-105 hover:bg-[#e8d5a3]"
                  >
                    {banners[currentIndex].button_text || 'Shop Now'}
                    <ArrowRight size={18} className="transition-transform group-hover:translate-x-1" />
                  </Link>
                ) : (
                  <button
                    onClick={() => window.scrollTo({ top: 600, behavior: 'smooth' })}
                    className="group inline-flex items-center gap-2 rounded-full bg-[#c9a84c] px-8 py-4 text-sm font-bold text-black transition-all hover:scale-105 hover:bg-[#e8d5a3]"
                  >
                    {banners[currentIndex].button_text || 'Angalia Bidhaa'}
                    <ArrowRight size={18} className="transition-transform group-hover:translate-x-1" />
                  </button>
                )}
              </motion.div>
            </div>
          </div>
        </motion.div>
      </AnimatePresence>

      {/* Navigation Controls */}
      {banners.length > 1 && (
        <>
          <button
            onClick={prev}
            className="absolute left-4 top-1/2 z-10 -translate-y-1/2 rounded-full bg-black/20 p-3 text-white backdrop-blur-md transition-all hover:bg-[#c9a84c] hover:text-black"
          >
            <ChevronLeft size={24} />
          </button>
          <button
            onClick={next}
            className="absolute right-4 top-1/2 z-10 -translate-y-1/2 rounded-full bg-black/20 p-3 text-white backdrop-blur-md transition-all hover:bg-[#c9a84c] hover:text-black"
          >
            <ChevronRight size={24} />
          </button>

          {/* Indicators */}
          <div className="absolute bottom-8 left-1/2 flex -translate-x-1/2 gap-2">
            {banners.map((_, idx) => (
              <button
                key={idx}
                onClick={() => setCurrentIndex(idx)}
                className={cn(
                  "h-1.5 transition-all rounded-full",
                  currentIndex === idx ? "w-8 bg-[#c9a84c]" : "w-2 bg-white/30 hover:bg-white/50"
                )}
              />
            ))}
          </div>
        </>
      )}
    </div>
  );
};

const ProductCard = ({ product }: { product: Product }) => {
  const { addToCart } = useApp();
  const discount = product.old_price ? Math.round(((product.old_price - product.price) / product.old_price) * 100) : 0;

  return (
    <motion.div
      whileHover={{ y: -5 }}
      className="group relative overflow-hidden rounded-2xl border border-white/5 bg-white/5 transition-all hover:border-[#c9a84c]/30 hover:shadow-2xl hover:shadow-black/50"
    >
      <Link to={`/product/${product.id}`}>
        <div className="aspect-[3/4] overflow-hidden bg-white/5">
          <img
            src={getDirectImageUrl(product.image_url)}
            alt={product.name}
            className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-110"
            referrerPolicy="no-referrer"
            onError={(e) => {
              (e.target as HTMLImageElement).src = 'https://picsum.photos/seed/product/800/1200';
            }}
          />
          {discount > 0 && (
            <div className="absolute top-3 left-3 rounded-md bg-red-600 px-2 py-1 text-[10px] font-bold text-white">
              -{discount}%
            </div>
          )}
          {!product.in_stock && (
            <div className="absolute inset-0 flex items-center justify-center bg-black/60 backdrop-blur-[2px]">
              <span className="rounded-full bg-black/80 px-4 py-1 text-xs font-bold text-white/60">Sold Out</span>
            </div>
          )}
        </div>
      </Link>

      <div className="p-4">
        <div className="mb-1 text-[10px] font-bold uppercase tracking-widest text-[#c9a84c]">{product.category}</div>
        <h3 className="font-serif text-lg font-bold leading-tight text-white group-hover:text-[#c9a84c] transition-colors truncate">
          {product.name}
        </h3>
        <div className="mt-2 flex items-baseline gap-2">
          <span className="text-lg font-bold text-[#c9a84c]">TSh {product.price.toLocaleString()}</span>
          {product.old_price && (
            <span className="text-xs text-white/30 line-through">TSh {product.old_price.toLocaleString()}</span>
          )}
        </div>
        
        <button
          disabled={!product.in_stock}
          onClick={(e) => {
            e.preventDefault();
            addToCart(product);
          }}
          className="mt-4 w-full rounded-xl bg-white/10 py-2 text-sm font-bold text-white transition-all hover:bg-[#c9a84c] hover:text-black disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {product.in_stock ? 'Add to Cart' : 'Out of Stock'}
        </button>
      </div>
    </motion.div>
  );
};
