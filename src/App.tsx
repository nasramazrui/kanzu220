import React, { createContext, useContext, useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Link, useLocation } from 'react-router-dom';
import { onAuthStateChanged, User } from 'firebase/auth';
import { doc, getDoc } from 'firebase/firestore';
import { auth, db } from './lib/firebase';
import { ShoppingCart, LayoutDashboard, Menu, X, Sun, Moon } from 'lucide-react';
import { cn } from './lib/utils';
import { motion, AnimatePresence } from 'framer-motion';

// --- Pages ---
import { StoreHome } from './pages/StoreHome';
import { ProductDetail } from './pages/ProductDetail';
import { Cart } from './pages/Cart';
import { Checkout } from './pages/Checkout';
import { TrackOrder } from './pages/TrackOrder';
import { Login } from './pages/Login';
import { Dashboard } from './pages/Dashboard';

// --- Types ---
export interface Product {
  id: string;
  name: string;
  price: number;
  old_price?: number;
  category: string;
  sizes?: string[];
  image_url: string;
  gallery_urls?: string[];
  description?: string;
  in_stock: boolean;
  featured?: boolean;
  stock_quantity?: number;
  loyalty_points_value?: number;
}

export interface CartItem extends Product {
  selectedSize?: string;
  quantity: number;
}

// --- Context ---
interface AppContextType {
  user: User | null;
  isAdmin: boolean;
  isStaff: boolean;
  cart: CartItem[];
  addToCart: (product: Product, size?: string) => void;
  removeFromCart: (productId: string, size?: string) => void;
  clearCart: () => void;
  isDark: boolean;
  toggleTheme: () => void;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

export const useApp = () => {
  const context = useContext(AppContext);
  if (!context) throw new Error('useApp must be used within AppProvider');
  return context;
};

// --- Components ---
const Navbar = () => {
  const { user, isAdmin, isStaff, cart, isDark, toggleTheme } = useApp();
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const location = useLocation();
  const isDashboard = location.pathname.startsWith('/dashboard');

  return (
    <header className="sticky top-0 z-50 w-full border-b border-white/10 bg-black/80 backdrop-blur-md">
      <div className="container mx-auto flex h-16 items-center justify-between px-4">
        <Link to="/" className="flex items-center gap-2">
          <span className="text-2xl">🕌</span>
          <span className="font-serif text-xl font-bold tracking-tight text-[#c9a84c]">Kanzu Palace</span>
        </Link>

        {/* Desktop Nav */}
        <nav className="hidden md:flex items-center gap-6">
          <Link to="/" className="text-sm font-medium text-white/70 hover:text-[#c9a84c] transition-colors">Store</Link>
          <Link to="/track" className="text-sm font-medium text-white/70 hover:text-[#c9a84c] transition-colors">Track Order</Link>
          {(isAdmin || isStaff) && (
            <Link to="/dashboard" className="flex items-center gap-1 text-sm font-medium text-[#c9a84c] hover:text-[#e8d5a3] transition-colors">
              <LayoutDashboard size={16} />
              Dashboard
            </Link>
          )}
        </nav>

        <div className="flex items-center gap-4">
          <button onClick={toggleTheme} className="p-2 text-white/70 hover:text-[#c9a84c] transition-colors">
            {isDark ? <Sun size={20} /> : <Moon size={20} />}
          </button>
          
          <Link to="/cart" className="relative p-2 text-white/70 hover:text-[#c9a84c] transition-colors">
            <ShoppingCart size={20} />
            {cart.length > 0 && (
              <span className="absolute -top-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full bg-[#c9a84c] text-[10px] font-bold text-black">
                {cart.reduce((acc, item) => acc + item.quantity, 0)}
              </span>
            )}
          </Link>

          {user ? (
            <Link to={isDashboard ? "/" : "/dashboard"} className="hidden md:flex h-8 w-8 items-center justify-center rounded-full bg-[#c9a84c] text-black font-bold">
              {user.email?.[0].toUpperCase()}
            </Link>
          ) : (
            <Link to="/login" className="hidden md:block text-sm font-medium text-white/70 hover:text-[#c9a84c] transition-colors">Login</Link>
          )}

          <button className="md:hidden p-2 text-white/70" onClick={() => setIsMenuOpen(!isMenuOpen)}>
            {isMenuOpen ? <X size={24} /> : <Menu size={24} />}
          </button>
        </div>
      </div>

      {/* Mobile Menu */}
      <AnimatePresence>
        {isMenuOpen && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="md:hidden border-t border-white/10 bg-black"
          >
            <div className="flex flex-col p-4 gap-4">
              <Link to="/" onClick={() => setIsMenuOpen(false)} className="text-lg font-medium text-white">Store</Link>
              <Link to="/track" onClick={() => setIsMenuOpen(false)} className="text-lg font-medium text-white">Track Order</Link>
              {(isAdmin || isStaff) && (
                <Link to="/dashboard" onClick={() => setIsMenuOpen(false)} className="text-lg font-medium text-[#c9a84c]">Dashboard</Link>
              )}
              {!user && <Link to="/login" onClick={() => setIsMenuOpen(false)} className="text-lg font-medium text-white">Login</Link>}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </header>
  );
};

export default function App() {
  const [user, setUser] = useState<User | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [isStaff, setIsStaff] = useState(false);
  const [cart, setCart] = useState<CartItem[]>([]);
  const [isDark, setIsDark] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      setUser(user);
      if (user) {
        const staffDoc = await getDoc(doc(db, 'staff', user.uid));
        if (staffDoc.exists()) {
          const data = staffDoc.data();
          setIsStaff(true);
          setIsAdmin(data.role === 'admin');
        } else {
          // Check if user is admin by email (as per requirements)
          if (user.email === 'amytzee@gmail.com') {
            setIsAdmin(true);
            setIsStaff(true);
          } else {
            setIsAdmin(false);
            setIsStaff(false);
          }
        }
      } else {
        setIsAdmin(false);
        setIsStaff(false);
      }
    });
    return () => unsubscribe();
  }, []);

  const addToCart = (product: Product, size?: string) => {
    setCart(prev => {
      const existing = prev.find(item => item.id === product.id && item.selectedSize === size);
      if (existing) {
        return prev.map(item => 
          (item.id === product.id && item.selectedSize === size) 
            ? { ...item, quantity: item.quantity + 1 } 
            : item
        );
      }
      return [...prev, { ...product, selectedSize: size, quantity: 1 }];
    });
  };

  const removeFromCart = (productId: string, size?: string) => {
    setCart(prev => prev.filter(item => !(item.id === productId && item.selectedSize === size)));
  };

  const clearCart = () => setCart([]);

  const toggleTheme = () => setIsDark(!isDark);

  return (
    <AppContext.Provider value={{ user, isAdmin, isStaff, cart, addToCart, removeFromCart, clearCart, isDark, toggleTheme }}>
      <div className={cn("min-h-screen transition-colors duration-300", isDark ? "bg-[#0a0a0a] text-[#f0ead8]" : "bg-[#f8f6f0] text-[#1a1208]")}>
        <Router>
          <Navbar />
          <main className="pb-20">
            <Routes>
              <Route path="/" element={<StoreHome />} />
              <Route path="/product/:id" element={<ProductDetail />} />
              <Route path="/cart" element={<Cart />} />
              <Route path="/checkout" element={<Checkout />} />
              <Route path="/track" element={<TrackOrder />} />
              <Route path="/login" element={<Login />} />
              <Route path="/dashboard/*" element={<Dashboard />} />
              <Route path="*" element={<div className="flex h-[60vh] items-center justify-center">Page Not Found</div>} />
            </Routes>
          </main>
        </Router>
      </div>
    </AppContext.Provider>
  );
}
