import React, { useState } from 'react';
import { collection, query, where, getDocs, orderBy, limit } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { Search, Package, Clock, CheckCircle2, Truck, Home, XCircle } from 'lucide-react';
import { cn } from '../lib/utils';
import { format } from 'date-fns';

export const TrackOrder = () => {
  const [queryVal, setQueryVal] = useState('');
  const [orders, setOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [searched, setSearched] = useState(false);

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!queryVal.trim()) return;
    
    setLoading(true);
    setSearched(true);
    try {
      // Search by order number or phone
      const q1 = query(collection(db, 'orders'), where('order_number', '==', queryVal.trim().toUpperCase()));
      const q2 = query(collection(db, 'orders'), where('customer_phone', '==', queryVal.trim()));
      
      const [snap1, snap2] = await Promise.all([getDocs(q1), getDocs(q2)]);
      
      const results = [
        ...snap1.docs.map(doc => ({ id: doc.id, ...doc.data() })),
        ...snap2.docs.map(doc => ({ id: doc.id, ...doc.data() }))
      ];
      
      // Deduplicate
      const unique = Array.from(new Map(results.map(item => [item.id, item])).values());
      setOrders(unique.sort((a: any, b: any) => b.created_at?.toMillis() - a.created_at?.toMillis()));
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'Inasubiri Uthibitisho': return <Clock className="text-amber-500" />;
      case 'Imelipwa': return <CheckCircle2 className="text-green-500" />;
      case 'Inashonwa': return <Package className="text-blue-500" />;
      case 'Imetumwa': return <Truck className="text-gold" />;
      case 'Imefikia': return <Home className="text-green-500" />;
      case 'Imefutwa': return <XCircle className="text-red-500" />;
      default: return <Package className="text-white/40" />;
    }
  };

  return (
    <div className="container mx-auto px-4 py-12">
      <div className="max-w-2xl mx-auto">
        <div className="text-center mb-12">
          <h1 className="font-serif text-4xl font-bold text-white mb-4">Track Your Order</h1>
          <p className="text-white/50">Enter your order ID or phone number to see the current status.</p>
        </div>

        <form onSubmit={handleSearch} className="relative mb-12">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-white/30" size={20} />
          <input
            value={queryVal}
            onChange={(e) => setQueryVal(e.target.value)}
            className="h-16 w-full rounded-2xl border border-white/10 bg-white/5 pl-12 pr-32 text-white outline-none focus:border-gold transition-all"
            placeholder="Order ID (e.g. AB1234) or Phone"
          />
          <button
            type="submit"
            disabled={loading}
            className="absolute right-2 top-2 bottom-2 px-6 rounded-xl bg-gold font-bold text-black transition-all hover:scale-105 disabled:opacity-50"
          >
            {loading ? 'Searching...' : 'Track'}
          </button>
        </form>

        <div className="space-y-6">
          {orders.map((order) => (
            <div key={order.id} className="rounded-3xl border border-white/10 bg-white/5 p-8 backdrop-blur-xl">
              <div className="flex flex-wrap items-start justify-between gap-4 mb-8">
                <div>
                  <span className="text-xs font-bold text-gold uppercase tracking-widest">Order #{order.order_number}</span>
                  <h2 className="text-xl font-bold text-white mt-1">{order.items?.[0]?.name || 'Kanzu Order'}</h2>
                  <p className="text-xs text-white/40 mt-1">
                    Placed on {order.created_at?.toDate ? format(order.created_at.toDate(), 'PPP') : 'N/A'}
                  </p>
                </div>
                <div className="flex items-center gap-2 rounded-full bg-white/5 px-4 py-2 border border-white/10">
                  {getStatusIcon(order.order_status)}
                  <span className="text-sm font-bold text-white">{order.order_status}</span>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 py-6 border-y border-white/5">
                <div>
                  <p className="text-[10px] font-bold text-white/30 uppercase mb-1">Customer</p>
                  <p className="text-sm text-white font-medium">{order.customer_name}</p>
                </div>
                <div>
                  <p className="text-[10px] font-bold text-white/30 uppercase mb-1">Delivery to</p>
                  <p className="text-sm text-white font-medium">{order.customer_address || 'N/A'}</p>
                </div>
                <div>
                  <p className="text-[10px] font-bold text-white/30 uppercase mb-1">Items</p>
                  <div className="text-sm text-white font-medium">
                    {order.items?.map((item: any, i: number) => (
                      <div key={i}>{item.name} ({item.size}) x{item.quantity}</div>
                    ))}
                  </div>
                </div>
                <div>
                  <p className="text-[10px] font-bold text-white/30 uppercase mb-1">Total Paid</p>
                  <p className="text-lg font-bold text-gold">TSh {order.total?.toLocaleString()}</p>
                </div>
              </div>

              <div className="mt-8">
                <button 
                  onClick={() => window.open(`https://wa.me/255764225358?text=Habari! Nataka kujua hali ya oda yangu #${order.order_number}`, '_blank')}
                  className="w-full h-12 rounded-xl bg-white/5 border border-white/10 font-bold text-white hover:bg-white/10 transition-all"
                >
                  Contact Support for Details
                </button>
              </div>
            </div>
          ))}

          {searched && !loading && orders.length === 0 && (
            <div className="text-center py-12">
              <p className="text-white/40">No orders found for "{queryVal}"</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
