import React, { useState, useEffect } from 'react';
import { useApp } from '../App';
import { useNavigate } from 'react-router-dom';
import { collection, addDoc, serverTimestamp, doc, updateDoc, increment } from 'firebase/firestore';
import { Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { db } from '../lib/firebase';
import { CreditCard, Phone, User, MapPin, Gift, CheckCircle2, ChevronRight } from 'lucide-react';
import { cn } from '../lib/utils';

export const Checkout = () => {
  const { cart, clearCart } = useApp();
  const navigate = useNavigate();
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);

  const [formData, setFormData] = useState({
    name: '',
    phone: '',
    address: '',
    paymentMethod: '',
    paymentPhone: '',
    transactionId: '',
    promoCode: ''
  });

  const subtotal = cart.reduce((acc, item) => acc + item.price * item.quantity, 0);
  const shipping = 5000; // Default shipping
  const total = subtotal + shipping;

  useEffect(() => {
    if (cart.length === 0 && step < 4) {
      navigate('/');
    }
  }, [cart, navigate, step]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    setFormData({ ...formData, [e.target.id]: e.target.value });
  };

  const handleSubmit = async () => {
    setLoading(true);
    try {
      const orderNumber = Math.random().toString(36).substring(2, 10).toUpperCase();
      const orderData = {
        order_number: orderNumber,
        customer_name: formData.name,
        customer_phone: formData.phone,
        customer_address: formData.address,
        items: cart.map(item => ({
          id: item.id,
          name: item.name,
          price: item.price,
          quantity: item.quantity,
          size: item.selectedSize || 'N/A'
        })),
        total: total,
        delivery_fee: shipping,
        payment_method: formData.paymentMethod,
        payment_phone: formData.paymentPhone,
        transaction_id: formData.transactionId,
        order_status: 'Inasubiri Uthibitisho',
        created_at: serverTimestamp()
      };

      await addDoc(collection(db, 'orders'), orderData);
      
      // Update stock (simplified)
      for (const item of cart) {
        const prodRef = doc(db, 'products', item.id);
        // In a real app, you'd decrement stock count
      }

      // WhatsApp Message
      const message = encodeURIComponent(
        `🧾 *ODA MPYA — Kanzu Palace*\n\n` +
        `👤 Mteja: ${formData.name}\n` +
        `📱 Simu: ${formData.phone}\n` +
        `📍 Anwani: ${formData.address}\n\n` +
        `👘 Bidhaa:\n${cart.map(i => `- ${i.name} (${i.selectedSize || 'N/A'}) x${i.quantity}`).join('\n')}\n\n` +
        `💰 Jumla: TSh ${total.toLocaleString()}\n` +
        `💳 Njia: ${formData.paymentMethod}\n` +
        `🔖 TxID: ${formData.transactionId}\n\n` +
        `🆔 Order ID: ${orderNumber}\n\n` +
        `Tafadhali thibitisha oda hii.`
      );
      
      window.open(`https://wa.me/255764225358?text=${message}`, '_blank');
      
      setStep(4);
      clearCart();
    } catch (err) {
      console.error(err);
      alert('Failed to place order. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  if (step === 4) {
    return (
      <div className="container mx-auto px-4 py-20 text-center">
        <div className="mb-6 flex justify-center">
          <div className="rounded-full bg-green-500/10 p-8">
            <CheckCircle2 size={64} className="text-green-500" />
          </div>
        </div>
        <h2 className="text-3xl font-bold text-white mb-2">Order Placed Successfully!</h2>
        <p className="text-white/50 mb-8 max-w-md mx-auto">
          Your order has been received. We've opened WhatsApp to send your order details to our team.
        </p>
        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <Link to="/" className="h-12 inline-flex items-center justify-center rounded-xl bg-gold px-8 font-bold text-black transition-all hover:scale-105">
            Back to Store
          </Link>
          <Link to="/track" className="h-12 inline-flex items-center justify-center rounded-xl border border-white/10 px-8 font-bold text-white transition-all hover:bg-white/5">
            Track Order
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="max-w-4xl mx-auto">
        <div className="mb-8 flex items-center justify-between">
          <h1 className="font-serif text-3xl font-bold text-white">Checkout</h1>
          <div className="flex items-center gap-2">
            {[1, 2, 3].map((s) => (
              <div
                key={s}
                className={cn(
                  "h-2 w-8 rounded-full transition-all",
                  step >= s ? "bg-gold" : "bg-white/10"
                )}
              />
            ))}
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2 space-y-6">
            {/* Step 1: Payment Method */}
            {step === 1 && (
              <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} className="space-y-6">
                <div className="rounded-2xl border border-white/10 bg-white/5 p-6">
                  <h2 className="flex items-center gap-2 text-xl font-bold text-white mb-6">
                    <CreditCard size={20} className="text-gold" />
                    1. Choose Payment Method
                  </h2>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    {['M-Pesa', 'Airtel Money', 'Tigo Pesa'].map((method) => (
                      <button
                        key={method}
                        onClick={() => setFormData({ ...formData, paymentMethod: method })}
                        className={cn(
                          "flex flex-col items-center gap-3 rounded-2xl border-2 p-6 transition-all",
                          formData.paymentMethod === method
                            ? "border-gold bg-gold/10 text-gold"
                            : "border-white/5 bg-black/40 text-white/50 hover:border-white/20"
                        )}
                      >
                        <div className="h-12 w-12 rounded-full bg-white/5 flex items-center justify-center text-xl">
                          {method[0]}
                        </div>
                        <span className="font-bold text-sm">{method}</span>
                      </button>
                    ))}
                  </div>
                  
                  {formData.paymentMethod && (
                    <div className="mt-6 rounded-xl bg-black/60 p-4 border border-gold/20">
                      <p className="text-xs text-white/50 uppercase font-bold mb-2">Instructions</p>
                      <p className="text-sm text-white/80">
                        Send <span className="text-gold font-bold">TSh {total.toLocaleString()}</span> to:
                        <br />
                        <span className="text-lg font-bold text-white">0764 225 358</span>
                        <br />
                        Name: <span className="font-bold text-white">KANZU PALACE</span>
                      </p>
                    </div>
                  )}
                </div>
                <button
                  disabled={!formData.paymentMethod}
                  onClick={() => setStep(2)}
                  className="flex w-full h-14 items-center justify-center gap-3 rounded-2xl bg-gold font-bold text-black transition-all hover:scale-[1.02] disabled:opacity-50"
                >
                  Continue to Details
                  <ChevronRight size={20} />
                </button>
              </motion.div>
            )}

            {/* Step 2: Customer Info */}
            {step === 2 && (
              <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} className="space-y-6">
                <div className="rounded-2xl border border-white/10 bg-white/5 p-6">
                  <h2 className="flex items-center gap-2 text-xl font-bold text-white mb-6">
                    <User size={20} className="text-gold" />
                    2. Your Information
                  </h2>
                  <div className="space-y-4">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <label className="text-xs font-bold text-white/40 uppercase">Full Name</label>
                        <input id="name" value={formData.name} onChange={handleInputChange} className="h-12 w-full rounded-xl border border-white/10 bg-black/40 px-4 text-white outline-none focus:border-gold" placeholder="Juma Hassan" />
                      </div>
                      <div className="space-y-2">
                        <label className="text-xs font-bold text-white/40 uppercase">Phone / WhatsApp</label>
                        <input id="phone" value={formData.phone} onChange={handleInputChange} className="h-12 w-full rounded-xl border border-white/10 bg-black/40 px-4 text-white outline-none focus:border-gold" placeholder="07XX XXX XXX" />
                      </div>
                    </div>
                    <div className="space-y-2">
                      <label className="text-xs font-bold text-white/40 uppercase">Delivery Address</label>
                      <input id="address" value={formData.address} onChange={handleInputChange} className="h-12 w-full rounded-xl border border-white/10 bg-black/40 px-4 text-white outline-none focus:border-gold" placeholder="Kariakoo, Dar es Salaam" />
                    </div>
                  </div>
                </div>
                <div className="flex gap-4">
                  <button onClick={() => setStep(1)} className="h-14 flex-1 rounded-2xl border border-white/10 font-bold text-white hover:bg-white/5 transition-all">Back</button>
                  <button disabled={!formData.name || !formData.phone} onClick={() => setStep(3)} className="h-14 flex-[2] rounded-2xl bg-gold font-bold text-black hover:scale-[1.02] transition-all disabled:opacity-50">Continue to Payment</button>
                </div>
              </motion.div>
            )}

            {/* Step 3: Payment Confirmation */}
            {step === 3 && (
              <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} className="space-y-6">
                <div className="rounded-2xl border border-white/10 bg-white/5 p-6">
                  <h2 className="flex items-center gap-2 text-xl font-bold text-white mb-6">
                    <CheckCircle2 size={20} className="text-gold" />
                    3. Confirm Payment
                  </h2>
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <label className="text-xs font-bold text-white/40 uppercase">Payment Phone Number</label>
                      <input id="paymentPhone" value={formData.paymentPhone} onChange={handleInputChange} className="h-12 w-full rounded-xl border border-white/10 bg-black/40 px-4 text-white outline-none focus:border-gold" placeholder="Number you paid from" />
                    </div>
                    <div className="space-y-2">
                      <label className="text-xs font-bold text-white/40 uppercase">Transaction ID (TxID)</label>
                      <input id="transactionId" value={formData.transactionId} onChange={handleInputChange} className="h-12 w-full rounded-xl border border-white/10 bg-black/40 px-4 text-white outline-none focus:border-gold" placeholder="MPX12345678" />
                    </div>
                  </div>
                </div>
                <div className="flex gap-4">
                  <button onClick={() => setStep(2)} className="h-14 flex-1 rounded-2xl border border-white/10 font-bold text-white hover:bg-white/5 transition-all">Back</button>
                  <button disabled={!formData.transactionId || loading} onClick={handleSubmit} className="h-14 flex-[2] rounded-2xl bg-gold font-bold text-black hover:scale-[1.02] transition-all disabled:opacity-50">
                    {loading ? 'Processing...' : 'Place Order'}
                  </button>
                </div>
              </motion.div>
            )}
          </div>

          <div className="space-y-6">
            <div className="rounded-2xl border border-white/10 bg-white/5 p-6">
              <h2 className="text-lg font-bold text-white mb-4">Order Summary</h2>
              <div className="space-y-3 mb-6">
                {cart.map(item => (
                  <div key={`${item.id}-${item.selectedSize}`} className="flex justify-between text-sm">
                    <span className="text-white/60">{item.name} x{item.quantity}</span>
                    <span className="text-white font-medium">TSh {(item.price * item.quantity).toLocaleString()}</span>
                  </div>
                ))}
              </div>
              <div className="space-y-3 pt-4 border-t border-white/10">
                <div className="flex justify-between text-sm text-white/60">
                  <span>Subtotal</span>
                  <span>TSh {subtotal.toLocaleString()}</span>
                </div>
                <div className="flex justify-between text-sm text-white/60">
                  <span>Shipping</span>
                  <span>TSh {shipping.toLocaleString()}</span>
                </div>
                <div className="flex justify-between text-lg font-bold text-white pt-2">
                  <span>Total</span>
                  <span className="text-gold">TSh {total.toLocaleString()}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
