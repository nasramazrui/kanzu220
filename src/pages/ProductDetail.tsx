import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { doc, getDoc, collection, query, where, limit, getDocs } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { useApp, Product } from '../App';
import { motion } from 'framer-motion';
import { ChevronLeft, ChevronRight, ShoppingCart, Ruler, Truck, RotateCcw, ShieldCheck, MapPin } from 'lucide-react';
import { cn, getDirectImageUrl } from '../lib/utils';
import { getNearbyKanzuShops } from '../services/geminiService';
import ReactMarkdown from 'react-markdown';

import { QRCodeSVG } from 'qrcode.react';

export const ProductDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { addToCart } = useApp();
  const [product, setProduct] = useState<Product | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedSize, setSelectedSize] = useState<string>('');
  const [activeImageIdx, setActiveImageIdx] = useState(0);
  const [nearbyShops, setNearbyShops] = useState<any>(null);
  const [searchingShops, setSearchingShops] = useState(false);

  // Get the current URL for the QR code
  const productUrl = window.location.href;

  useEffect(() => {
    const fetchProduct = async () => {
      if (!id) return;
      const docRef = doc(db, 'products', id);
      const docSnap = await getDoc(docRef);
      if (docSnap.exists()) {
        setProduct({ id: docSnap.id, ...docSnap.data() } as Product);
      }
      setLoading(false);
    };
    fetchProduct();
  }, [id]);

  const images = product ? [product.image_url, ...(product.gallery_urls || [])] : [];

  const handleFindNearby = async () => {
    setSearchingShops(true);
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(async (position) => {
        const result = await getNearbyKanzuShops(position.coords.latitude, position.coords.longitude);
        setNearbyShops(result);
        setSearchingShops(false);
      }, () => {
        alert("Geolocation is not supported or permission denied.");
        setSearchingShops(false);
      });
    }
  };

  if (loading) return <div className="flex h-[60vh] items-center justify-center"><div className="h-12 w-12 animate-spin rounded-full border-4 border-gold border-t-transparent"></div></div>;
  if (!product) return <div className="flex h-[60vh] items-center justify-center text-white/60">Product not found.</div>;

  return (
    <div className="container mx-auto px-4 py-8">
      <button onClick={() => navigate(-1)} className="mb-6 flex items-center gap-2 text-sm font-medium text-white/50 hover:text-gold transition-colors">
        <ChevronLeft size={16} /> Back to Store
      </button>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
        {/* Gallery */}
        <div className="space-y-4">
          <div className="relative aspect-[3/4] overflow-hidden rounded-3xl bg-white/5">
            <img
              src={getDirectImageUrl(images[activeImageIdx])}
              alt={product.name}
              className="h-full w-full object-cover"
              referrerPolicy="no-referrer"
              onError={(e) => {
                (e.target as HTMLImageElement).src = 'https://picsum.photos/seed/product/800/1200';
              }}
            />
            {images.length > 1 && (
              <>
                <button
                  onClick={() => setActiveImageIdx((prev) => (prev - 1 + images.length) % images.length)}
                  className="absolute left-4 top-1/2 -translate-y-1/2 rounded-full bg-black/50 p-2 text-white/70 backdrop-blur-md hover:bg-gold hover:text-black transition-all"
                >
                  <ChevronLeft size={24} />
                </button>
                <button
                  onClick={() => setActiveImageIdx((prev) => (prev + 1) % images.length)}
                  className="absolute right-4 top-1/2 -translate-y-1/2 rounded-full bg-black/50 p-2 text-white/70 backdrop-blur-md hover:bg-gold hover:text-black transition-all"
                >
                  <ChevronRight size={24} />
                </button>
              </>
            )}
          </div>
          
          <div className="flex gap-4 overflow-x-auto pb-2 scrollbar-hide">
            {images.map((img, idx) => (
              <button
                key={idx}
                onClick={() => setActiveImageIdx(idx)}
                className={cn(
                  "relative h-20 w-20 flex-shrink-0 overflow-hidden rounded-xl border-2 transition-all",
                  activeImageIdx === idx ? "border-gold" : "border-transparent opacity-50 hover:opacity-100"
                )}
              >
                <img 
                  src={getDirectImageUrl(img)} 
                  alt="" 
                  className="h-full w-full object-cover" 
                  referrerPolicy="no-referrer"
                  onError={(e) => {
                    (e.target as HTMLImageElement).src = 'https://picsum.photos/seed/thumbnail/200/200';
                  }}
                />
              </button>
            ))}
          </div>
        </div>

        {/* Info */}
        <div className="flex flex-col gap-6">
          <div>
            <span className="text-xs font-bold uppercase tracking-widest text-gold">{product.category}</span>
            <h1 className="mt-2 font-serif text-4xl font-bold text-white">{product.name}</h1>
            <div className="mt-4 flex items-baseline gap-3">
              <span className="text-3xl font-bold text-gold">TSh {product.price.toLocaleString()}</span>
              {product.old_price && (
                <span className="text-lg text-white/30 line-through">TSh {product.old_price.toLocaleString()}</span>
              )}
            </div>
          </div>

          <p className="text-white/70 leading-relaxed">{product.description || "Bidhaa ya ubora wa juu kutoka Kanzu Palace."}</p>

          {product.sizes && product.sizes.length > 0 && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-sm font-bold text-white/60 uppercase tracking-wider">Select Size</span>
                <button className="flex items-center gap-1 text-xs text-gold hover:underline">
                  <Ruler size={14} /> Size Guide
                </button>
              </div>
              <div className="flex flex-wrap gap-3">
                {product.sizes.map((size) => (
                  <button
                    key={size}
                    onClick={() => setSelectedSize(size)}
                    className={cn(
                      "h-12 min-w-[3rem] rounded-xl border-2 font-bold transition-all",
                      selectedSize === size
                        ? "border-gold bg-gold text-black"
                        : "border-white/10 text-white/60 hover:border-gold/50 hover:text-gold"
                    )}
                  >
                    {size}
                  </button>
                ))}
              </div>
            </div>
          )}

          <div className="flex flex-col gap-3 pt-4">
            <button
              disabled={!product.in_stock || (product.sizes && product.sizes.length > 0 && !selectedSize)}
              onClick={() => addToCart(product, selectedSize)}
              className="flex h-14 items-center justify-center gap-3 rounded-2xl bg-gold font-bold text-black transition-all hover:scale-[1.02] active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <ShoppingCart size={20} />
              {product.in_stock ? 'Add to Cart' : 'Out of Stock'}
            </button>
          </div>

          <div className="grid grid-cols-3 gap-4 py-6 border-y border-white/5">
            <div className="flex flex-col items-center gap-2 text-center">
              <Truck size={20} className="text-gold" />
              <span className="text-[10px] font-bold text-white/40 uppercase tracking-tighter">Fast Delivery</span>
            </div>
            <div className="flex flex-col items-center gap-2 text-center">
              <RotateCcw size={20} className="text-gold" />
              <span className="text-[10px] font-bold text-white/40 uppercase tracking-tighter">7 Day Returns</span>
            </div>
            <div className="flex flex-col items-center gap-2 text-center">
              <ShieldCheck size={20} className="text-gold" />
              <span className="text-[10px] font-bold text-white/40 uppercase tracking-tighter">Secure Payment</span>
            </div>
          </div>

          {/* Nearby Shops Feature */}
          <div className="rounded-2xl bg-white/5 p-6 border border-white/10">
            <h3 className="flex items-center gap-2 font-bold text-white mb-2">
              <MapPin size={18} className="text-gold" />
              Find Nearby Kanzu Shops
            </h3>
            <p className="text-xs text-white/50 mb-4">
              Want to see it in person? Find other traditional clothing shops near you using Google Maps data.
            </p>
            <button
              onClick={handleFindNearby}
              disabled={searchingShops}
              className="w-full rounded-xl bg-white/10 py-2 text-xs font-bold text-white hover:bg-white/20 transition-all disabled:opacity-50"
            >
              {searchingShops ? 'Searching...' : 'Search Nearby'}
            </button>

            {nearbyShops && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="mt-4 space-y-4"
              >
                <div className="prose prose-invert prose-sm max-w-none">
                  <ReactMarkdown>{nearbyShops.text}</ReactMarkdown>
                </div>
                {nearbyShops.sources.length > 0 && (
                  <div className="pt-2 border-t border-white/10">
                    <span className="text-[10px] font-bold text-white/30 uppercase block mb-2">Sources:</span>
                    <div className="flex flex-wrap gap-2">
                      {nearbyShops.sources.map((chunk: any, i: number) => (
                        chunk.maps && (
                          <a
                            key={i}
                            href={chunk.maps.uri}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-[10px] text-gold hover:underline"
                          >
                            {chunk.maps.title || "View on Maps"}
                          </a>
                        )
                      ))}
                    </div>
                  </div>
                )}
              </motion.div>
            )}
          </div>
          {/* QR Code Section */}
          <div className="rounded-2xl bg-white/5 p-6 border border-white/10 flex flex-col items-center text-center">
            <h3 className="font-bold text-white mb-2">Scan to View on Mobile</h3>
            <p className="text-xs text-white/50 mb-4">Scan this QR code to view this Kanzu on your phone or share it with others.</p>
            <div className="p-3 bg-white rounded-xl shadow-xl">
              <QRCodeSVG 
                value={productUrl} 
                size={120}
                level="H"
                includeMargin={false}
                imageSettings={{
                  src: "https://picsum.photos/seed/kanzu-logo/30/30",
                  x: undefined,
                  y: undefined,
                  height: 24,
                  width: 24,
                  excavate: true,
                }}
              />
            </div>
            <p className="mt-4 text-[10px] font-bold text-gold uppercase tracking-widest">Kanzu Palace Mobile</p>
          </div>
        </div>
      </div>
    </div>
  );
};
