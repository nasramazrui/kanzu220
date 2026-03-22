import React, { useState } from 'react';
import { useApp } from '../App';
import { Trash2, Plus, Minus, ArrowRight, ShoppingBag } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import { getDirectImageUrl } from '../lib/utils';

export const Cart = () => {
  const { cart, addToCart, removeFromCart, clearCart } = useApp();
  const navigate = useNavigate();

  const subtotal = cart.reduce((acc, item) => acc + item.price * item.quantity, 0);

  if (cart.length === 0) {
    return (
      <div className="container mx-auto px-4 py-20 text-center">
        <div className="mb-6 flex justify-center">
          <div className="rounded-full bg-white/5 p-8">
            <ShoppingBag size={64} className="text-white/20" />
          </div>
        </div>
        <h2 className="text-2xl font-bold text-white mb-2">Your cart is empty</h2>
        <p className="text-white/50 mb-8">Looks like you haven't added anything to your cart yet.</p>
        <Link to="/" className="inline-flex h-12 items-center justify-center rounded-xl bg-gold px-8 font-bold text-black transition-all hover:scale-105">
          Start Shopping
        </Link>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="font-serif text-3xl font-bold text-white mb-8">Shopping Cart</h1>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 space-y-4">
          {cart.map((item) => (
            <div key={`${item.id}-${item.selectedSize}`} className="flex gap-4 rounded-2xl border border-white/5 bg-white/5 p-4">
              <div className="h-24 w-20 flex-shrink-0 overflow-hidden rounded-xl bg-black">
                <img 
                  src={getDirectImageUrl(item.image_url)} 
                  alt={item.name} 
                  className="h-full w-full object-cover" 
                  referrerPolicy="no-referrer"
                  onError={(e) => {
                    (e.target as HTMLImageElement).src = 'https://picsum.photos/seed/cart/200/200';
                  }}
                />
              </div>
              
              <div className="flex flex-1 flex-col justify-between">
                <div>
                  <div className="flex items-start justify-between">
                    <h3 className="font-bold text-white">{item.name}</h3>
                    <button 
                      onClick={() => removeFromCart(item.id, item.selectedSize)}
                      className="text-white/30 hover:text-red-500 transition-colors"
                    >
                      <Trash2 size={18} />
                    </button>
                  </div>
                  {item.selectedSize && (
                    <span className="text-xs font-bold text-gold uppercase">Size: {item.selectedSize}</span>
                  )}
                </div>

                <div className="flex items-center justify-between mt-2">
                  <div className="flex items-center gap-3 rounded-lg bg-black/40 p-1">
                    <button 
                      onClick={() => removeFromCart(item.id, item.selectedSize)}
                      className="p-1 text-white/50 hover:text-white transition-colors"
                    >
                      <Minus size={14} />
                    </button>
                    <span className="text-sm font-bold text-white min-w-[1.5rem] text-center">{item.quantity}</span>
                    <button 
                      onClick={() => addToCart(item, item.selectedSize)}
                      className="p-1 text-white/50 hover:text-white transition-colors"
                    >
                      <Plus size={14} />
                    </button>
                  </div>
                  <span className="font-bold text-gold">TSh {(item.price * item.quantity).toLocaleString()}</span>
                </div>
              </div>
            </div>
          ))}
          
          <button 
            onClick={clearCart}
            className="text-sm font-medium text-white/30 hover:text-white transition-colors"
          >
            Clear Cart
          </button>
        </div>

        <div className="space-y-6">
          <div className="rounded-2xl border border-white/10 bg-white/5 p-6">
            <h2 className="text-xl font-bold text-white mb-6">Order Summary</h2>
            
            <div className="space-y-4">
              <div className="flex justify-between text-white/60">
                <span>Subtotal</span>
                <span>TSh {subtotal.toLocaleString()}</span>
              </div>
              <div className="flex justify-between text-white/60">
                <span>Shipping</span>
                <span className="text-gold font-medium">Calculated at checkout</span>
              </div>
              <div className="pt-4 border-t border-white/10 flex justify-between text-xl font-bold text-white">
                <span>Total</span>
                <span className="text-gold">TSh {subtotal.toLocaleString()}</span>
              </div>
            </div>

            <button 
              onClick={() => navigate('/checkout')}
              className="mt-8 flex w-full h-14 items-center justify-center gap-3 rounded-2xl bg-gold font-bold text-black transition-all hover:scale-[1.02] active:scale-[0.98]"
            >
              Checkout
              <ArrowRight size={20} />
            </button>
          </div>
          
          <div className="rounded-2xl border border-white/5 bg-white/5 p-6 text-center">
            <p className="text-xs text-white/40 leading-relaxed">
              By proceeding to checkout, you agree to our terms of service and privacy policy.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
