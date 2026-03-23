import React, { useState, useEffect } from 'react';
import { Routes, Route, Link, useLocation, useNavigate } from 'react-router-dom';
import { useApp } from '../App';
import { 
  LayoutDashboard, 
  Package, 
  ShoppingBag, 
  Users, 
  Scissors, 
  UserCircle, 
  Settings, 
  LogOut,
  TrendingUp,
  Clock,
  CheckCircle2,
  AlertCircle,
  CreditCard,
  Image,
  Gift,
  MessageSquare,
  Truck,
  FileText,
  FileDown,
  Smartphone,
  Store,
  Wallet,
  UserPlus,
  BarChart3,
  History,
  Eye,
  ExternalLink,
  Plus,
  Search,
  Filter,
  MoreVertical,
  Trash2,
  Edit,
  Check,
  X,
  ChevronRight,
  Send,
  Download,
  EyeOff,
  User,
  Mail,
  Phone,
  Calendar
} from 'lucide-react';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import { QRCodeSVG } from 'qrcode.react';
import { Printer, Share2, Copy } from 'lucide-react';
import { cn, getDirectImageUrl } from '../lib/utils';
import { collection, query, orderBy, onSnapshot, getDocs, getDoc, where, addDoc, updateDoc, doc, serverTimestamp, deleteDoc, setDoc, Timestamp } from 'firebase/firestore';
import { db, auth } from '../lib/firebase';
import { handleFirestoreError, OperationType } from '../lib/firestore-errors';
import { signOut } from 'firebase/auth';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line } from 'recharts';
import { motion, AnimatePresence } from 'framer-motion';
import { Product } from '../App';

// --- Sub-components ---
const OrdersManagement = () => {
  const [orders, setOrders] = useState<any[]>([]);
  const [staff, setStaff] = useState<any[]>([]);
  const [filter, setFilter] = useState('');

  useEffect(() => {
    const q = query(collection(db, 'orders'), orderBy('created_at', 'desc'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      setOrders(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, 'orders');
    });

    const unsubStaff = onSnapshot(query(collection(db, 'staff'), where('role', '==', 'tailor')), (snapshot) => {
      setStaff(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    });

    return () => { unsubscribe(); unsubStaff(); };
  }, []);

  const updateStatus = async (id: string, status: string) => {
    const order = orders.find(o => o.id === id);
    if (!order) return;

    if (status === 'Imelipwa' && order.order_status !== 'Imelipwa') {
      if (order.items) {
        for (const item of order.items) {
          const productRef = doc(db, 'products', item.id);
          const productSnap = await getDoc(productRef);
          if (productSnap.exists()) {
            const currentStock = productSnap.data().stock_quantity || 0;
            await updateDoc(productRef, { 
              stock_quantity: Math.max(0, currentStock - (item.quantity || 1)),
              in_stock: (currentStock - (item.quantity || 1)) > 0
            });
          }
        }
      }

      if (order.customer_id) {
        const customerRef = doc(db, 'customers', order.customer_id);
        const customerSnap = await getDoc(customerRef);
        if (customerSnap.exists()) {
          const currentPoints = customerSnap.data().loyalty_points || 0;
          const pointsToAward = order.items?.reduce((acc: number, item: any) => acc + (item.loyalty_points_value || 10) * (item.quantity || 1), 0) || 0;
          await updateDoc(customerRef, { 
            loyalty_points: currentPoints + pointsToAward,
            total_spent: (customerSnap.data().total_spent || 0) + (order.total || 0),
            order_count: (customerSnap.data().order_count || 0) + 1
          });
        }
      }
    }

    await updateDoc(doc(db, 'orders', id), { order_status: status });
  };

  const assignTailor = async (orderId: string, tailorId: string) => {
    const tailor = staff.find(s => s.id === tailorId);
    if (!tailor) return;
    await updateDoc(doc(db, 'orders', orderId), {
      assigned_tailor_id: tailorId,
      assigned_tailor_name: tailor.jina,
      order_status: 'Inashonwa'
    });
  };

  const updateDeadline = async (orderId: string, date: string) => {
    await updateDoc(doc(db, 'orders', orderId), {
      deadline: Timestamp.fromDate(new Date(date))
    });
  };

  const sendWhatsApp = (order: any) => {
    const message = `Habari ${order.customer_name}! 🕌\n\nOda yako #${order.order_number} ya Kanzu Palace imepokelewa na sasa hivi ni: *${order.order_status}*.\n\nJumla: TSh ${order.total?.toLocaleString()}\n\nAsante kwa kuchagua Kanzu Palace! 🌙`;
    const phone = order.customer_phone?.replace(/\D/g, '');
    window.open(`https://wa.me/${phone}?text=${encodeURIComponent(message)}`, '_blank');
  };

  const filteredOrders = orders.filter(o => 
    o.customer_name?.toLowerCase().includes(filter.toLowerCase()) ||
    o.order_number?.toLowerCase().includes(filter.toLowerCase())
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h3 className="text-xl font-bold text-white">Orders ({orders.length})</h3>
        <input 
          placeholder="Search orders..." 
          value={filter}
          onChange={e => setFilter(e.target.value)}
          className="h-10 w-64 rounded-xl border border-white/10 bg-white/5 px-4 text-sm text-white outline-none focus:border-gold"
        />
      </div>

      <div className="rounded-3xl border border-white/10 bg-white/5 overflow-hidden">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-white/5 text-[10px] font-bold uppercase tracking-widest text-white/40">
              <th className="px-6 py-4">Order #</th>
              <th className="px-6 py-4">Customer</th>
              <th className="px-6 py-4">Tailor & Deadline</th>
              <th className="px-6 py-4">Total</th>
              <th className="px-6 py-4">Status</th>
              <th className="px-6 py-4 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-white/5">
            {filteredOrders.map((o) => (
              <tr key={o.id} className="hover:bg-white/5 transition-colors group">
                <td className="px-6 py-4 font-mono text-xs text-gold">{o.order_number}</td>
                <td className="px-6 py-4">
                  <p className="text-sm font-bold text-white">{o.customer_name}</p>
                  <p className="text-xs text-white/40">{o.customer_phone}</p>
                </td>
                <td className="px-6 py-4">
                  <div className="space-y-2">
                    <select 
                      value={o.assigned_tailor_id || ''}
                      onChange={(e) => assignTailor(o.id, e.target.value)}
                      className="bg-black border border-white/10 rounded-lg text-[10px] p-1 text-white outline-none w-full"
                    >
                      <option value="">Assign Tailor</option>
                      {staff.map(s => <option key={s.id} value={s.id}>{s.jina}</option>)}
                    </select>
                    <input 
                      type="date"
                      defaultValue={o.deadline?.toDate().toISOString().split('T')[0]}
                      onChange={(e) => updateDeadline(o.id, e.target.value)}
                      className="bg-black border border-white/10 rounded-lg text-[10px] p-1 text-white outline-none w-full"
                    />
                  </div>
                </td>
                <td className="px-6 py-4 text-sm font-bold text-white">TSh {o.total?.toLocaleString()}</td>
                <td className="px-6 py-4">
                  <span className={cn(
                    "inline-flex items-center rounded-full px-2 py-1 text-[10px] font-bold uppercase",
                    o.order_status === 'Imelipwa' ? "bg-green-500/10 text-green-500" : "bg-amber-500/10 text-amber-500"
                  )}>
                    {o.order_status}
                  </span>
                </td>
                <td className="px-6 py-4 text-right">
                  <div className="flex items-center justify-end gap-2">
                    <button 
                      onClick={() => sendWhatsApp(o)}
                      className="p-2 rounded-lg bg-green-500/10 text-green-500 hover:bg-green-500 hover:text-white transition-all"
                      title="Send WhatsApp"
                    >
                      <MessageSquare size={14} />
                    </button>
                    <select 
                      value={o.order_status}
                      onChange={(e) => updateStatus(o.id, e.target.value)}
                      className="bg-black border border-white/10 rounded-lg text-xs p-1 text-white outline-none"
                    >
                      <option>Inasubiri Uthibitisho</option>
                      <option>Imelipwa</option>
                      <option>Inashonwa</option>
                      <option>Imetumwa</option>
                      <option>Imefikia</option>
                      <option>Imefutwa</option>
                    </select>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

const SuppliersManagement = () => {
  const [suppliers, setSuppliers] = useState<any[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [formData, setFormData] = useState({ name: '', contact_person: '', phone: '', email: '', category: 'Fabrics', address: '', notes: '' });

  useEffect(() => {
    const q = query(collection(db, 'suppliers'), orderBy('created_at', 'desc'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      setSuppliers(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, 'suppliers');
    });
    return () => unsubscribe();
  }, []);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await addDoc(collection(db, 'suppliers'), { ...formData, created_at: serverTimestamp() });
      setIsModalOpen(false);
      setFormData({ name: '', contact_person: '', phone: '', email: '', category: 'Fabrics', address: '', notes: '' });
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, 'suppliers');
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h3 className="text-xl font-bold text-white">Suppliers ({suppliers.length})</h3>
        <button onClick={() => setIsModalOpen(true)} className="flex items-center gap-2 rounded-xl bg-gold px-4 py-2 text-sm font-bold text-black hover:scale-105 transition-all">
          <Plus size={18} /> Add Supplier
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {suppliers.map((s) => (
          <div key={s.id} className="rounded-2xl border border-white/10 bg-white/5 p-6">
            <div className="flex items-center gap-4 mb-4">
              <div className="h-12 w-12 rounded-full bg-gold/10 flex items-center justify-center text-gold font-bold text-xl">
                <Store size={24} />
              </div>
              <div>
                <h4 className="font-bold text-white">{s.name}</h4>
                <p className="text-xs text-white/40 uppercase tracking-widest">{s.category}</p>
              </div>
            </div>
            <div className="space-y-2 text-sm text-white/60">
              <p className="flex items-center gap-2"><User size={14} /> {s.contact_person}</p>
              <p className="flex items-center gap-2"><Phone size={14} /> {s.phone}</p>
              <p className="flex items-center gap-2"><Mail size={14} /> {s.email || 'N/A'}</p>
            </div>
          </div>
        ))}
      </div>

      <AnimatePresence>
        {isModalOpen && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setIsModalOpen(false)} className="absolute inset-0 bg-black/80 backdrop-blur-sm" />
            <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }} className="relative w-full max-w-lg rounded-3xl border border-white/10 bg-[#111] p-8 shadow-2xl">
              <h2 className="text-2xl font-bold text-white mb-6">Add Supplier</h2>
              <form onSubmit={handleSave} className="space-y-4">
                <input required placeholder="Supplier Name" value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} className="h-12 w-full rounded-xl border border-white/10 bg-black/40 px-4 text-white outline-none focus:border-gold" />
                <input placeholder="Contact Person" value={formData.contact_person} onChange={e => setFormData({...formData, contact_person: e.target.value})} className="h-12 w-full rounded-xl border border-white/10 bg-black/40 px-4 text-white outline-none focus:border-gold" />
                <input required placeholder="Phone" value={formData.phone} onChange={e => setFormData({...formData, phone: e.target.value})} className="h-12 w-full rounded-xl border border-white/10 bg-black/40 px-4 text-white outline-none focus:border-gold" />
                <input type="email" placeholder="Email" value={formData.email} onChange={e => setFormData({...formData, email: e.target.value})} className="h-12 w-full rounded-xl border border-white/10 bg-black/40 px-4 text-white outline-none focus:border-gold" />
                <select value={formData.category} onChange={e => setFormData({...formData, category: e.target.value})} className="h-12 w-full rounded-xl border border-white/10 bg-black/40 px-4 text-white outline-none focus:border-gold">
                  <option>Fabrics</option>
                  <option>Threads & Accessories</option>
                  <option>Packaging</option>
                  <option>Other</option>
                </select>
                <div className="flex gap-4 pt-4">
                  <button type="button" onClick={() => setIsModalOpen(false)} className="flex-1 h-12 rounded-xl border border-white/10 font-bold text-white">Cancel</button>
                  <button type="submit" className="flex-1 h-12 rounded-xl bg-gold font-bold text-black">Save Supplier</button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};

const PurchasesManagement = () => {
  const [purchases, setPurchases] = useState<any[]>([]);
  const [suppliers, setSuppliers] = useState<any[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [formData, setFormData] = useState({ supplier_id: '', supplier_name: '', total: '', date: new Date().toISOString().split('T')[0], notes: '' });

  useEffect(() => {
    const qP = query(collection(db, 'purchases'), orderBy('date', 'desc'));
    const unsubP = onSnapshot(qP, (snapshot) => {
      setPurchases(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    });
    const unsubS = onSnapshot(collection(db, 'suppliers'), (snapshot) => {
      setSuppliers(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    });
    return () => { unsubP(); unsubS(); };
  }, []);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    const supplier = suppliers.find(s => s.id === formData.supplier_id);
    try {
      await addDoc(collection(db, 'purchases'), { 
        ...formData, 
        supplier_name: supplier?.name || 'Unknown',
        total: Number(formData.total), 
        created_at: serverTimestamp() 
      });
      setIsModalOpen(false);
      setFormData({ supplier_id: '', supplier_name: '', total: '', date: new Date().toISOString().split('T')[0], notes: '' });
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, 'purchases');
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h3 className="text-xl font-bold text-white">Purchases ({purchases.length})</h3>
        <button onClick={() => setIsModalOpen(true)} className="flex items-center gap-2 rounded-xl bg-gold px-4 py-2 text-sm font-bold text-black hover:scale-105 transition-all">
          <Plus size={18} /> New Purchase
        </button>
      </div>

      <div className="grid grid-cols-1 gap-4">
        {purchases.map((p) => (
          <div key={p.id} className="rounded-2xl border border-white/10 bg-white/5 p-6 flex items-center justify-between">
            <div>
              <h4 className="font-bold text-white">{p.supplier_name}</h4>
              <p className="text-xs text-white/40">{p.date}</p>
              {p.notes && <p className="text-[10px] text-white/20 mt-1 italic">{p.notes}</p>}
            </div>
            <div className="text-right">
              <span className="text-sm font-bold text-white">TSh {p.total?.toLocaleString()}</span>
            </div>
          </div>
        ))}
      </div>

      <AnimatePresence>
        {isModalOpen && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setIsModalOpen(false)} className="absolute inset-0 bg-black/80 backdrop-blur-sm" />
            <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }} className="relative w-full max-w-lg rounded-3xl border border-white/10 bg-[#111] p-8 shadow-2xl">
              <h2 className="text-2xl font-bold text-white mb-6">New Purchase</h2>
              <form onSubmit={handleSave} className="space-y-4">
                <select required value={formData.supplier_id} onChange={e => setFormData({...formData, supplier_id: e.target.value})} className="h-12 w-full rounded-xl border border-white/10 bg-black/40 px-4 text-white outline-none focus:border-gold">
                  <option value="">Select Supplier</option>
                  {suppliers.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                </select>
                <input required type="number" placeholder="Total Amount" value={formData.total} onChange={e => setFormData({...formData, total: e.target.value})} className="h-12 w-full rounded-xl border border-white/10 bg-black/40 px-4 text-white outline-none focus:border-gold" />
                <input type="date" value={formData.date} onChange={e => setFormData({...formData, date: e.target.value})} className="h-12 w-full rounded-xl border border-white/10 bg-black/40 px-4 text-white outline-none focus:border-gold" />
                <textarea placeholder="Notes (optional)" value={formData.notes} onChange={e => setFormData({...formData, notes: e.target.value})} className="w-full rounded-xl border border-white/10 bg-black/40 p-4 text-white outline-none focus:border-gold resize-none" />
                <div className="flex gap-4 pt-4">
                  <button type="button" onClick={() => setIsModalOpen(false)} className="flex-1 h-12 rounded-xl border border-white/10 font-bold text-white">Cancel</button>
                  <button type="submit" className="flex-1 h-12 rounded-xl bg-gold font-bold text-black">Save Purchase</button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};

const StaffManagement = () => {
  const [staff, setStaff] = useState<any[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [formData, setFormData] = useState({ 
    jina: '', 
    email: '', 
    role: 'cashier', 
    phone: '',
    password: '',
    pay_type: 'ojt'
  });

  const rolePermissions: Record<string, { label: string; icon: string; perms: { text: string; allowed: boolean }[] }> = {
    cashier: {
      label: 'Cashier',
      icon: '🏪',
      perms: [
        { text: 'POS — Mauzo ya dukani', allowed: true },
        { text: 'Angalia oda zake tu', allowed: true },
        { text: 'Futa bidhaa', allowed: false },
        { text: 'Angalia ripoti za faida', allowed: false },
        { text: 'Manage wafanyakazi', allowed: false },
      ]
    },
    seller: {
      label: 'Muuzaji (Seller)',
      icon: '🛍️',
      perms: [
        { text: 'POS — Mauzo ya dukani', allowed: true },
        { text: 'Angalia oda ZAKE peke yake', allowed: true },
        { text: 'Ona mauzo na tume yake', allowed: true },
        { text: 'Oda za wengine', allowed: false },
        { text: 'Futa bidhaa', allowed: false },
        { text: 'Manage wafanyakazi', allowed: false },
        { text: 'Ripoti kamili', allowed: false },
      ]
    },
    manager: {
      label: 'Operations Manager',
      icon: '🗳️',
      perms: [
        { text: 'POS mauzo', allowed: true },
        { text: 'Angalia oda zote', allowed: true },
        { text: 'Badilisha hali ya oda + arifu mteja', allowed: true },
        { text: 'Angalia vipimo', allowed: true },
        { text: 'Futa bidhaa', allowed: false },
        { text: 'Ongeza wafanyakazi', allowed: false },
        { text: 'Angalia faida kamili', allowed: false },
      ]
    },
    tailor: {
      label: 'Fundi Shona',
      icon: '🧵',
      perms: [
        { text: 'Angalia oda zake za kushona', allowed: true },
        { text: 'Sasisha hatua', allowed: true },
        { text: 'Angalia vipimo vya wateja', allowed: true },
        { text: 'POS', allowed: false },
        { text: 'Fedha', allowed: false },
        { text: 'Manage bidhaa', allowed: false },
      ]
    },
    admin: {
      label: 'Admin',
      icon: '👑',
      perms: [
        { text: 'Ruhusa ZOTE — hakuna kikwazo', allowed: true },
      ]
    }
  };

  useEffect(() => {
    const unsubscribe = onSnapshot(collection(db, 'staff'), (snapshot) => {
      setStaff(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, 'staff');
    });
    return () => unsubscribe();
  }, []);

  const handleAddStaff = async (e: React.FormEvent) => {
    e.preventDefault();
    await addDoc(collection(db, 'staff'), { 
      ...formData, 
      active: true, 
      created_at: serverTimestamp() 
    });
    setIsModalOpen(false);
    setFormData({ 
      jina: '', 
      email: '', 
      role: 'cashier', 
      phone: '',
      password: '',
      pay_type: 'ojt'
    });
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h3 className="text-xl font-bold text-white">Wafanyakazi ({staff.length})</h3>
        <button onClick={() => setIsModalOpen(true)} className="flex items-center gap-2 rounded-xl bg-gold px-4 py-2 text-sm font-bold text-black hover:scale-105 transition-all">
          <Plus size={18} /> Ongeza Mfanyakazi
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {staff.map((s) => (
          <div key={s.id} className="rounded-2xl border border-white/10 bg-white/5 p-6">
            <div className="flex items-center gap-4 mb-4">
              <div className="h-12 w-12 rounded-full bg-gold/20 flex items-center justify-center text-gold font-bold text-xl">
                {s.role === 'admin' ? '👑' : (s.jina?.[0].toUpperCase() || 'U')}
              </div>
              <div>
                <h4 className="font-bold text-white">{s.jina}</h4>
                <p className="text-xs text-white/40 uppercase font-bold tracking-widest">
                  {rolePermissions[s.role]?.label || s.role}
                </p>
              </div>
            </div>
            <div className="space-y-2 text-sm text-white/60">
              <p className="flex items-center gap-2"><Mail size={14} /> {s.email}</p>
              <p className="flex items-center gap-2"><Phone size={14} /> {s.phone || 'N/A'}</p>
              <p className="text-[10px] uppercase tracking-wider text-white/30 mt-2">
                Malipo: {s.pay_type === 'ojt' ? 'OJT' : s.pay_type === 'salary' ? 'Mshahara' : s.pay_type === 'daily' ? 'Kila Siku' : 'Tume'}
              </p>
            </div>
          </div>
        ))}
      </div>

      <AnimatePresence>
        {isModalOpen && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 overflow-y-auto">
            <motion.div 
              initial={{ opacity: 0 }} 
              animate={{ opacity: 1 }} 
              exit={{ opacity: 0 }} 
              onClick={() => setIsModalOpen(false)} 
              className="fixed inset-0 bg-black/90 backdrop-blur-sm" 
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: 20 }} 
              animate={{ opacity: 1, scale: 1, y: 0 }} 
              exit={{ opacity: 0, scale: 0.95, y: 20 }} 
              className="relative w-full max-w-lg rounded-3xl border border-white/10 bg-[#0a0a0a] p-8 shadow-2xl my-8"
            >
              <div className="flex items-center justify-between mb-8">
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-xl bg-violet-500/20 flex items-center justify-center text-violet-500">
                    <User size={24} />
                  </div>
                  <h2 className="text-2xl font-serif font-bold text-white">Mfanyakazi</h2>
                </div>
                <button 
                  onClick={() => setIsModalOpen(false)}
                  className="h-10 w-10 rounded-full bg-white/5 flex items-center justify-center text-white/40 hover:bg-white/10 hover:text-white transition-all"
                >
                  <X size={20} />
                </button>
              </div>

              <form onSubmit={handleAddStaff} className="space-y-6">
                <div className="space-y-2">
                  <label className="text-[10px] font-bold text-white/30 uppercase tracking-widest">Jina Kamili *</label>
                  <input 
                    required 
                    value={formData.jina} 
                    onChange={e => setFormData({...formData, jina: e.target.value})} 
                    placeholder="Juma Hassan"
                    className="h-14 w-full rounded-xl border border-white/5 bg-white/5 px-4 text-white outline-none focus:border-gold/50 transition-all" 
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-[10px] font-bold text-white/30 uppercase tracking-widest">Email *</label>
                    <input 
                      required 
                      type="email" 
                      value={formData.email} 
                      onChange={e => setFormData({...formData, email: e.target.value})} 
                      placeholder="juma@kanzu.co.tz"
                      className="h-14 w-full rounded-xl border border-white/5 bg-white/5 px-4 text-white outline-none focus:border-gold/50 transition-all" 
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-bold text-white/30 uppercase tracking-widest">Namba ya Simu</label>
                    <input 
                      value={formData.phone} 
                      onChange={e => setFormData({...formData, phone: e.target.value})} 
                      placeholder="07XX XXX XXX"
                      className="h-14 w-full rounded-xl border border-white/5 bg-white/5 px-4 text-white outline-none focus:border-gold/50 transition-all" 
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-[10px] font-bold text-white/30 uppercase tracking-widest">Nywila <span className="lowercase text-white/20">(acha wazi ikiwa unahariri)</span></label>
                  <div className="relative">
                    <input 
                      type={showPassword ? 'text' : 'password'}
                      value={formData.password} 
                      onChange={e => setFormData({...formData, password: e.target.value})} 
                      placeholder="Angalau herufi 6"
                      className="h-14 w-full rounded-xl border border-white/5 bg-white/5 px-4 pr-12 text-white outline-none focus:border-gold/50 transition-all" 
                    />
                    <button 
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-4 top-1/2 -translate-y-1/2 text-white/20 hover:text-white transition-all"
                    >
                      {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-[10px] font-bold text-white/30 uppercase tracking-widest">Wajibu</label>
                    <select 
                      value={formData.role} 
                      onChange={e => setFormData({...formData, role: e.target.value})} 
                      className="h-14 w-full rounded-xl border border-white/5 bg-white/5 px-4 text-white outline-none focus:border-gold/50 transition-all appearance-none"
                    >
                      <option value="cashier">🏪 Cashier</option>
                      <option value="seller">🛍️ Muuzaji (Seller)</option>
                      <option value="manager">🗳️ Operations Manager</option>
                      <option value="tailor">🧵 Fundi Shona</option>
                      <option value="admin">👑 Admin</option>
                    </select>
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-bold text-white/30 uppercase tracking-widest">Aina ya Malipo</label>
                    <select 
                      value={formData.pay_type} 
                      onChange={e => setFormData({...formData, pay_type: e.target.value})} 
                      className="h-14 w-full rounded-xl border border-white/5 bg-white/5 px-4 text-white outline-none focus:border-gold/50 transition-all appearance-none"
                    >
                      <option value="ojt">On-Job Training (OJT)</option>
                      <option value="salary">Mshahara wa Kila Mwezi</option>
                      <option value="daily">Malipo ya Kila Siku</option>
                      <option value="commission">Tume (Commission)</option>
                    </select>
                  </div>
                </div>

                {/* Permissions Preview */}
                <div className="rounded-2xl bg-white/[0.02] border border-white/5 p-6 space-y-4">
                  <div className="flex items-center gap-2 text-sm font-bold text-white/80">
                    <span>{rolePermissions[formData.role]?.icon}</span>
                    <span>{rolePermissions[formData.role]?.label}</span>
                  </div>
                  <div className="space-y-2">
                    {rolePermissions[formData.role]?.perms.map((p, idx) => (
                      <div key={idx} className="flex items-center gap-3 text-xs">
                        {p.allowed ? (
                          <div className="h-4 w-4 rounded bg-green-500/20 flex items-center justify-center text-green-500">
                            <Check size={10} strokeWidth={3} />
                          </div>
                        ) : (
                          <div className="h-4 w-4 rounded bg-red-500/20 flex items-center justify-center text-red-500">
                            <X size={10} strokeWidth={3} />
                          </div>
                        )}
                        <span className={cn(
                          "transition-all",
                          p.allowed ? "text-green-500/80" : "text-red-500/60"
                        )}>
                          {p.text}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>

                <button 
                  type="submit" 
                  className="w-full h-16 rounded-2xl bg-[#a68945] font-bold text-black hover:bg-[#bda15c] active:scale-[0.98] transition-all uppercase tracking-widest text-sm"
                >
                  Hifadhi Mfanyakazi
                </button>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};

const TailoringManagement = () => {
  const [customOrders, setCustomOrders] = useState<any[]>([]);
  const [tailorOrders, setTailorOrders] = useState<any[]>([]);
  const [activeTab, setActiveTab] = useState<'custom' | 'tailors'>('custom');

  useEffect(() => {
    const qCustom = query(collection(db, 'custom_orders'), orderBy('created_at', 'desc'));
    const unsubscribeCustom = onSnapshot(qCustom, (snapshot) => {
      setCustomOrders(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, 'custom_orders');
    });

    const qTailor = query(collection(db, 'tailor_orders'), orderBy('created_at', 'desc'));
    const unsubscribeTailor = onSnapshot(qTailor, (snapshot) => {
      setTailorOrders(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, 'tailor_orders');
    });

    return () => {
      unsubscribeCustom();
      unsubscribeTailor();
    };
  }, []);

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4 border-b border-white/10 pb-4">
        <button 
          onClick={() => setActiveTab('custom')}
          className={cn(
            "px-4 py-2 text-sm font-bold transition-all",
            activeTab === 'custom' ? "text-gold border-b-2 border-gold" : "text-white/40 hover:text-white"
          )}
        >
          Custom Orders
        </button>
        <button 
          onClick={() => setActiveTab('tailors')}
          className={cn(
            "px-4 py-2 text-sm font-bold transition-all",
            activeTab === 'tailors' ? "text-gold border-b-2 border-gold" : "text-white/40 hover:text-white"
          )}
        >
          Tailor Assignments
        </button>
      </div>

      {activeTab === 'custom' ? (
        <div className="grid grid-cols-1 gap-4">
          {customOrders.map((o) => (
            <div key={o.id} className="rounded-2xl border border-white/10 bg-white/5 p-6 flex items-center justify-between">
              <div>
                <h4 className="font-bold text-white">{o.customer_name}</h4>
                <p className="text-xs text-white/40">Fabric: {o.fabric_type} | Style: {o.style_name}</p>
                <div className="mt-2 flex gap-4 text-[10px] text-white/60">
                  <span>Neck: {o.measurements?.neck}"</span>
                  <span>Chest: {o.measurements?.chest}"</span>
                  <span>Length: {o.measurements?.length}"</span>
                </div>
              </div>
              <div className="text-right">
                <span className="text-xs font-bold text-gold">TSh {o.total_price?.toLocaleString()}</span>
                <p className="text-[10px] text-white/40 uppercase tracking-widest mt-1">{o.status}</p>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4">
          {tailorOrders.map((o) => (
            <div key={o.id} className="rounded-2xl border border-white/10 bg-white/5 p-6 flex items-center justify-between">
              <div>
                <h4 className="font-bold text-white">Order #{o.order_id}</h4>
                <p className="text-xs text-white/40">Tailor: {o.tailor_name}</p>
                <p className="text-[10px] text-white/60 mt-1">Deadline: {o.deadline?.toDate().toLocaleDateString()}</p>
              </div>
              <div className="text-right">
                <span className={cn(
                  "inline-flex items-center rounded-full px-2 py-1 text-[10px] font-bold uppercase",
                  o.status === 'Completed' ? "bg-green-500/10 text-green-500" : "bg-amber-500/10 text-amber-500"
                )}>
                  {o.status}
                </span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

const CustomersManagement = () => {
  const [customers, setCustomers] = useState<any[]>([]);

  useEffect(() => {
    const unsubscribe = onSnapshot(collection(db, 'customers'), (snapshot) => {
      setCustomers(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, 'customers');
    });
    return () => unsubscribe();
  }, []);

  return (
    <div className="space-y-6">
      <h3 className="text-xl font-bold text-white">Customers ({customers.length})</h3>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {customers.map((c) => (
          <div key={c.id} className="rounded-2xl border border-white/10 bg-white/5 p-6 relative overflow-hidden group">
            <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-all">
              <Gift size={48} className="text-gold" />
            </div>
            <h4 className="font-bold text-white">{c.name}</h4>
            <p className="text-sm text-white/60 mt-1">{c.email}</p>
            <p className="text-sm text-white/60">{c.phone}</p>
            
            <div className="mt-4 flex items-center gap-2">
              <div className="px-3 py-1 rounded-full bg-gold/10 border border-gold/20 flex items-center gap-2">
                <Gift size={12} className="text-gold" />
                <span className="text-xs font-bold text-gold">{c.loyalty_points || 0} Points</span>
              </div>
            </div>

            <div className="mt-4 pt-4 border-t border-white/5 flex justify-between items-center">
              <span className="text-[10px] text-white/40 uppercase font-bold">Orders: {c.order_count || 0}</span>
              <span className="text-[10px] text-white/40 uppercase font-bold">Total Spent: TSh {c.total_spent?.toLocaleString() || 0}</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

const ProductsManagement = () => {
  const { isAdmin, isStaff } = useApp();
  const [products, setProducts] = useState<Product[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isQRModalOpen, setIsQRModalOpen] = useState(false);
  const [qrProduct, setQrProduct] = useState<Product | null>(null);
  const [customUrl, setCustomUrl] = useState('');
  const [qrOptions, setQrOptions] = useState({
    theme: 'dark', // 'dark', 'light', 'gold'
    showPrice: true,
    showSizes: true,
    showIcons: true,
    qrColor: '#1a1208',
    qrBgColor: '#ffffff',
    logoUrl: 'https://picsum.photos/seed/kanzu-logo/30/30'
  });
  const [copied, setCopied] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    price: '',
    category: 'Kanzu za Harusi',
    image_url: '',
    description: '',
    in_stock: true,
    stock_quantity: '0',
    loyalty_points_value: '10'
  });

  useEffect(() => {
    const q = query(collection(db, 'products'), orderBy('created_at', 'desc'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      setProducts(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Product)));
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, 'products');
    });
    return () => unsubscribe();
  }, []);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    const data: any = {
      ...formData,
      price: Number(formData.price),
      stock_quantity: Number(formData.stock_quantity),
      loyalty_points_value: Number(formData.loyalty_points_value),
    };

    if (editingProduct) {
      await updateDoc(doc(db, 'products', editingProduct.id), data);
    } else {
      data.created_at = serverTimestamp();
      await addDoc(collection(db, 'products'), data);
    }
    setIsModalOpen(false);
    setEditingProduct(null);
    setFormData({ name: '', price: '', category: 'Kanzu za Harusi', image_url: '', description: '', in_stock: true, stock_quantity: '0', loyalty_points_value: '10' });
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h3 className="text-xl font-bold text-white">Products ({products.length})</h3>
        <button 
          onClick={() => { setEditingProduct(null); setIsModalOpen(true); }}
          className="flex items-center gap-2 rounded-xl bg-gold px-4 py-2 text-sm font-bold text-black hover:scale-105 transition-all"
        >
          <Plus size={18} /> Add Product
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
        {products.map((p) => (
          <div key={p.id} className="rounded-2xl border border-white/10 bg-white/5 overflow-hidden">
            <div className="aspect-square bg-black/40">
              <img 
                src={getDirectImageUrl(p.image_url)} 
                alt={p.name} 
                className="h-full w-full object-cover" 
                referrerPolicy="no-referrer" 
                onError={(e) => {
                  (e.target as HTMLImageElement).src = 'https://picsum.photos/seed/product/400/400';
                }}
              />
            </div>
              <div className="p-4">
                <div className="flex justify-between items-start mb-1">
                  <h4 className="font-bold text-white truncate flex-1">{p.name}</h4>
                  <span className={cn(
                    "text-[10px] font-bold px-2 py-0.5 rounded-full",
                    (p.stock_quantity || 0) > 5 ? "bg-green-500/10 text-green-500" : "bg-red-500/10 text-red-500"
                  )}>
                    {p.stock_quantity || 0} in stock
                  </span>
                </div>
                <p className="text-gold font-bold">TSh {p.price.toLocaleString()}</p>
              <div className="mt-4 flex gap-2">
                <button 
                  onClick={() => { 
                    setEditingProduct(p); 
                    setFormData({ 
                      name: p.name, 
                      price: String(p.price), 
                      category: p.category, 
                      image_url: p.image_url, 
                      description: p.description || '', 
                      in_stock: p.in_stock,
                      stock_quantity: String(p.stock_quantity || 0),
                      loyalty_points_value: String(p.loyalty_points_value || 10)
                    });
                    setIsModalOpen(true); 
                  }}
                  className="flex-1 rounded-lg bg-white/5 py-2 text-xs font-bold text-white hover:bg-white/10 transition-all"
                >
                  Edit
                </button>
                <button 
                  onClick={() => {
                    setQrProduct(p);
                    setIsQRModalOpen(true);
                  }}
                  className="flex-1 rounded-lg bg-gold/10 py-2 text-xs font-bold text-gold hover:bg-gold/20 transition-all"
                >
                  QR
                </button>
                <button className="flex-1 rounded-lg bg-red-500/10 py-2 text-xs font-bold text-red-500 hover:bg-red-500/20 transition-all">
                  Delete
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* QR Code Modal - Premium Product Label */}
      <AnimatePresence>
        {isQRModalOpen && qrProduct && (
          <div className="fixed inset-0 z-[110] flex items-center justify-center p-4 overflow-y-auto">
            <motion.div 
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              onClick={() => setIsQRModalOpen(false)}
              className="fixed inset-0 bg-black/95 backdrop-blur-xl"
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.9, y: 20 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="relative w-full max-w-4xl grid grid-cols-1 md:grid-cols-2 gap-8 bg-[#0a0a0a] border border-white/10 rounded-[2.5rem] p-8 md:p-12 shadow-2xl"
            >
              {/* Left Column: Label Preview */}
              <div className="flex flex-col items-center justify-center gap-6">
                <div id="printable-label" className={`w-[320px] rounded-[2.5rem] overflow-hidden border-2 flex flex-col items-center p-8 text-center relative transition-all duration-500 ${
                  qrOptions.theme === 'dark' ? 'bg-[#050505] border-[#c9a84c] shadow-[0_0_60px_rgba(201,168,76,0.2)]' :
                  qrOptions.theme === 'light' ? 'bg-white border-black/10 shadow-[0_0_60px_rgba(0,0,0,0.05)]' :
                  'bg-[#c9a84c] border-black/20 shadow-[0_0_60px_rgba(201,168,76,0.4)]'
                }`}>
                  {/* Background Pattern Overlay */}
                  <div className={`absolute inset-0 opacity-[0.03] pointer-events-none islamic-pattern-dots ${qrOptions.theme === 'light' ? 'invert' : ''}`} />
                  <div className={`absolute inset-0 opacity-[0.05] pointer-events-none islamic-pattern-lines ${qrOptions.theme === 'light' ? 'invert' : ''}`} />

                  {/* Decorative Elements */}
                  <div className={`absolute top-0 left-0 w-full h-40 bg-gradient-to-b from-[#c9a84c]/20 to-transparent pointer-events-none ${qrOptions.theme === 'gold' ? 'from-white/20' : ''}`} />
                  {qrOptions.showIcons && (
                    <div className="absolute top-6 right-8 opacity-40">
                      <span className={`text-4xl filter drop-shadow-[0_0_10px_rgba(201,168,76,0.5)] ${qrOptions.theme === 'light' ? 'text-black' : ''}`}>🌙</span>
                    </div>
                  )}

                  {/* Header */}
                  <div className="mb-8 z-10">
                    <div className="flex items-center justify-center gap-3 mb-2">
                      {qrOptions.showIcons && <span className={`text-3xl filter drop-shadow-[0_0_8px_rgba(201,168,76,0.3)] ${qrOptions.theme === 'light' ? 'text-black' : ''}`}>🕌</span>}
                      <h2 className={`font-serif text-2xl font-bold tracking-tight ${
                        qrOptions.theme === 'light' ? 'text-black' : 
                        qrOptions.theme === 'gold' ? 'text-black' : 'text-[#c9a84c]'
                      }`}>Kanzu Palace</h2>
                    </div>
                    <div className={`h-[1px] w-24 mx-auto mb-2 ${
                      qrOptions.theme === 'light' ? 'bg-black/10' : 
                      qrOptions.theme === 'gold' ? 'bg-black/20' : 'bg-gradient-to-r from-transparent via-[#c9a84c]/50 to-transparent'
                    }`} />
                    <p className={`text-[9px] font-bold uppercase tracking-[0.3em] ${
                      qrOptions.theme === 'light' ? 'text-black/40' : 
                      qrOptions.theme === 'gold' ? 'text-black/40' : 'text-white/50'
                    }`}>Lebo ya Bidhaa • Product Label</p>
                  </div>

                  {/* Product Info */}
                  <div className="mb-10 z-10">
                    <p className={`text-[11px] font-bold uppercase tracking-[0.4em] mb-3 opacity-80 ${
                      qrOptions.theme === 'light' ? 'text-black/60' : 
                      qrOptions.theme === 'gold' ? 'text-black/60' : 'text-[#c9a84c]'
                    }`}>{qrProduct.category}</p>
                    <h3 className={`text-3xl font-serif font-bold tracking-[0.1em] uppercase leading-tight drop-shadow-lg ${
                      qrOptions.theme === 'light' ? 'text-black' : 
                      qrOptions.theme === 'gold' ? 'text-black' : 'text-white'
                    }`}>{qrProduct.name}</h3>
                  </div>

                  {/* QR Code Container */}
                  <div className={`relative p-7 rounded-[2.5rem] mb-10 group transition-transform hover:scale-105 duration-500 ${
                    qrOptions.theme === 'light' ? 'bg-black/5' : 'bg-white shadow-[0_0_40px_rgba(201,168,76,0.15)]'
                  }`}>
                    <div className={`absolute inset-0 border-[3px] rounded-[2.5rem] -m-1.5 ${
                      qrOptions.theme === 'light' ? 'border-black/5' : 'border-[#c9a84c]/30'
                    }`} />
                    <QRCodeSVG 
                      value={customUrl || `${window.location.origin}/product/${qrProduct.id}`} 
                      size={170}
                      level="H"
                      includeMargin={false}
                      fgColor={qrOptions.qrColor}
                      bgColor={qrOptions.qrBgColor}
                      imageSettings={qrOptions.logoUrl ? {
                        src: qrOptions.logoUrl,
                        x: undefined,
                        y: undefined,
                        height: 36,
                        width: 36,
                        excavate: true,
                      } : undefined}
                    />
                  </div>

                  {/* Instructions */}
                  <div className="mb-10 px-6 z-10">
                    <div className={`inline-block px-4 py-1.5 rounded-full mb-3 ${
                      qrOptions.theme === 'light' ? 'bg-black/5 border border-black/10' : 
                      qrOptions.theme === 'gold' ? 'bg-black/5 border border-black/10' : 'bg-[#c9a84c]/10 border border-[#c9a84c]/20'
                    }`}>
                      <p className={`text-[9px] font-bold uppercase tracking-widest ${
                        qrOptions.theme === 'light' ? 'text-black' : 
                        qrOptions.theme === 'gold' ? 'text-black' : 'text-[#c9a84c]'
                      }`}>Scan & Discover</p>
                    </div>
                    <p className={`text-[11px] leading-relaxed font-medium ${
                      qrOptions.theme === 'light' ? 'text-black/70' : 
                      qrOptions.theme === 'gold' ? 'text-black/70' : 'text-white/70'
                    }`}>
                      Scan QR kuona bidhaa hii mtandaoni<br />
                      au chagua size na kuagiza
                    </p>
                  </div>

                  {/* Price & Sizes */}
                  <div className={`w-full pt-8 border-t flex flex-col items-center z-10 ${
                    qrOptions.theme === 'light' ? 'border-black/10' : 'border-white/10'
                  }`}>
                    {qrOptions.showPrice && (
                      <div className="flex flex-col items-center gap-1 mb-6">
                        <div className="flex items-baseline gap-3">
                          <span className={`text-3xl font-bold ${
                            qrOptions.theme === 'light' ? 'text-black' : 
                            qrOptions.theme === 'gold' ? 'text-black' : 'text-[#c9a84c] drop-shadow-[0_0_10px_rgba(201,168,76,0.3)]'
                          }`}>TSh {qrProduct.price.toLocaleString()}</span>
                          {qrProduct.old_price && (
                            <span className={`text-sm line-through ${
                              qrOptions.theme === 'light' ? 'text-black/30 decoration-black/50' : 'text-white/30 decoration-[#c9a84c]/50'
                            }`}>TSh {qrProduct.old_price.toLocaleString()}</span>
                          )}
                        </div>
                        {qrProduct.old_price && (
                          <span className="px-2 py-0.5 rounded bg-red-500/20 text-red-500 text-[10px] font-bold uppercase tracking-tighter">
                            Save {Math.round(((qrProduct.old_price - qrProduct.price) / qrProduct.old_price) * 100)}% OFF
                          </span>
                        )}
                      </div>
                    )}
                    
                    {qrOptions.showSizes && (
                      <div className="flex flex-wrap justify-center gap-2">
                        {['S', 'M', 'L', 'XL', 'XXL', '3XL'].map(s => (
                          <div key={s} className={`w-10 h-10 rounded-xl border flex items-center justify-center text-[11px] font-bold transition-colors ${
                            qrOptions.theme === 'light' ? 'border-black/10 bg-black/5 text-black/50' : 
                            qrOptions.theme === 'gold' ? 'border-black/10 bg-black/5 text-black/50' : 'border-white/10 bg-white/5 text-white/60'
                          }`}>
                            {s}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Footer URL */}
                  <div className="mt-10 opacity-30">
                    <p className={`text-[8px] font-mono tracking-[0.3em] uppercase ${
                      qrOptions.theme === 'light' ? 'text-black' : 'text-white'
                    }`}>
                      {window.location.host} • ID: {qrProduct.id.substring(0, 8)}
                    </p>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4 w-full max-w-[320px]">
                  <button 
                    onClick={() => {
                      const url = `${window.location.origin}/product/${qrProduct.id}`;
                      navigator.clipboard.writeText(url);
                      setCopied(true);
                      setTimeout(() => setCopied(false), 2000);
                    }}
                    className="flex items-center justify-center gap-2 rounded-2xl bg-white/5 py-4 text-sm font-bold text-white hover:bg-white/10 transition-all"
                  >
                    {copied ? <Check size={18} className="text-green-500" /> : <Copy size={18} />}
                    Copy Link
                  </button>
                  <button 
                    onClick={() => setIsQRModalOpen(false)}
                    className="flex items-center justify-center gap-2 rounded-2xl bg-white/5 py-4 text-sm font-bold text-white hover:bg-white/10 transition-all"
                  >
                    Funga
                  </button>
                </div>
              </div>

              {/* Right Column: Controls */}
              <div className="flex flex-col h-full max-h-[80vh] overflow-y-auto pr-2 custom-scrollbar">
                <div className="mb-8">
                  <h3 className="text-2xl font-bold text-white mb-2">Customize Label</h3>
                  <p className="text-white/50 mb-6 text-sm">Chagua muonekano wa lebo yako kabla ya ku-print.</p>
                  
                  <div className="space-y-6">
                    {/* Theme Selection */}
                    <div>
                      <label className="text-[10px] font-bold text-white/40 uppercase tracking-widest block mb-3">Theme / Rangi ya Lebo</label>
                      <div className="grid grid-cols-3 gap-3">
                        {[
                          { id: 'dark', label: 'Dark', class: 'bg-black border-white/20' },
                          { id: 'light', label: 'Light', class: 'bg-white border-black/10' },
                          { id: 'gold', label: 'Gold', class: 'bg-[#c9a84c] border-black/10' }
                        ].map(t => (
                          <button 
                            key={t.id}
                            onClick={() => setQrOptions(prev => ({ ...prev, theme: t.id }))}
                            className={`flex flex-col items-center gap-2 p-3 rounded-xl border-2 transition-all ${
                              qrOptions.theme === t.id ? 'border-gold bg-gold/10' : 'border-transparent bg-white/5'
                            }`}
                          >
                            <div className={`w-full h-8 rounded-lg border ${t.class}`} />
                            <span className="text-[10px] font-bold text-white">{t.label}</span>
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* QR Colors */}
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="text-[10px] font-bold text-white/40 uppercase tracking-widest block mb-2">QR Color</label>
                        <input 
                          type="color" 
                          value={qrOptions.qrColor}
                          onChange={(e) => setQrOptions(prev => ({ ...prev, qrColor: e.target.value }))}
                          className="w-full h-10 bg-transparent cursor-pointer rounded-lg overflow-hidden"
                        />
                      </div>
                      <div>
                        <label className="text-[10px] font-bold text-white/40 uppercase tracking-widest block mb-2">QR Background</label>
                        <input 
                          type="color" 
                          value={qrOptions.qrBgColor}
                          onChange={(e) => setQrOptions(prev => ({ ...prev, qrBgColor: e.target.value }))}
                          className="w-full h-10 bg-transparent cursor-pointer rounded-lg overflow-hidden"
                        />
                      </div>
                    </div>

                    {/* Logo URL */}
                    <div>
                      <label className="text-[10px] font-bold text-white/40 uppercase tracking-widest block mb-2">Logo URL (Optional)</label>
                      <input 
                        type="text" 
                        value={qrOptions.logoUrl}
                        onChange={(e) => setQrOptions(prev => ({ ...prev, logoUrl: e.target.value }))}
                        placeholder="Link ya logo yako..."
                        className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-xs text-white outline-none focus:border-[#c9a84c] transition-all"
                      />
                    </div>

                    {/* Toggles */}
                    <div className="grid grid-cols-2 gap-3">
                      {[
                        { id: 'showPrice', label: 'Onyesha Bei' },
                        { id: 'showSizes', label: 'Onyesha Size' },
                        { id: 'showIcons', label: 'Onyesha Icons' }
                      ].map(opt => (
                        <button 
                          key={opt.id}
                          onClick={() => setQrOptions(prev => ({ ...prev, [opt.id]: !prev[opt.id as keyof typeof prev] }))}
                          className={`flex items-center justify-between px-4 py-3 rounded-xl border transition-all ${
                            qrOptions[opt.id as keyof typeof qrOptions] ? 'border-gold bg-gold/10 text-gold' : 'border-white/10 bg-white/5 text-white/40'
                          }`}
                        >
                          <span className="text-[10px] font-bold uppercase tracking-widest">{opt.label}</span>
                          <div className={`w-2 h-2 rounded-full ${qrOptions[opt.id as keyof typeof qrOptions] ? 'bg-gold shadow-[0_0_8px_rgba(201,168,76,0.5)]' : 'bg-white/20'}`} />
                        </button>
                      ))}
                    </div>

                    {/* Custom Link */}
                    <div>
                      <label className="text-[10px] font-bold text-white/40 uppercase tracking-widest block mb-2">Custom Link (Optional)</label>
                      <input 
                        type="text" 
                        value={customUrl}
                        onChange={(e) => setCustomUrl(e.target.value)}
                        placeholder="Weka link nyingine hapa..."
                        className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-xs text-white outline-none focus:border-[#c9a84c] transition-all"
                      />
                    </div>
                  </div>
                </div>

                <div className="mt-auto pt-6 border-t border-white/10 space-y-6">
                  <button 
                    onClick={() => {
                      const printContent = document.getElementById('printable-label');
                      const uniqueName = `label-${qrProduct.id}`;
                      const printWindow = window.open('', uniqueName, 'width=600,height=800');
                      if (printWindow) {
                        printWindow.document.write(`
                          <html>
                            <head>
                              <title>Print Label - ${qrProduct.name}</title>
                              <script src="https://cdn.tailwindcss.com"></script>
                              <link href="https://fonts.googleapis.com/css2?family=Playfair+Display:wght@700&family=Inter:wght@400;700&display=swap" rel="stylesheet">
                              <style>
                                @media print {
                                  body { margin: 0; padding: 0; background: white; }
                                  #printable-label { 
                                    box-shadow: none !important; 
                                    border: 2px solid ${qrOptions.theme === 'dark' ? '#c9a84c' : qrOptions.theme === 'light' ? '#000000' : '#000000'} !important;
                                    -webkit-print-color-adjust: exact;
                                    print-color-adjust: exact;
                                    width: 320px !important;
                                    margin: auto;
                                  }
                                }
                                body { font-family: 'Inter', sans-serif; display: flex; justify-content: center; align-items: center; min-height: 100vh; background: #f0f0f0; }
                                .font-serif { font-family: 'Playfair Display', serif; }
                                .islamic-pattern-dots {
                                  background-image: radial-gradient(#c9a84c 0.5px, transparent 0.5px);
                                  background-size: 10px 10px;
                                }
                                .islamic-pattern-lines {
                                  background-image: linear-gradient(45deg, #c9a84c 25%, transparent 25%, transparent 50%, #c9a84c 50%, #c9a84c 75%, transparent 75%, transparent);
                                  background-size: 40px 40px;
                                }
                                .invert { filter: invert(1); }
                              </style>
                            </head>
                            <body>
                              ${printContent?.outerHTML}
                              <script>
                                setTimeout(() => {
                                  window.print();
                                  window.close();
                                }, 1000);
                              </script>
                            </body>
                          </html>
                        `);
                        printWindow.document.close();
                      }
                    }}
                    className="flex items-center justify-center gap-3 w-full rounded-2xl bg-[#c9a84c] py-4 font-bold text-black hover:scale-[1.02] active:scale-[0.98] transition-all"
                  >
                    <Printer size={20} />
                    Print Lebo Sasa
                  </button>

                  <div className="p-6 rounded-2xl bg-white/5 border border-white/10">
                    <h4 className="text-xs font-bold text-[#c9a84c] uppercase tracking-widest mb-2">Maelekezo kwa Staff</h4>
                    <ul className="text-xs text-white/40 space-y-2">
                      <li>• Print lebo hii kwenye karatasi ngumu (Cardstock).</li>
                      <li>• Bandika lebo kwenye kanzu husika kwa kutumia kamba ya hariri.</li>
                      <li>• Hakikisha QR code inaonekana vizuri bila kukunja.</li>
                    </ul>
                  </div>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Modal */}
      <AnimatePresence>
        {isModalOpen && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              onClick={() => setIsModalOpen(false)}
              className="absolute inset-0 bg-black/80 backdrop-blur-sm"
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }}
              className="relative w-full max-w-lg rounded-3xl border border-white/10 bg-[#111] p-8 shadow-2xl"
            >
              <h2 className="text-2xl font-bold text-white mb-6">{editingProduct ? 'Edit Product' : 'Add New Product'}</h2>
              <form onSubmit={handleSave} className="space-y-4">
                <div className="space-y-2">
                  <label className="text-xs font-bold text-white/40 uppercase">Product Name</label>
                  <input required value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} className="h-12 w-full rounded-xl border border-white/10 bg-black/40 px-4 text-white outline-none focus:border-gold" />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-xs font-bold text-white/40 uppercase">Price (TSh)</label>
                    <input required type="number" value={formData.price} onChange={e => setFormData({...formData, price: e.target.value})} className="h-12 w-full rounded-xl border border-white/10 bg-black/40 px-4 text-white outline-none focus:border-gold" />
                  </div>
                  <div className="space-y-2">
                    <label className="text-xs font-bold text-white/40 uppercase">Category</label>
                    <select value={formData.category} onChange={e => setFormData({...formData, category: e.target.value})} className="h-12 w-full rounded-xl border border-white/10 bg-black/40 px-4 text-white outline-none focus:border-gold">
                      <option>Kanzu za Harusi</option>
                      <option>Kanzu za Eid</option>
                      <option>Kanzu za Kawaida</option>
                      <option>Kanzu za Watoto</option>
                    </select>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-xs font-bold text-white/40 uppercase">Stock Quantity</label>
                    <input required type="number" value={formData.stock_quantity} onChange={e => setFormData({...formData, stock_quantity: e.target.value})} className="h-12 w-full rounded-xl border border-white/10 bg-black/40 px-4 text-white outline-none focus:border-gold" />
                  </div>
                  <div className="space-y-2">
                    <label className="text-xs font-bold text-white/40 uppercase">Loyalty Points</label>
                    <input required type="number" value={formData.loyalty_points_value} onChange={e => setFormData({...formData, loyalty_points_value: e.target.value})} className="h-12 w-full rounded-xl border border-white/10 bg-black/40 px-4 text-white outline-none focus:border-gold" />
                  </div>
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-bold text-white/40 uppercase">Image URL</label>
                  <input required value={formData.image_url} onChange={e => setFormData({...formData, image_url: e.target.value})} className="h-12 w-full rounded-xl border border-white/10 bg-black/40 px-4 text-white outline-none focus:border-gold" />
                  {formData.image_url && (
                    <div className="mt-2 h-20 w-20 overflow-hidden rounded-lg border border-white/10">
                      <img 
                        src={getDirectImageUrl(formData.image_url)} 
                        alt="Preview" 
                        className="h-full w-full object-cover" 
                        referrerPolicy="no-referrer" 
                        onError={(e) => {
                          (e.target as HTMLImageElement).src = 'https://picsum.photos/seed/preview/200/200';
                        }}
                      />
                    </div>
                  )}
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-bold text-white/40 uppercase">Description</label>
                  <textarea rows={3} value={formData.description} onChange={e => setFormData({...formData, description: e.target.value})} className="w-full rounded-xl border border-white/10 bg-black/40 p-4 text-white outline-none focus:border-gold resize-none" />
                </div>
                <div className="flex items-center gap-2">
                  <input type="checkbox" id="in_stock" checked={formData.in_stock} onChange={e => setFormData({...formData, in_stock: e.target.checked})} className="h-5 w-5 rounded border-white/10 bg-black/40 text-gold focus:ring-gold" />
                  <label htmlFor="in_stock" className="text-sm font-bold text-white/60">In Stock</label>
                </div>
                <div className="flex gap-4 pt-4">
                  <button type="button" onClick={() => setIsModalOpen(false)} className="flex-1 h-12 rounded-xl border border-white/10 font-bold text-white hover:bg-white/5 transition-all">Cancel</button>
                  <button type="submit" className="flex-1 h-12 rounded-xl bg-gold font-bold text-black hover:scale-[1.02] transition-all">Save Product</button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};

const ExpensesManagement = () => {
  const [expenses, setExpenses] = useState<any[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [formData, setFormData] = useState({ title: '', amount: '', category: 'Material', date: new Date().toISOString().split('T')[0] });

  useEffect(() => {
    const q = query(collection(db, 'expenses'), orderBy('date', 'desc'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      setExpenses(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, 'expenses');
    });
    return () => unsubscribe();
  }, []);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    const data = { ...formData, amount: Number(formData.amount), created_at: serverTimestamp() };
    await addDoc(collection(db, 'expenses'), data);
    setIsModalOpen(false);
    setFormData({ title: '', amount: '', category: 'Material', date: new Date().toISOString().split('T')[0] });
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h3 className="text-xl font-bold text-white">Expenses ({expenses.length})</h3>
        <button 
          onClick={() => setIsModalOpen(true)}
          className="flex items-center gap-2 rounded-xl bg-red-500 px-4 py-2 text-sm font-bold text-white hover:scale-105 transition-all"
        >
          <Plus size={18} /> Add Expense
        </button>
      </div>

      <div className="grid grid-cols-1 gap-4">
        {expenses.map((exp) => (
          <div key={exp.id} className="rounded-2xl border border-white/10 bg-white/5 p-6 flex items-center justify-between">
            <div>
              <h4 className="font-bold text-white">{exp.title}</h4>
              <p className="text-xs text-white/40">{exp.category} • {exp.date}</p>
            </div>
            <div className="text-right">
              <span className="text-sm font-bold text-red-500">- TSh {exp.amount?.toLocaleString()}</span>
            </div>
          </div>
        ))}
      </div>

      <AnimatePresence>
        {isModalOpen && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setIsModalOpen(false)} className="absolute inset-0 bg-black/80 backdrop-blur-sm" />
            <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }} className="relative w-full max-w-lg rounded-3xl border border-white/10 bg-[#111] p-8 shadow-2xl">
              <h2 className="text-2xl font-bold text-white mb-6">Add Expense</h2>
              <form onSubmit={handleSave} className="space-y-4">
                <input required placeholder="Title" value={formData.title} onChange={e => setFormData({...formData, title: e.target.value})} className="h-12 w-full rounded-xl border border-white/10 bg-black/40 px-4 text-white outline-none focus:border-red-500" />
                <input required type="number" placeholder="Amount" value={formData.amount} onChange={e => setFormData({...formData, amount: e.target.value})} className="h-12 w-full rounded-xl border border-white/10 bg-black/40 px-4 text-white outline-none focus:border-red-500" />
                <select value={formData.category} onChange={e => setFormData({...formData, category: e.target.value})} className="h-12 w-full rounded-xl border border-white/10 bg-black/40 px-4 text-white outline-none focus:border-red-500">
                  <option>Material</option>
                  <option>Rent</option>
                  <option>Electricity</option>
                  <option>Staff Salary</option>
                  <option>Marketing</option>
                  <option>Other</option>
                </select>
                <input type="date" value={formData.date} onChange={e => setFormData({...formData, date: e.target.value})} className="h-12 w-full rounded-xl border border-white/10 bg-black/40 px-4 text-white outline-none focus:border-red-500" />
                <div className="flex gap-4 pt-4">
                  <button type="button" onClick={() => setIsModalOpen(false)} className="flex-1 h-12 rounded-xl border border-white/10 font-bold text-white">Cancel</button>
                  <button type="submit" className="flex-1 h-12 rounded-xl bg-red-500 font-bold text-white">Save Expense</button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};

const Overview = () => {
  const [stats, setStats] = useState({
    totalOrders: 0,
    revenue: 0,
    expenses: 0,
    pending: 0,
    products: 0,
    lowStock: 0,
    staffCount: 0,
    ordersToday: 0,
    avgOrderValue: 0
  });
  const [recentOrders, setRecentOrders] = useState<any[]>([]);
  const [chartData, setChartData] = useState<any[]>([]);

  useEffect(() => {
    const unsubOrders = onSnapshot(collection(db, 'orders'), (snap) => {
      const orders = snap.docs.map(d => d.data());
      const rev = orders.reduce((acc, o: any) => acc + (o.total || 0), 0);
      const pend = orders.filter((o: any) => o.order_status === 'Inasubiri Uthibitisho').length;
      
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const ordersToday = orders.filter((o: any) => {
        const orderDate = o.created_at?.toDate();
        return orderDate && orderDate >= today;
      }).length;

      setStats(prev => ({ 
        ...prev, 
        totalOrders: orders.length, 
        revenue: rev, 
        pending: pend,
        ordersToday: ordersToday,
        avgOrderValue: orders.length > 0 ? rev / orders.length : 0
      }));
      setRecentOrders(snap.docs.slice(0, 5).map(d => ({ id: d.id, ...d.data() })));
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, 'orders');
    });

    const unsubExpenses = onSnapshot(collection(db, 'expenses'), (snap) => {
      const exps = snap.docs.map(d => d.data());
      const totalExp = exps.reduce((acc, e: any) => acc + (e.amount || 0), 0);
      setStats(prev => ({ ...prev, expenses: totalExp }));
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, 'expenses');
    });

    const unsubProds = onSnapshot(collection(db, 'products'), (snap) => {
      const prods = snap.docs.map(d => d.data());
      const lowStock = prods.filter((p: any) => (p.stock_quantity || 0) <= 5).length;
      setStats(prev => ({ ...prev, products: snap.size, lowStock }));
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, 'products');
    });

    const unsubStaff = onSnapshot(collection(db, 'staff'), (snap) => {
      setStats(prev => ({ ...prev, staffCount: snap.size }));
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, 'staff');
    });

    // Combined chart data
    const unsubCombined = onSnapshot(query(collection(db, 'orders'), orderBy('created_at', 'desc')), (orderSnap) => {
      onSnapshot(query(collection(db, 'expenses'), orderBy('date', 'desc')), (expSnap) => {
        const orders = orderSnap.docs.map(d => d.data());
        const expenses = expSnap.docs.map(d => d.data());
        
        const grouped: Record<string, { name: string; sales: number; expenses: number }> = {};
        
        // Last 7 days
        for (let i = 6; i >= 0; i--) {
          const d = new Date();
          d.setDate(d.getDate() - i);
          const dateStr = d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });
          grouped[dateStr] = { name: dateStr, sales: 0, expenses: 0 };
        }

        orders.forEach((o: any) => {
          const dateStr = o.created_at?.toDate()?.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });
          if (grouped[dateStr]) grouped[dateStr].sales += (o.total || 0);
        });

        expenses.forEach((e: any) => {
          const d = new Date(e.date);
          const dateStr = d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });
          if (grouped[dateStr]) grouped[dateStr].expenses += (e.amount || 0);
        });

        setChartData(Object.values(grouped));
      });
    });

    return () => { unsubOrders(); unsubExpenses(); unsubProds(); unsubStaff(); unsubCombined(); };
  }, []);

  return (
    <div className="space-y-6">
      {/* Stats Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-8 gap-3">
        <StatCard title="Jumla Oda" value={stats.totalOrders} icon={<ShoppingBag size={20} className="text-amber-500" />} />
        <StatCard title="Mapato" value={`TSh ${stats.revenue.toLocaleString()}`} icon={<Wallet size={20} className="text-green-500" />} />
        <StatCard title="Matumizi" value={`TSh ${stats.expenses.toLocaleString()}`} icon={<CreditCard size={20} className="text-red-500" />} />
        <StatCard title="Faida" value={`TSh ${(stats.revenue - stats.expenses).toLocaleString()}`} icon={<TrendingUp size={20} className="text-emerald-500" />} />
        <StatCard title="Zinasubiri" value={stats.pending} icon={<History size={20} className="text-amber-500" />} />
        <StatCard title="Hisa Chache" value={stats.lowStock} icon={<AlertCircle size={20} className="text-red-500" />} />
        <StatCard title="Oda Leo" value={stats.ordersToday} icon={<ShoppingBag size={20} className="text-blue-500" />} />
        <StatCard title="Wastani Oda" value={`TSh ${Math.round(stats.avgOrderValue).toLocaleString()}`} icon={<BarChart3 size={20} className="text-blue-400" />} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 rounded-2xl border border-white/5 bg-[#111] p-6">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h3 className="text-lg font-bold text-white">Revenue vs Expenses</h3>
              <p className="text-xs text-white/40">Mwenendo wa mauzo na matumizi kwa siku 7 zilizopita</p>
            </div>
            <div className="flex gap-4">
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-gold" />
                <span className="text-[10px] font-bold text-white/40 uppercase">Sales</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-red-500" />
                <span className="text-[10px] font-bold text-white/40 uppercase">Expenses</span>
              </div>
            </div>
          </div>
          
          <div className="h-80 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#ffffff05" vertical={false} />
                <XAxis 
                  dataKey="name" 
                  axisLine={false} 
                  tickLine={false} 
                  tick={{ fill: '#ffffff40', fontSize: 10, fontWeight: 'bold' }} 
                  dy={10}
                />
                <YAxis 
                  axisLine={false} 
                  tickLine={false} 
                  tick={{ fill: '#ffffff40', fontSize: 10, fontWeight: 'bold' }}
                  tickFormatter={(value) => `TSh ${value >= 1000 ? (value/1000) + 'k' : value}`}
                />
                <Tooltip 
                  contentStyle={{ backgroundColor: '#111', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '12px' }}
                  itemStyle={{ fontSize: '12px', fontWeight: 'bold' }}
                />
                <Bar dataKey="sales" fill="#c9a84c" radius={[4, 4, 0, 0]} barSize={20} />
                <Bar dataKey="expenses" fill="#ef4444" radius={[4, 4, 0, 0]} barSize={20} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="rounded-2xl border border-white/5 bg-[#111] p-6">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-sm font-bold text-white flex items-center gap-2">
              <ShoppingBag size={16} className="text-amber-500" />
              Oda za Hivi Karibuni
            </h3>
            <span className="text-[10px] text-white/40">Jumla oda {stats.totalOrders}</span>
          </div>
          <div className="space-y-4">
            {recentOrders.map((o) => (
              <div key={o.id} className="flex items-center justify-between p-3 rounded-xl bg-white/5 border border-white/5">
                <div>
                  <p className="text-xs font-bold text-white">{o.customer_name}</p>
                  <p className="text-[10px] text-white/40">{o.order_number}</p>
                </div>
                <div className="text-right">
                  <p className="text-xs font-bold text-gold">TSh {o.total?.toLocaleString()}</p>
                  <p className="text-[10px] text-white/40">{o.order_status}</p>
                </div>
              </div>
            ))}
            {recentOrders.length === 0 && (
              <div className="text-center py-8">
                <ShoppingBag size={32} className="mx-auto text-white/10 mb-2" />
                <p className="text-xs text-white/20">Hakuna oda za hivi karibuni</p>
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="rounded-2xl border border-white/5 bg-[#111] p-6 min-h-[200px]">
          <h3 className="text-sm font-bold text-white flex items-center gap-2 mb-6">
            <Wallet size={16} className="text-amber-500" />
            Mauzo kwa Aina
          </h3>
          <div className="flex flex-col items-center justify-center h-32 text-white/20">
            <p className="text-xs italic">Hakuna data ya mwezi huu</p>
          </div>
        </div>

        <div className="rounded-2xl border border-white/5 bg-[#111] p-6 min-h-[200px]">
          <h3 className="text-sm font-bold text-white flex items-center gap-2 mb-6">
            <TrendingUp size={16} className="text-amber-500" />
            Bidhaa Zinazoongoza
          </h3>
          <div className="flex flex-col items-center justify-center h-32 text-white/20">
            <p className="text-xs italic">Hakuna data bado</p>
          </div>
        </div>

        <div className="rounded-2xl border border-white/5 bg-[#111] p-6 min-h-[200px]">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-sm font-bold text-white flex items-center gap-2">
              <Clock size={16} className="text-purple-400" />
              Oda za Hivi Karibuni
            </h3>
            <Link to="/dashboard/orders" className="text-[10px] font-bold text-white/40 hover:text-white bg-white/5 px-2 py-1 rounded-md">Zote →</Link>
          </div>
          <div className="space-y-4">
            {recentOrders.length > 0 ? recentOrders.map((order) => (
              <div key={order.id} className="flex items-center justify-between p-3 rounded-xl bg-black/40 border border-white/5">
                <div>
                  <p className="text-xs font-bold text-white">{order.customer_name}</p>
                  <p className="text-[10px] text-white/40">{order.order_number}</p>
                </div>
                <div className="text-right">
                  <p className="text-xs font-bold text-gold">TSh {order.total?.toLocaleString()}</p>
                </div>
              </div>
            )) : (
              <div className="flex flex-col items-center justify-center h-32 text-white/20">
                <p className="text-xs italic">Hakuna oda bado</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

const StatCard = ({ title, value, icon }: { title: string, value: any, icon: React.ReactNode }) => (
  <div className="rounded-xl border border-white/5 bg-[#111] p-4 flex flex-col justify-between">
    <div className="flex items-center gap-3 mb-3">
      <div className="p-2 rounded-lg bg-white/5">{icon}</div>
      <div className="flex flex-col">
        <h3 className="text-lg font-bold text-white leading-none">{value}</h3>
        <p className="text-[9px] font-bold text-white/40 uppercase tracking-wider mt-1">{title}</p>
      </div>
    </div>
  </div>
);

const SettingsManagement = () => {
  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4 border-b border-white/5 pb-4">
        <Link to="/dashboard/settings/office" className="text-xs font-bold text-white/40 hover:text-white transition-all">Office</Link>
        <Link to="/dashboard/settings/app" className="text-xs font-bold text-white/40 hover:text-white transition-all">App</Link>
        <Link to="/dashboard/settings/banners" className="text-xs font-bold text-white/40 hover:text-white transition-all">Banners</Link>
        <Link to="/dashboard/settings/promo" className="text-xs font-bold text-white/40 hover:text-white transition-all">Promo Codes</Link>
        <Link to="/dashboard/settings/delivery" className="text-xs font-bold text-white/40 hover:text-white transition-all">Delivery</Link>
      </div>
      <Routes>
        <Route path="office" element={<OfficeSettings />} />
        <Route path="app" element={<AppSettings />} />
        <Route path="banners" element={<BannerManagement />} />
        <Route path="promo" element={<PromoCodeManagement />} />
        <Route path="delivery" element={<DeliveryManagement />} />
      </Routes>
    </div>
  );
};

const OfficeSettings = () => {
  const [settings, setSettings] = useState({ address: '', phone: '', email: '', working_hours: '' });
  useEffect(() => {
    const unsub = onSnapshot(doc(db, 'settings', 'office'), (snap) => {
      if (snap.exists()) setSettings(snap.data() as any);
    });
    return () => unsub();
  }, []);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await setDoc(doc(db, 'settings', 'office'), settings);
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, 'settings/office');
    }
  };

  return (
    <div className="max-w-xl space-y-6">
      <h3 className="text-xl font-bold text-white">Office Settings</h3>
      <form onSubmit={handleSave} className="space-y-4">
        <div className="space-y-2">
          <label className="text-xs font-bold text-white/40 uppercase">Address</label>
          <input value={settings.address} onChange={e => setSettings({...settings, address: e.target.value})} className="h-12 w-full rounded-xl border border-white/10 bg-black/40 px-4 text-white outline-none focus:border-gold" />
        </div>
        <div className="space-y-2">
          <label className="text-xs font-bold text-white/40 uppercase">Phone</label>
          <input value={settings.phone} onChange={e => setSettings({...settings, phone: e.target.value})} className="h-12 w-full rounded-xl border border-white/10 bg-black/40 px-4 text-white outline-none focus:border-gold" />
        </div>
        <div className="space-y-2">
          <label className="text-xs font-bold text-white/40 uppercase">Email</label>
          <input value={settings.email} onChange={e => setSettings({...settings, email: e.target.value})} className="h-12 w-full rounded-xl border border-white/10 bg-black/40 px-4 text-white outline-none focus:border-gold" />
        </div>
        <div className="space-y-2">
          <label className="text-xs font-bold text-white/40 uppercase">Working Hours</label>
          <input value={settings.working_hours} onChange={e => setSettings({...settings, working_hours: e.target.value})} className="h-12 w-full rounded-xl border border-white/10 bg-black/40 px-4 text-white outline-none focus:border-gold" />
        </div>
        <button type="submit" className="h-12 px-8 rounded-xl bg-gold font-bold text-black hover:scale-[1.02] transition-all">Save Settings</button>
      </form>
    </div>
  );
};

const AppSettings = () => {
  const [settings, setSettings] = useState({ is_open: true, whatsapp: '' });
  useEffect(() => {
    const unsub = onSnapshot(doc(db, 'settings', 'app'), (snap) => {
      if (snap.exists()) setSettings(snap.data() as any);
    });
    return () => unsub();
  }, []);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await setDoc(doc(db, 'settings', 'app'), settings);
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, 'settings/app');
    }
  };

  return (
    <div className="max-w-xl space-y-6">
      <h3 className="text-xl font-bold text-white">App Settings</h3>
      <form onSubmit={handleSave} className="space-y-4">
        <div className="flex items-center justify-between p-4 rounded-xl border border-white/10 bg-black/40">
          <div>
            <p className="text-sm font-bold text-white">Store Status</p>
            <p className="text-xs text-white/40">Toggle if the store is open for orders</p>
          </div>
          <button 
            type="button"
            onClick={() => setSettings({...settings, is_open: !settings.is_open})}
            className={cn("h-6 w-12 rounded-full transition-all relative", settings.is_open ? "bg-gold" : "bg-white/10")}
          >
            <div className={cn("absolute top-1 h-4 w-4 rounded-full bg-white transition-all", settings.is_open ? "right-1" : "left-1")} />
          </button>
        </div>
        <div className="space-y-2">
          <label className="text-xs font-bold text-white/40 uppercase">WhatsApp Number</label>
          <input value={settings.whatsapp} onChange={e => setSettings({...settings, whatsapp: e.target.value})} className="h-12 w-full rounded-xl border border-white/10 bg-black/40 px-4 text-white outline-none focus:border-gold" />
        </div>
        <button type="submit" className="h-12 px-8 rounded-xl bg-gold font-bold text-black hover:scale-[1.02] transition-all">Save Settings</button>
      </form>
    </div>
  );
};

const BannerManagement = () => {
  const [banners, setBanners] = useState<any[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingBanner, setEditingBanner] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    title: '',
    subtitle: '',
    badge: '',
    button_text: '',
    button_link: '',
    image_url: '',
    bg_color: '#0e0e0e',
    order: 0,
    is_active: true
  });

  useEffect(() => {
    const q = query(collection(db, 'banners'), orderBy('order', 'asc'));
    const unsub = onSnapshot(q, (snap) => {
      setBanners(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    });
    return () => unsub();
  }, []);

  const resetForm = () => {
    setFormData({
      title: '',
      subtitle: '',
      badge: '',
      button_text: '',
      button_link: '',
      image_url: '',
      bg_color: '#0e0e0e',
      order: 0,
      is_active: true
    });
    setEditingBanner(null);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      if (editingBanner) {
        await updateDoc(doc(db, 'banners', editingBanner.id), {
          ...formData,
          updated_at: serverTimestamp()
        });
      } else {
        await addDoc(collection(db, 'banners'), {
          ...formData,
          created_at: serverTimestamp()
        });
      }
      setIsModalOpen(false);
      resetForm();
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, editingBanner ? `banners/${editingBanner.id}` : 'banners');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm('Una uhakika unataka kufuta banner hii?')) return;
    try {
      await deleteDoc(doc(db, 'banners', id));
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, `banners/${id}`);
    }
  };

  const toggleVisibility = async (banner: any) => {
    try {
      await updateDoc(doc(db, 'banners', banner.id), {
        is_active: !banner.is_active
      });
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `banners/${banner.id}`);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-xl font-bold text-white flex items-center gap-2">
            <Image className="text-gold" size={24} /> Banner Slider
          </h3>
          <p className="text-xs text-white/40 mt-1">Banners zinaonekana kwenye slider ya juu ya duka. Ongeza URL ya picha, hariri, au futa.</p>
        </div>
        <button 
          onClick={() => { resetForm(); setIsModalOpen(true); }}
          className="flex items-center gap-2 rounded-xl bg-gold px-6 py-3 text-sm font-bold text-black hover:scale-105 transition-all shadow-lg shadow-gold/10"
        >
          <Plus size={18} /> Banner Mpya
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {banners.map(banner => (
          <div key={banner.id} className="group relative rounded-2xl overflow-hidden border border-white/10 bg-[#0a0a0a] flex flex-col">
            <div className="relative h-48 w-full bg-black/40 overflow-hidden">
              {banner.image_url ? (
                <img 
                  src={getDirectImageUrl(banner.image_url)} 
                  alt={banner.title} 
                  className={cn(
                    "h-full w-full object-cover transition-all duration-500 group-hover:scale-110",
                    !banner.is_active && "grayscale opacity-30"
                  )} 
                  referrerPolicy="no-referrer" 
                  onError={(e) => {
                    (e.target as HTMLImageElement).src = 'https://picsum.photos/seed/banner/800/400';
                  }}
                />
              ) : (
                <div className="h-full w-full flex flex-col items-center justify-center text-white/10">
                  <AlertCircle size={32} className="mb-2" />
                  <p className="text-[10px] uppercase font-bold">URL haifanyi kazi</p>
                </div>
              )}
              <div className="absolute top-4 right-4 flex gap-2">
                <div className={cn(
                  "px-2 py-1 rounded-md text-[9px] font-bold uppercase tracking-widest",
                  banner.is_active ? "bg-green-500/20 text-green-500" : "bg-red-500/20 text-red-500"
                )}>
                  {banner.is_active ? 'Inaonekana' : 'Imefichwa'}
                </div>
              </div>
            </div>
            
            <div className="p-5 flex-1 flex flex-col">
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-1">
                  {banner.badge && (
                    <span className="px-1.5 py-0.5 rounded bg-gold/10 text-gold text-[8px] font-bold uppercase">{banner.badge}</span>
                  )}
                  <h4 className="font-bold text-white truncate">{banner.title}</h4>
                </div>
                <p className="text-xs text-white/40 line-clamp-2 mb-3">{banner.subtitle || 'Hakuna maelezo...'}</p>
                <div className="flex items-center gap-2 text-[10px] text-white/20 truncate">
                  <ExternalLink size={10} />
                  <span className="truncate">{banner.image_url}</span>
                </div>
              </div>

              <div className="mt-6 pt-4 border-t border-white/5 grid grid-cols-3 gap-2">
                <button 
                  onClick={() => { setEditingBanner(banner); setFormData({...banner}); setIsModalOpen(true); }}
                  className="flex items-center justify-center gap-1.5 py-2 rounded-lg bg-white/5 text-[10px] font-bold text-white/60 hover:bg-white/10 hover:text-white transition-all"
                >
                  <Edit size={12} className="text-gold" /> Hariri
                </button>
                <button 
                  onClick={() => toggleVisibility(banner)}
                  className="flex items-center justify-center gap-1.5 py-2 rounded-lg bg-white/5 text-[10px] font-bold text-white/60 hover:bg-white/10 hover:text-white transition-all"
                >
                  {banner.is_active ? <><EyeOff size={12} className="text-amber-500" /> Ficha</> : <><Eye size={12} className="text-green-500" /> Onyesha</>}
                </button>
                <button 
                  onClick={() => handleDelete(banner.id)}
                  className="flex items-center justify-center gap-1.5 py-2 rounded-lg bg-white/5 text-[10px] font-bold text-white/60 hover:bg-red-500/10 hover:text-red-500 transition-all"
                >
                  <Trash2 size={12} /> Futa
                </button>
              </div>
            </div>
          </div>
        ))}

        {banners.length === 0 && (
          <div className="lg:col-span-3 flex flex-col items-center justify-center h-64 text-white/10 border-2 border-dashed border-white/5 rounded-3xl">
            <Image size={48} className="mb-4 opacity-5" />
            <p className="text-sm font-bold uppercase tracking-widest">Hakuna banners bado</p>
            <p className="text-xs mt-2">Bonyeza "+ Banner Mpya" kuanza</p>
          </div>
        )}
      </div>

      <AnimatePresence>
        {isModalOpen && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/90 backdrop-blur-sm">
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="relative w-full max-w-5xl rounded-3xl border border-white/10 bg-[#0a0a0a] shadow-2xl overflow-hidden"
            >
              <div className="flex items-center justify-between p-6 border-b border-white/5 bg-white/5">
                <h3 className="text-lg font-bold text-white flex items-center gap-2">
                  <Plus className="text-gold" size={20} /> {editingBanner ? 'Hariri Banner' : 'Banner Mpya'}
                </h3>
                <button onClick={() => setIsModalOpen(false)} className="p-2 rounded-xl hover:bg-white/5 text-white/40 hover:text-white transition-all">
                  <X size={20} />
                </button>
              </div>

              <form onSubmit={handleSave} className="p-8">
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                  {/* Preview Section */}
                  <div className="space-y-6">
                    <div className="aspect-video rounded-2xl border border-white/10 bg-black/40 overflow-hidden flex flex-col items-center justify-center relative group">
                      {formData.image_url ? (
                        <img 
                          src={getDirectImageUrl(formData.image_url)} 
                          alt="Preview" 
                          className="h-full w-full object-cover" 
                          referrerPolicy="no-referrer" 
                          onError={(e) => {
                            (e.target as HTMLImageElement).src = 'https://picsum.photos/seed/preview/800/400';
                          }}
                        />
                      ) : (
                        <div className="flex flex-col items-center text-white/20">
                          <Image size={48} className="mb-2" />
                          <p className="text-[10px] font-bold uppercase tracking-widest">Preview itaonekana</p>
                          <p className="text-[10px] uppercase">ukiweka URL</p>
                        </div>
                      )}
                    </div>

                    <div className="space-y-4">
                      <div className="space-y-2">
                        <label className="text-[10px] font-bold text-white/40 uppercase tracking-widest">URL ya Picha ya Banner *</label>
                        <div className="relative">
                          <input 
                            required
                            placeholder="https://i.imgur.com/xxxxx.jpg" 
                            value={formData.image_url} 
                            onChange={e => setFormData({...formData, image_url: e.target.value})} 
                            className="h-12 w-full rounded-xl border border-white/10 bg-black/40 pl-4 pr-12 text-xs text-white outline-none focus:border-gold" 
                          />
                          <div className="absolute right-4 top-1/2 -translate-y-1/2 text-white/20">
                            <Eye size={16} />
                          </div>
                        </div>
                        <p className="text-[10px] text-white/40 flex items-center gap-2">
                          <span className="text-gold">💡</span> Imgur: <span className="text-white/60">https://i.imgur.com/xxxxx.jpg</span>
                        </p>
                        <p className="text-[10px] text-white/40">
                          Drive: <span className="text-white/60">https://drive.google.com/uc?id=FILE_ID</span>
                        </p>
                      </div>

                      <div className="space-y-2">
                        <label className="text-[10px] font-bold text-white/40 uppercase tracking-widest">Rangi ya Background</label>
                        <div className="flex gap-3">
                          <div className="h-12 w-12 rounded-xl border border-white/10" style={{ backgroundColor: formData.bg_color }}></div>
                          <input 
                            value={formData.bg_color} 
                            onChange={e => setFormData({...formData, bg_color: e.target.value})} 
                            className="h-12 flex-1 rounded-xl border border-white/10 bg-black/40 px-4 text-xs font-mono text-white outline-none focus:border-gold" 
                          />
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Form Section */}
                  <div className="lg:col-span-2 space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div className="md:col-span-2 space-y-2">
                        <label className="text-[10px] font-bold text-white/40 uppercase tracking-widest">Kichwa cha Banner *</label>
                        <input 
                          required
                          placeholder="Collection Tz 2025" 
                          value={formData.title} 
                          onChange={e => setFormData({...formData, title: e.target.value})} 
                          className="h-12 w-full rounded-xl border border-white/10 bg-black/40 px-4 text-xs text-white outline-none focus:border-gold" 
                        />
                      </div>

                      <div className="md:col-span-2 space-y-2">
                        <label className="text-[10px] font-bold text-white/40 uppercase tracking-widest">Maelezo (Subtitle)</label>
                        <input 
                          placeholder="Kanzu za ubora wa kipekee..." 
                          value={formData.subtitle} 
                          onChange={e => setFormData({...formData, subtitle: e.target.value})} 
                          className="h-12 w-full rounded-xl border border-white/10 bg-black/40 px-4 text-xs text-white outline-none focus:border-gold" 
                        />
                      </div>

                      <div className="space-y-2">
                        <label className="text-[10px] font-bold text-white/40 uppercase tracking-widest">Badge (Lebo Ndogo)</label>
                        <input 
                          placeholder="Mkushanyoko 2026" 
                          value={formData.badge} 
                          onChange={e => setFormData({...formData, badge: e.target.value})} 
                          className="h-12 w-full rounded-xl border border-white/10 bg-black/40 px-4 text-xs text-white outline-none focus:border-gold" 
                        />
                      </div>

                      <div className="space-y-2">
                        <label className="text-[10px] font-bold text-white/40 uppercase tracking-widest">Maandishi ya Kitufe</label>
                        <input 
                          placeholder="Hapa / Angalia" 
                          value={formData.button_text} 
                          onChange={e => setFormData({...formData, button_text: e.target.value})} 
                          className="h-12 w-full rounded-xl border border-white/10 bg-black/40 px-4 text-xs text-white outline-none focus:border-gold" 
                        />
                      </div>

                      <div className="md:col-span-2 space-y-2">
                        <label className="text-[10px] font-bold text-white/40 uppercase tracking-widest">Link ya Kitufe</label>
                        <input 
                          placeholder="http://kanzu2.great-site.net/index.html" 
                          value={formData.button_link} 
                          onChange={e => setFormData({...formData, button_link: e.target.value})} 
                          className="h-12 w-full rounded-xl border border-white/10 bg-black/40 px-4 text-xs text-white outline-none focus:border-gold" 
                        />
                        <p className="text-[9px] font-bold text-gold italic">Acha tupu → itashuka kwenye bidhaa</p>
                      </div>

                      <div className="space-y-2">
                        <label className="text-[10px] font-bold text-white/40 uppercase tracking-widest">Mpangilio (Order)</label>
                        <div className="flex items-center gap-4">
                          <input 
                            type="number"
                            value={formData.order} 
                            onChange={e => setFormData({...formData, order: parseInt(e.target.value) || 0})} 
                            className="h-12 flex-1 rounded-xl border border-white/10 bg-black/40 px-4 text-xs text-white outline-none focus:border-gold" 
                          />
                          <label className="flex items-center gap-2 cursor-pointer group">
                            <input 
                              type="checkbox" 
                              checked={formData.is_active} 
                              onChange={e => setFormData({...formData, is_active: e.target.checked})}
                              className="hidden"
                            />
                            <div className={cn(
                              "h-5 w-5 rounded border border-white/20 flex items-center justify-center transition-all",
                              formData.is_active ? "bg-gold border-gold text-black" : "bg-black/40"
                            )}>
                              {formData.is_active && <Check size={14} strokeWidth={3} />}
                            </div>
                            <span className="text-[10px] font-bold text-white/40 group-hover:text-white transition-all">Hai (Inaonekana)</span>
                          </label>
                        </div>
                      </div>
                    </div>

                    <button 
                      type="submit" 
                      disabled={loading}
                      className="h-14 w-full rounded-2xl bg-gold font-bold text-black hover:scale-[1.01] transition-all flex items-center justify-center gap-2 shadow-xl shadow-gold/20 disabled:opacity-50 disabled:cursor-not-allowed mt-4"
                    >
                      {loading ? 'Inahifadhi...' : <><Smartphone size={20} /> HIFADHI BANNER</>}
                    </button>
                  </div>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};

const PromoCodeManagement = () => {
  const [codes, setCodes] = useState<any[]>([]);
  const [newCode, setNewCode] = useState({ code: '', type: 'percentage', value: 0 });

  useEffect(() => {
    const unsub = onSnapshot(collection(db, 'promo_codes'), (snap) => {
      setCodes(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    });
    return () => unsub();
  }, []);

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCode.code) return;
    try {
      await addDoc(collection(db, 'promo_codes'), { ...newCode, created_at: serverTimestamp() });
      setNewCode({ code: '', type: 'percentage', value: 0 });
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, 'promo_codes');
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await deleteDoc(doc(db, 'promo_codes', id));
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, `promo_codes/${id}`);
    }
  };

  return (
    <div className="space-y-6">
      <h3 className="text-xl font-bold text-white">Promo Codes</h3>
      <form onSubmit={handleAdd} className="grid grid-cols-1 md:grid-cols-4 gap-4 p-6 rounded-2xl border border-white/10 bg-white/5">
        <input placeholder="CODE" value={newCode.code} onChange={e => setNewCode({...newCode, code: e.target.value.toUpperCase()})} className="h-12 rounded-xl border border-white/10 bg-black/40 px-4 text-white outline-none focus:border-gold" />
        <select value={newCode.type} onChange={e => setNewCode({...newCode, type: e.target.value})} className="h-12 rounded-xl border border-white/10 bg-black/40 px-4 text-white outline-none focus:border-gold">
          <option value="percentage">Percentage (%)</option>
          <option value="fixed">Fixed Amount (TSh)</option>
        </select>
        <input type="number" placeholder="Value" value={newCode.value} onChange={e => setNewCode({...newCode, value: Number(e.target.value)})} className="h-12 rounded-xl border border-white/10 bg-black/40 px-4 text-white outline-none focus:border-gold" />
        <button type="submit" className="h-12 rounded-xl bg-gold font-bold text-black hover:scale-[1.02] transition-all flex items-center justify-center gap-2">
          <Plus size={18} /> Add Code
        </button>
      </form>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {codes.map(code => (
          <div key={code.id} className="p-4 rounded-xl border border-white/10 bg-[#111] flex items-center justify-between">
            <div>
              <p className="font-bold text-gold">{code.code}</p>
              <p className="text-xs text-white/40">{code.type === 'percentage' ? `${code.value}% Off` : `TSh ${code.value.toLocaleString()} Off`}</p>
            </div>
            <button onClick={() => handleDelete(code.id)} className="p-2 rounded-lg bg-red-500/10 text-red-500 hover:bg-red-500 hover:text-white transition-all">
              <Trash2 size={16} />
            </button>
          </div>
        ))}
      </div>
    </div>
  );
};

const DeliveryManagement = () => {
  const [zones, setZones] = useState<any[]>([]);
  const [newZone, setNewZone] = useState({ name: '', price: 0 });

  useEffect(() => {
    const unsub = onSnapshot(collection(db, 'delivery_zones'), (snap) => {
      setZones(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    });
    return () => unsub();
  }, []);

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newZone.name) return;
    try {
      await addDoc(collection(db, 'delivery_zones'), { ...newZone, created_at: serverTimestamp() });
      setNewZone({ name: '', price: 0 });
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, 'delivery_zones');
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await deleteDoc(doc(db, 'delivery_zones', id));
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, `delivery_zones/${id}`);
    }
  };

  return (
    <div className="space-y-6">
      <h3 className="text-xl font-bold text-white">Delivery Zones</h3>
      <form onSubmit={handleAdd} className="grid grid-cols-1 md:grid-cols-3 gap-4 p-6 rounded-2xl border border-white/10 bg-white/5">
        <input placeholder="Zone Name" value={newZone.name} onChange={e => setNewZone({...newZone, name: e.target.value})} className="h-12 rounded-xl border border-white/10 bg-black/40 px-4 text-white outline-none focus:border-gold" />
        <input type="number" placeholder="Price (TSh)" value={newZone.price} onChange={e => setNewZone({...newZone, price: Number(e.target.value)})} className="h-12 rounded-xl border border-white/10 bg-black/40 px-4 text-white outline-none focus:border-gold" />
        <button type="submit" className="h-12 rounded-xl bg-gold font-bold text-black hover:scale-[1.02] transition-all flex items-center justify-center gap-2">
          <Plus size={18} /> Add Zone
        </button>
      </form>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {zones.map(zone => (
          <div key={zone.id} className="p-4 rounded-xl border border-white/10 bg-[#111] flex items-center justify-between">
            <div>
              <p className="font-bold text-white">{zone.name}</p>
              <p className="text-xs text-gold">TSh {zone.price.toLocaleString()}</p>
            </div>
            <button onClick={() => handleDelete(zone.id)} className="p-2 rounded-lg bg-red-500/10 text-red-500 hover:bg-red-500 hover:text-white transition-all">
              <Trash2 size={16} />
            </button>
          </div>
        ))}
      </div>
    </div>
  );
};

const POSManagement = () => {
  const [products, setProducts] = useState<any[]>([]);
  const [customers, setCustomers] = useState<any[]>([]);
  const [promoCodes, setPromoCodes] = useState<any[]>([]);
  const [cart, setCart] = useState<any[]>([]);
  const [search, setSearch] = useState('');
  const [selectedCustomer, setSelectedCustomer] = useState<any>(null);
  const [promoCode, setPromoCode] = useState('');
  const [appliedPromo, setAppliedPromo] = useState<any>(null);
  const [usePoints, setUsePoints] = useState(false);

  useEffect(() => {
    const unsubProds = onSnapshot(collection(db, 'products'), (snap) => {
      setProducts(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    });
    const unsubCusts = onSnapshot(collection(db, 'customers'), (snap) => {
      setCustomers(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    });
    const unsubPromo = onSnapshot(collection(db, 'promo_codes'), (snap) => {
      setPromoCodes(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    });
    return () => { unsubProds(); unsubCusts(); unsubPromo(); };
  }, []);

  const addToCart = (product: any) => {
    const existing = cart.find(item => item.id === product.id);
    if (existing) {
      setCart(cart.map(item => item.id === product.id ? { ...item, quantity: item.quantity + 1 } : item));
    } else {
      setCart([...cart, { ...product, quantity: 1 }]);
    }
  };

  const removeFromCart = (id: string) => {
    setCart(cart.filter(item => item.id !== id));
  };

  const subtotal = cart.reduce((acc, item) => acc + (item.price * item.quantity), 0);
  let discount = 0;
  if (appliedPromo) {
    if (appliedPromo.type === 'percentage') {
      discount = (subtotal * appliedPromo.value) / 100;
    } else {
      discount = appliedPromo.value;
    }
  }

  const pointsValue = usePoints && selectedCustomer ? Math.min(selectedCustomer.loyalty_points || 0, subtotal - discount) : 0;
  const total = Math.max(0, subtotal - discount - pointsValue);

  const applyPromo = () => {
    const promo = promoCodes.find(p => p.code.toUpperCase() === promoCode.toUpperCase() && p.active);
    if (promo) {
      setAppliedPromo(promo);
      setPromoCode('');
    } else {
      alert('Invalid or inactive promo code');
    }
  };

  const generateReceipt = (order: any) => {
    const doc = new jsPDF({
      unit: 'mm',
      format: [80, 150]
    });
    
    doc.setFontSize(14);
    doc.text('KANZU PALACE', 40, 10, { align: 'center' });
    doc.setFontSize(8);
    doc.text('Mlimani City, Dar es Salaam', 40, 15, { align: 'center' });
    doc.text('Tel: +255 7XX XXX XXX', 40, 18, { align: 'center' });
    
    doc.line(5, 22, 75, 22);
    doc.text(`Order: ${order.order_number}`, 5, 27);
    doc.text(`Date: ${new Date().toLocaleString()}`, 5, 31);
    doc.text(`Customer: ${order.customer_name}`, 5, 35);
    doc.line(5, 38, 75, 38);
    
    let y = 43;
    order.items.forEach((item: any) => {
      doc.text(`${item.name} x${item.quantity}`, 5, y);
      doc.text(`TSh ${(item.price * item.quantity).toLocaleString()}`, 75, y, { align: 'right' });
      y += 5;
    });
    
    doc.line(5, y + 2, 75, y + 2);
    if (discount > 0) {
      doc.text('Discount:', 5, y + 7);
      doc.text(`-TSh ${discount.toLocaleString()}`, 75, y + 7, { align: 'right' });
      y += 5;
    }
    if (pointsValue > 0) {
      doc.text('Points Used:', 5, y + 7);
      doc.text(`-TSh ${pointsValue.toLocaleString()}`, 75, y + 7, { align: 'right' });
      y += 5;
    }
    doc.setFontSize(10);
    doc.text('TOTAL:', 5, y + 8);
    doc.text(`TSh ${order.total.toLocaleString()}`, 75, y + 8, { align: 'right' });
    
    doc.setFontSize(8);
    doc.text('Asante kwa manunuzi!', 40, y + 15, { align: 'center' });
    doc.text('Karibu tena Kanzu Palace', 40, y + 18, { align: 'center' });
    
    doc.save(`Receipt_${order.order_number}.pdf`);
  };

  const handleCheckout = async () => {
    if (cart.length === 0) return;
    try {
      const orderData = {
        customer_name: selectedCustomer?.name || 'Walk-in Customer',
        customer_phone: selectedCustomer?.phone || 'N/A',
        customer_id: selectedCustomer?.id || null,
        items: cart.map(item => ({
          id: item.id,
          name: item.name,
          price: item.price,
          quantity: item.quantity,
          image_url: item.image_url,
          loyalty_points_value: item.loyalty_points_value || 10
        })),
        subtotal,
        discount,
        points_used: pointsValue,
        total,
        order_status: 'Imekamilika',
        payment_status: 'Imelipwa',
        payment_method: 'Cash (POS)',
        order_number: `KP-${Date.now().toString().slice(-6)}`,
        created_at: serverTimestamp(),
        type: 'pos'
      };
      
      await addDoc(collection(db, 'orders'), orderData);

      // Update Customer Points if applicable
      if (selectedCustomer) {
        const customerRef = doc(db, 'customers', selectedCustomer.id);
        const newPoints = (selectedCustomer.loyalty_points || 0) - pointsValue + (orderData.items.reduce((acc, i) => acc + (i.loyalty_points_value * i.quantity), 0));
        await updateDoc(customerRef, {
          loyalty_points: Math.max(0, newPoints),
          total_spent: (selectedCustomer.total_spent || 0) + total,
          order_count: (selectedCustomer.order_count || 0) + 1
        });
      }

      // Update Stock
      for (const item of cart) {
        const productRef = doc(db, 'products', item.id);
        const productSnap = await getDoc(productRef);
        if (productSnap.exists()) {
          const currentStock = productSnap.data().stock_quantity || 0;
          await updateDoc(productRef, {
            stock_quantity: Math.max(0, currentStock - item.quantity),
            in_stock: (currentStock - item.quantity) > 0
          });
        }
      }

      generateReceipt(orderData);
      setCart([]);
      setSelectedCustomer(null);
      setAppliedPromo(null);
      setUsePoints(false);
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, 'orders');
    }
  };

  const filteredProducts = products.filter(p => p.name.toLowerCase().includes(search.toLowerCase()));

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 h-[calc(100vh-12rem)]">
      <div className="lg:col-span-2 flex flex-col gap-6">
        <div className="relative">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-white/40" size={18} />
          <input 
            placeholder="Search products..." 
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="h-12 w-full rounded-xl border border-white/10 bg-black/40 pl-12 pr-4 text-white outline-none focus:border-gold" 
          />
        </div>
        <div className="flex-1 overflow-y-auto grid grid-cols-2 md:grid-cols-3 gap-4 custom-scrollbar pr-2">
          {filteredProducts.map(product => (
            <button 
              key={product.id} 
              onClick={() => addToCart(product)}
              className="group text-left rounded-2xl border border-white/5 bg-[#111] overflow-hidden hover:border-gold/50 transition-all"
            >
              <img src={product.image_url} alt={product.name} className="h-32 w-full object-cover opacity-60 group-hover:opacity-100 transition-all" referrerPolicy="no-referrer" />
              <div className="p-3">
                <p className="text-xs font-bold text-white truncate">{product.name}</p>
                <p className="text-[10px] font-bold text-gold mt-1">TSh {product.price.toLocaleString()}</p>
              </div>
            </button>
          ))}
        </div>
      </div>

      <div className="rounded-3xl border border-white/10 bg-[#0a0a0a] flex flex-col overflow-hidden">
        <div className="p-6 border-b border-white/5">
          <h3 className="text-lg font-bold text-white flex items-center gap-2">
            <ShoppingBag size={20} className="text-gold" />
            Current Order
          </h3>
        </div>
        <div className="flex-1 overflow-y-auto p-6 space-y-4 custom-scrollbar">
          {cart.map(item => (
            <div key={item.id} className="flex items-center justify-between gap-4">
              <div className="flex-1">
                <p className="text-xs font-bold text-white">{item.name}</p>
                <p className="text-[10px] text-white/40">{item.quantity} x TSh {item.price.toLocaleString()}</p>
              </div>
              <div className="flex items-center gap-3">
                <p className="text-xs font-bold text-gold">TSh {(item.price * item.quantity).toLocaleString()}</p>
                <button onClick={() => removeFromCart(item.id)} className="text-red-500/40 hover:text-red-500">
                  <X size={14} />
                </button>
              </div>
            </div>
          ))}
          {cart.length === 0 && (
            <div className="h-full flex flex-col items-center justify-center text-white/20 italic text-xs">
              <p>Cart is empty</p>
            </div>
          )}
        </div>
        <div className="p-6 bg-white/5 border-t border-white/5 space-y-4">
          <div className="space-y-2">
            <select 
              value={selectedCustomer?.id || ''} 
              onChange={e => setSelectedCustomer(customers.find(c => c.id === e.target.value))}
              className="h-10 w-full rounded-lg border border-white/10 bg-black/40 px-4 text-xs text-white outline-none focus:border-gold"
            >
              <option value="">Select Customer (Walk-in)</option>
              {customers.map(c => <option key={c.id} value={c.id}>{c.name} ({c.phone})</option>)}
            </select>
            
            {selectedCustomer && (
              <div className="flex items-center justify-between p-2 rounded-lg bg-gold/5 border border-gold/10">
                <div className="flex items-center gap-2">
                  <Gift size={14} className="text-gold" />
                  <span className="text-[10px] font-bold text-gold">{selectedCustomer.loyalty_points || 0} Points Available</span>
                </div>
                <button 
                  onClick={() => setUsePoints(!usePoints)}
                  className={cn(
                    "px-2 py-1 rounded text-[10px] font-bold uppercase transition-all",
                    usePoints ? "bg-gold text-black" : "bg-white/5 text-white/40"
                  )}
                >
                  {usePoints ? 'Redeeming' : 'Redeem'}
                </button>
              </div>
            )}

            <div className="flex gap-2">
              <input 
                placeholder="Promo Code" 
                value={promoCode} 
                onChange={e => setPromoCode(e.target.value)} 
                className="h-10 flex-1 rounded-lg border border-white/10 bg-black/40 px-4 text-xs text-white outline-none focus:border-gold" 
              />
              <button onClick={applyPromo} className="px-4 rounded-lg bg-white/5 text-xs font-bold text-white hover:bg-white/10">Apply</button>
            </div>
            {appliedPromo && (
              <div className="flex items-center justify-between p-2 rounded-lg bg-green-500/5 border border-green-500/10">
                <span className="text-[10px] font-bold text-green-500">Promo: {appliedPromo.code} (-{appliedPromo.type === 'percentage' ? `${appliedPromo.value}%` : `TSh ${appliedPromo.value}`})</span>
                <button onClick={() => setAppliedPromo(null)} className="text-green-500 hover:scale-110"><X size={12} /></button>
              </div>
            )}
          </div>
          
          <div className="space-y-1 pt-2 border-t border-white/5">
            <div className="flex items-center justify-between text-[10px] text-white/40">
              <p>Subtotal</p>
              <p>TSh {subtotal.toLocaleString()}</p>
            </div>
            {discount > 0 && (
              <div className="flex items-center justify-between text-[10px] text-green-500">
                <p>Discount</p>
                <p>-TSh {discount.toLocaleString()}</p>
              </div>
            )}
            {pointsValue > 0 && (
              <div className="flex items-center justify-between text-[10px] text-gold">
                <p>Points Redeemed</p>
                <p>-TSh {pointsValue.toLocaleString()}</p>
              </div>
            )}
            <div className="flex items-center justify-between pt-2">
              <p className="text-sm font-bold text-white">Total</p>
              <p className="text-xl font-bold text-gold">TSh {total.toLocaleString()}</p>
            </div>
          </div>
          
          <button 
            onClick={handleCheckout}
            disabled={cart.length === 0}
            className="w-full h-12 rounded-xl bg-gold font-bold text-black hover:scale-[1.02] transition-all disabled:opacity-50 disabled:hover:scale-100"
          >
            Complete Order
          </button>
        </div>
      </div>
    </div>
  );
};

const BroadcastManagement = () => {
  const [message, setMessage] = useState('');
  const [customers, setCustomers] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedGroup, setSelectedGroup] = useState('Wote');

  const templates = [
    {
      id: 'new_products',
      label: 'Bidhaa Mpya',
      icon: '👘',
      text: `Habari {jina}! 🌟\n\n👘 *Kanzu Palace* — Bidhaa MPYA zimewadia!\n\nMkusanyiko wetu mpya umeanza kuuzwa leo. Kanzu za kipekee kwa ajili ya harusi, Eid, na sherehe zote.\n\n• Ubora wa juu\n• Bei ya haki\n• Saizi zote zinapatikana\n\n🔗 Angalia sasa: kanzu2.great-site.net\n\nUsikose! Stock ni ndogo. 🏃‍♂️`
    },
    {
      id: 'eid',
      label: 'Matangazo ya Eid',
      icon: '🌙',
      text: `Eid Mubarak {jina}! 🌙✨\n\n*Kanzu Palace* inakutakia Eid njema yenye furaha na baraka!\n\n🕌 Kanzu za Eid ziko tayari — za Baraza, za Msikiti, na za Sherehe.\n\nNunua leo upate:\n✅ Bei za Eid (punguzo maalum)\n✅ Delivery ya haraka\n✅ Ubora wa kweli wa Swahili\n\n🔗 kanzu2.great-site.net\n\nTukutazamie! Eid Mubarak! 🎊`
    },
    {
      id: 'wedding',
      label: 'Season ya Harusi',
      icon: '💍',
      text: `Habari {jina}! 💍\n\n*Kanzu Palace* iko tayari kwa Season ya Harusi!\n\nKama una harusi inayokuja — au unahudhuria harusi — kanzu zetu za harusi ndizo jibu.\n\n👘 Kanzu za Baraza\n👘 Kanzu za Akad\n👘 Kanzu za Walima\n✂️ Custom — tunashona kwa vipimo vyako\n\nHaggle? Hatuna — bei zetu ni sahihi na za haki.\n\n📱 Agiza: kanzu2.great-site.net\nAu wasiliana nasi moja kwa moja!`
    },
    {
      id: 'restock',
      label: 'Hisa Imerejea',
      icon: '📦',
      text: `Habari {jina}! 📦\n\n*Kanzu Palace* — HABARI NJEMA!\n\nBidhaa zilizokwisha zimewadia tena! Stock mpya iko tayari sasa hivi.\n\nHaraka — mara ya mwisho ilikwisha haraka sana.\n\n🔗 Angalia hisa mpya: kanzu2.great-site.net\n\n📞 Maswali? Jibu ujumbe huu!\n\nAsante kwa kuendelea kutuamini! 🙏`
    }
  ];

  useEffect(() => {
    const unsub = onSnapshot(collection(db, 'customers'), (snap) => {
      setCustomers(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    });
    return () => unsub();
  }, []);

  const handleSend = () => {
    if (!message) return;
    setLoading(true);
    // In a real app, this would call a backend API to send bulk WhatsApp messages.
    // For this demo, we'll simulate it by showing how many customers would receive it.
    setTimeout(() => {
      alert(`Broadcast message sent to ${customers.length} customers!`);
      setMessage('');
      setLoading(false);
    }, 1500);
  };

  const previewMessage = message.replace(/{jina}/g, 'Juma');

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
      <div className="space-y-6">
        <div className="rounded-2xl border border-white/10 bg-white/5 p-6">
          <h3 className="text-[10px] font-bold text-white/30 uppercase tracking-widest mb-4">TEMPLETI YA HARAKA</h3>
          <div className="flex flex-wrap gap-2">
            {templates.map(t => (
              <button 
                key={t.id}
                onClick={() => setMessage(t.text)}
                className="flex items-center gap-2 rounded-xl bg-white/5 px-3 py-2 text-xs font-bold text-white hover:bg-white/10 transition-all border border-white/5"
              >
                <span>{t.icon}</span> {t.label}
              </button>
            ))}
            <button 
              onClick={() => setMessage('')}
              className="flex items-center gap-2 rounded-xl bg-white/5 px-3 py-2 text-xs font-bold text-white/40 hover:bg-white/10 transition-all border border-white/5"
            >
              <Edit size={14} /> Tunga Mwenyewe
            </button>
          </div>
        </div>

        <div className="rounded-2xl border border-white/10 bg-white/5 p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-[10px] font-bold text-white/30 uppercase tracking-widest">UJUMBE <span className="lowercase text-white/20">(tumia {`{jina}`} kwa jina la mteja)</span></h3>
            <span className="text-[10px] text-white/20">{message.length} herufi</span>
          </div>
          <textarea 
            rows={10} 
            value={message}
            onChange={e => setMessage(e.target.value)}
            placeholder="Anza kuandika ujumbe hapa..."
            className="w-full rounded-xl border border-white/10 bg-black/40 p-4 text-sm text-white outline-none focus:border-gold resize-none custom-scrollbar" 
          />
          <div className="mt-2 flex justify-end">
            <p className="text-[10px] text-white/20">Variables: <span className="text-gold">{`{jina}`}</span></p>
          </div>
        </div>

        <div className="rounded-2xl border border-white/10 bg-white/5 p-6">
          <h3 className="text-[10px] font-bold text-white/30 uppercase tracking-widest mb-4">PREVIEW YA WA</h3>
          <div className="rounded-2xl bg-[#075e54]/20 border border-[#075e54]/30 p-4 relative overflow-hidden">
            <div className="absolute top-0 left-0 w-1 h-full bg-[#25d366]" />
            <div className="whitespace-pre-wrap text-sm text-white/90 font-sans">
              {previewMessage || <span className="text-white/20 italic">Andika ujumbe kuona preview...</span>}
            </div>
            {previewMessage && (
              <div className="mt-2 flex justify-end">
                <span className="text-[10px] text-white/30">12:00 PM</span>
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="space-y-6">
        <div className="rounded-2xl border border-white/10 bg-white/5 p-6">
          <h3 className="text-[10px] font-bold text-white/30 uppercase tracking-widest mb-4">CHAGUA KIKUNDI</h3>
          <div className="flex flex-wrap gap-2 mb-6">
            {['Wote', 'Wateja Wapya', 'Wateja wa Kanzu', 'Wateja wa Harusi'].map(g => (
              <button 
                key={g}
                onClick={() => setSelectedGroup(g)}
                className={cn(
                  "px-3 py-1.5 rounded-full text-[10px] font-bold uppercase tracking-wider transition-all",
                  selectedGroup === g ? "bg-gold text-black" : "bg-white/5 text-white/40 hover:text-white"
                )}
              >
                {g}
              </button>
            ))}
          </div>

          <div className="relative mb-4">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-white/20" size={14} />
            <input 
              placeholder="Tafuta jina au simu..." 
              className="h-10 w-full rounded-lg border border-white/5 bg-black/40 pl-10 pr-4 text-xs text-white outline-none focus:border-gold/30"
            />
          </div>

          <div className="space-y-2 max-h-[400px] overflow-y-auto custom-scrollbar pr-2">
            {customers.map(c => (
              <div key={c.id} className="flex items-center justify-between p-3 rounded-xl bg-white/[0.02] border border-white/5">
                <div className="flex items-center gap-3">
                  <div className="h-8 w-8 rounded-full bg-gold/10 flex items-center justify-center text-gold text-[10px] font-bold">
                    {c.name?.[0].toUpperCase()}
                  </div>
                  <div>
                    <p className="text-xs font-bold text-white">{c.name}</p>
                    <p className="text-[10px] text-white/40">{c.phone}</p>
                  </div>
                </div>
                <input type="checkbox" defaultChecked className="h-4 w-4 rounded border-white/10 bg-black/40 text-gold focus:ring-gold" />
              </div>
            ))}
            {customers.length === 0 && (
              <p className="text-center py-8 text-xs text-white/20 italic">Hakuna wateja bado</p>
            )}
          </div>
        </div>

        <div className="rounded-2xl bg-gold p-6 text-black">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-bold uppercase tracking-widest text-xs">Jumla ya Wapokezi</h3>
            <span className="text-2xl font-black">{customers.length}</span>
          </div>
          <p className="text-[10px] font-medium opacity-60 mb-6">Kila ujumbe utafunguliwa kwenye WhatsApp kwa wakati mmoja mmoja kwa usalama zaidi.</p>
          <button 
            onClick={handleSend}
            disabled={loading || !message}
            className="w-full h-14 rounded-xl bg-black text-gold font-bold flex items-center justify-center gap-2 hover:scale-[1.02] active:scale-[0.98] transition-all disabled:opacity-50"
          >
            {loading ? 'Inatuma...' : <><Send size={18} /> Tuma kwa Wote Waliochaguliwa</>}
          </button>
        </div>
      </div>
    </div>
  );
};

const CalendarView = () => {
  const [deadlines, setDeadlines] = useState<any[]>([]);

  useEffect(() => {
    const q = query(
      collection(db, 'orders'), 
      where('deadline', '!=', null),
      orderBy('deadline', 'asc')
    );
    const unsubscribe = onSnapshot(q, (snapshot) => {
      setDeadlines(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, 'orders');
    });
    return () => unsubscribe();
  }, []);

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'Imekamilika': return 'text-green-500 bg-green-500/10';
      case 'Inashonwa': return 'text-amber-500 bg-amber-500/10';
      default: return 'text-white/40 bg-white/5';
    }
  };

  return (
    <div className="space-y-6">
      <h3 className="text-xl font-bold text-white">Order Deadlines</h3>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {deadlines.map((order) => {
          const deadlineDate = order.deadline?.toDate();
          const isOverdue = deadlineDate && deadlineDate < new Date() && order.status !== 'Imekamilika';
          
          return (
            <div key={order.id} className={cn(
              "rounded-2xl border p-6 transition-all",
              isOverdue ? "border-red-500/50 bg-red-500/5" : "border-white/10 bg-white/5"
            )}>
              <div className="flex items-center justify-between mb-4">
                <span className="text-[10px] font-bold text-white/40 uppercase tracking-widest">Order #{order.order_number}</span>
                <span className={cn("px-2 py-1 rounded-full text-[10px] font-bold uppercase", getStatusColor(order.status))}>
                  {order.status}
                </span>
              </div>
              <h4 className="font-bold text-white mb-1">{order.customer_name}</h4>
              <p className="text-xs text-white/40 mb-4">{order.items?.map((i: any) => i.name).join(', ')}</p>
              
              <div className="flex items-center justify-between pt-4 border-t border-white/5">
                <div className="flex items-center gap-2 text-xs">
                  <Clock size={14} className={isOverdue ? "text-red-500" : "text-gold"} />
                  <span className={isOverdue ? "text-red-500 font-bold" : "text-white/60"}>
                    {deadlineDate?.toLocaleDateString('sw-TZ', { day: 'numeric', month: 'short' })}
                  </span>
                </div>
                {order.assigned_tailor_name && (
                  <div className="flex items-center gap-2 text-[10px] text-white/40">
                    <User size={12} />
                    <span>{order.assigned_tailor_name}</span>
                  </div>
                )}
              </div>
            </div>
          );
        })}
        {deadlines.length === 0 && (
          <div className="col-span-full py-12 text-center text-white/20 italic">
            Hakuna deadlines zilizowekwa bado.
          </div>
        )}
      </div>
    </div>
  );
};

const ReportsManagement = () => {
  const [orders, setOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const unsub = onSnapshot(collection(db, 'orders'), (snap) => {
      setOrders(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    });
    return () => unsub();
  }, []);

  const generatePDF = () => {
    setLoading(true);
    const doc = new jsPDF();
    const now = new Date();
    const monthYear = now.toLocaleDateString('sw-TZ', { month: 'long', year: 'numeric' });
    
    // --- Header ---
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(24);
    doc.setTextColor(20, 20, 20);
    doc.text('Kanzu Palace', 14, 20);
    
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(10);
    doc.setTextColor(120, 120, 120);
    doc.text(`Ripoti ya Mauzo – ${monthYear}`, 14, 28);
    
    doc.setFontSize(8);
    doc.text(`Imetolewa: ${now.toLocaleDateString()} ${now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`, 196, 20, { align: 'right' });
    
    // Gold Line
    doc.setDrawColor(201, 168, 76);
    doc.setLineWidth(0.5);
    doc.line(14, 35, 196, 35);
    
    // --- Summary Cards ---
    const totalRevenue = orders.reduce((acc, o) => acc + (o.total || 0), 0);
    const pendingOrders = orders.filter(o => o.order_status === 'Inasubiri Uthibitisho').length;
    const completedOrders = orders.filter(o => ['Imekamilika', 'Imelipwa', 'Imefikia'].includes(o.order_status)).length;
    
    const cardWidth = 43;
    const cardHeight = 25;
    const cardY = 45;
    
    const drawCard = (x: number, title: string, value: string, color: [number, number, number]) => {
      doc.setDrawColor(230, 230, 230);
      doc.setFillColor(252, 252, 252);
      doc.roundedRect(x, cardY, cardWidth, cardHeight, 3, 3, 'FD');
      
      doc.setFontSize(14);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(color[0], color[1], color[2]);
      doc.text(value, x + cardWidth / 2, cardY + 12, { align: 'center' });
      
      doc.setFontSize(8);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(100, 100, 100);
      doc.text(title, x + cardWidth / 2, cardY + 20, { align: 'center' });
    };
    
    drawCard(14, 'Jumla Oda', orders.length.toString(), [201, 168, 76]);
    drawCard(60, 'Mapato Halisi', `TSh ${totalRevenue.toLocaleString()}`, [34, 197, 94]);
    drawCard(106, 'Zinasubiri', pendingOrders.toString(), [245, 158, 11]);
    drawCard(152, 'Zimekamilika', completedOrders.toString(), [59, 130, 246]);
    
    // --- Top Products ---
    doc.setFontSize(12);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(20, 20, 20);
    doc.text('🏆 Bidhaa Zinazoongoza', 14, 85);
    
    const productSales: Record<string, { qty: number, revenue: number }> = {};
    orders.forEach(o => {
      o.items?.forEach((item: any) => {
        if (!productSales[item.name]) productSales[item.name] = { qty: 0, revenue: 0 };
        productSales[item.name].qty += item.quantity;
        productSales[item.name].revenue += (item.price * item.quantity);
      });
    });
    
    const topProducts = Object.entries(productSales)
      .sort((a, b) => b[1].qty - a[1].qty)
      .slice(0, 5)
      .map(([name, data], idx) => [
        `${idx + 1}. ${name}`,
        data.qty.toString(),
        `TSh ${data.revenue.toLocaleString()}`
      ]);
      
    autoTable(doc, {
      startY: 90,
      head: [['Bidhaa', 'Oda', 'Mapato']],
      body: topProducts,
      theme: 'striped',
      headStyles: { fillColor: [26, 26, 26], textColor: [255, 255, 255], fontSize: 9 },
      bodyStyles: { fontSize: 8 },
      columnStyles: {
        1: { halign: 'center' },
        2: { halign: 'right' }
      }
    });
    
    // --- Order List ---
    const finalY = (doc as any).lastAutoTable.finalY + 15;
    doc.setFontSize(12);
    doc.setFont('helvetica', 'bold');
    doc.text(`📦 Orodha ya Oda (${orders.length})`, 14, finalY);
    
    const tableData = orders.map((o, idx) => [
      (idx + 1).toString(),
      o.customer_name || 'N/A',
      o.items?.map((i: any) => i.name).join(', ').substring(0, 30) + (o.items?.length > 1 ? '...' : ''),
      `TSh ${o.total?.toLocaleString()}`,
      o.order_status || 'N/A',
      o.created_at?.toDate() ? new Date(o.created_at.toDate()).toLocaleDateString() : 'N/A'
    ]);
    
    autoTable(doc, {
      startY: finalY + 5,
      head: [['#', 'Mteja', 'Bidhaa', 'Kiasi', 'Hali', 'Tarehe']],
      body: tableData,
      theme: 'striped',
      headStyles: { fillColor: [26, 26, 26], textColor: [255, 255, 255], fontSize: 9 },
      bodyStyles: { fontSize: 8 },
      columnStyles: {
        0: { cellWidth: 10 },
        3: { halign: 'right', fontStyle: 'bold' },
        4: { halign: 'center' }
      },
      didParseCell: (data) => {
        if (data.section === 'body' && data.column.index === 4) {
          const status = data.cell.raw as string;
          if (['Imekamilika', 'Imelipwa', 'Imefikia'].includes(status)) {
            data.cell.styles.textColor = [34, 197, 94];
          } else if (status === 'Inasubiri Uthibitisho') {
            data.cell.styles.textColor = [245, 158, 11];
          }
        }
      }
    });
    
    // Footer
    const pageCount = (doc as any).internal.getNumberOfPages();
    for (let i = 1; i <= pageCount; i++) {
      doc.setPage(i);
      doc.setFontSize(8);
      doc.setTextColor(150);
      doc.text(`Kanzu Palace – Ripoti ya ${monthYear}`, 14, 285);
      doc.text(`© ${now.getFullYear()} Kanzu Palace`, 196, 285, { align: 'right' });
    }
    
    doc.save(`Kanzu_Palace_Ripoti_${now.getTime()}.pdf`);
    setLoading(false);
  };

  const generateCustomerPDF = async () => {
    setLoading(true);
    try {
      const doc = new jsPDF();
      const now = new Date();
      
      const customersSnap = await getDocs(collection(db, 'customers'));
      const customers = customersSnap.docs.map(d => ({ id: d.id, ...d.data() }));

      doc.setFont('helvetica', 'bold');
      doc.setFontSize(22);
      doc.text('Kanzu Palace - Customer Report', 14, 20);
      
      doc.setFontSize(10);
      doc.setFont('helvetica', 'normal');
      doc.text(`Generated on: ${now.toLocaleString()}`, 14, 28);
      
      const tableData = customers
        .sort((a: any, b: any) => (b.total_spent || 0) - (a.total_spent || 0))
        .map((c: any, idx) => [
          (idx + 1).toString(),
          c.name || 'N/A',
          c.phone || 'N/A',
          (c.order_count || 0).toString(),
          (c.loyalty_points || 0).toString(),
          `TSh ${c.total_spent?.toLocaleString() || 0}`
        ]);

      autoTable(doc, {
        startY: 35,
        head: [['#', 'Name', 'Phone', 'Orders', 'Points', 'Total Spent']],
        body: tableData,
        theme: 'grid',
        headStyles: { fillColor: [201, 168, 76], textColor: [0, 0, 0] },
      });

      doc.save(`Kanzu_Palace_Customer_Report_${now.getTime()}.pdf`);
    } catch (error) {
      console.error("Error generating customer PDF:", error);
    } finally {
      setLoading(false);
    }
  };

  const generateInventoryPDF = async () => {
    setLoading(true);
    const doc = new jsPDF();
    const now = new Date();
    const monthYear = now.toLocaleDateString('en-GB', { month: 'long', year: 'numeric' });
    
    const productsSnap = await getDocs(collection(db, 'products'));
    const products = productsSnap.docs.map(d => ({ id: d.id, ...d.data() }));

    // Header
    doc.setFontSize(22);
    doc.setTextColor(201, 168, 76); // Gold
    doc.text('KANZU PALACE', 105, 20, { align: 'center' });
    doc.setFontSize(12);
    doc.setTextColor(100);
    doc.text(`Ripoti ya Hisa (Inventory) – ${monthYear}`, 105, 28, { align: 'center' });
    doc.line(14, 35, 196, 35);

    const tableData = products.map((p: any) => [
      p.name,
      p.category,
      `TSh ${p.price?.toLocaleString()}`,
      p.stock_quantity || 0,
      (p.stock_quantity || 0) <= 5 ? 'LOW STOCK' : 'OK'
    ]);

    autoTable(doc, {
      startY: 45,
      head: [['Product Name', 'Category', 'Price', 'Stock', 'Status']],
      body: tableData,
      theme: 'grid',
      headStyles: { fillColor: [201, 168, 76], textColor: [0, 0, 0], fontStyle: 'bold' },
      styles: { fontSize: 9, cellPadding: 4 },
      didParseCell: (data) => {
        if (data.section === 'body' && data.column.index === 4) {
          const status = data.cell.raw as string;
          if (status === 'LOW STOCK') {
            data.cell.styles.textColor = [239, 68, 68];
          }
        }
      }
    });

    doc.save(`Kanzu_Palace_Inventory_${now.getTime()}.pdf`);
    setLoading(false);
  };


  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="rounded-2xl border border-white/10 bg-white/5 p-8 flex flex-col items-center text-center">
          <div className="p-4 rounded-full bg-gold/10 text-gold mb-4">
            <FileDown size={32} />
          </div>
          <h3 className="text-lg font-bold text-white">Sales Report</h3>
          <p className="text-xs text-white/40 mt-2 mb-6">Download a full list of all orders and their status in PDF format.</p>
          <button 
            onClick={generatePDF}
            disabled={loading}
            className="h-12 px-8 rounded-xl bg-gold font-bold text-black hover:scale-[1.02] transition-all flex items-center gap-2"
          >
            {loading ? 'Generating...' : <><Download size={18} /> Download PDF</>}
          </button>
        </div>

        <div className="rounded-2xl border border-white/10 bg-white/5 p-8 flex flex-col items-center text-center">
          <div className="p-4 rounded-full bg-blue-500/10 text-blue-500 mb-4">
            <Package size={32} />
          </div>
          <h3 className="text-lg font-bold text-white">Inventory Report</h3>
          <p className="text-xs text-white/40 mt-2 mb-6">Detailed report of stock levels and low inventory alerts.</p>
          <button 
            onClick={generateInventoryPDF}
            disabled={loading}
            className="h-12 px-8 rounded-xl bg-blue-500 font-bold text-white hover:scale-[1.02] transition-all flex items-center gap-2"
          >
            {loading ? 'Generating...' : <><Download size={18} /> Download PDF</>}
          </button>
        </div>

        <div className="rounded-2xl border border-white/10 bg-white/5 p-8 flex flex-col items-center text-center">
          <div className="p-4 rounded-full bg-purple-500/10 text-purple-500 mb-4">
            <Users size={32} />
          </div>
          <h3 className="text-lg font-bold text-white">Customer Report</h3>
          <p className="text-xs text-white/40 mt-2 mb-6">Analytics on customer behavior and top spenders.</p>
          <button 
            onClick={generateCustomerPDF}
            disabled={loading}
            className="h-12 px-8 rounded-xl bg-purple-500 font-bold text-white hover:scale-[1.02] transition-all flex items-center gap-2"
          >
            {loading ? 'Generating...' : <><Download size={18} /> Download PDF</>}
          </button>
        </div>
      </div>
    </div>
  );
};

const PlaceholderSection = ({ title }: { title: string }) => (
  <div className="flex flex-col items-center justify-center h-96 text-white/20 border-2 border-dashed border-white/5 rounded-3xl">
    <LayoutDashboard size={48} className="mb-4 opacity-10" />
    <h3 className="text-xl font-bold">{title}</h3>
    <p className="text-sm italic mt-2">Sehemu hii inatengenezwa bado...</p>
  </div>
);

const CustomOrdersManagement = () => {
  const [orders, setOrders] = useState<any[]>([]);
  useEffect(() => {
    const q = query(collection(db, 'custom_orders'), orderBy('created_at', 'desc'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      setOrders(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, 'custom_orders');
    });
    return () => unsubscribe();
  }, []);

  const updateStatus = async (id: string, newStatus: string) => {
    try {
      await updateDoc(doc(db, 'custom_orders', id), { status: newStatus });
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `custom_orders/${id}`);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h3 className="text-xl font-bold text-white">Custom Orders ({orders.length})</h3>
      </div>
      <div className="grid grid-cols-1 gap-4">
        {orders.map((o) => (
          <div key={o.id} className="rounded-2xl border border-white/10 bg-[#111] p-6 flex items-center justify-between group hover:border-gold/30 transition-all">
            <div className="flex items-center gap-4">
              <div className="h-12 w-12 rounded-xl bg-gold/10 flex items-center justify-center text-gold">
                <Scissors size={24} />
              </div>
              <div>
                <h4 className="font-bold text-white">{o.customer_name}</h4>
                <p className="text-xs text-white/40">Fabric: {o.fabric_type} | Style: {o.style_name}</p>
                <p className="text-[10px] text-white/20 mt-1">Oda #: {o.id.slice(-6).toUpperCase()}</p>
              </div>
            </div>
            <div className="flex items-center gap-6">
              <div className="text-right">
                <p className="text-xs font-bold text-gold">TSh {o.total_price?.toLocaleString()}</p>
                <select 
                  value={o.status} 
                  onChange={(e) => updateStatus(o.id, e.target.value)}
                  className={cn(
                    "text-[10px] font-bold uppercase tracking-widest mt-1 bg-transparent border-none outline-none cursor-pointer",
                    o.status === 'Imekamilika' ? 'text-green-500' : 'text-amber-500'
                  )}
                >
                  <option value="Inasubiri">Inasubiri</option>
                  <option value="Inashonwa">Inashonwa</option>
                  <option value="Imekamilika">Imekamilika</option>
                  <option value="Imechukuliwa">Imechukuliwa</option>
                </select>
              </div>
              <button className="p-2 rounded-lg bg-white/5 text-white/40 opacity-0 group-hover:opacity-100 transition-all hover:text-white">
                <ChevronRight size={18} />
              </button>
            </div>
          </div>
        ))}
        {orders.length === 0 && (
          <div className="flex flex-col items-center justify-center h-48 text-white/20 border-2 border-dashed border-white/5 rounded-3xl">
            <p className="text-sm italic">Hakuna oda za ushonaji bado</p>
          </div>
        )}
      </div>
    </div>
  );
};

// --- Main Dashboard ---
export const Dashboard = () => {
  const { user, isAdmin, isStaff } = useApp();
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    if (!user) navigate('/login');
    if (user && !isAdmin && !isStaff) navigate('/');
  }, [user, isAdmin, isStaff, navigate]);

  const menuItems = [
    { group: 'MUHTASARI', items: [
      { icon: <LayoutDashboard size={18} />, label: 'Overview', path: '/dashboard' },
      { icon: <Calendar size={18} />, label: 'Kalenda ya Oda', path: '/dashboard/calendar' },
    ]},
    { group: 'MAUZO', items: [
      { icon: <ShoppingBag size={18} />, label: 'Oda & Malipo', path: '/dashboard/orders' },
      { icon: <CreditCard size={18} />, label: 'Point of Sale', path: '/dashboard/pos' },
    ]},
    { group: 'BIASHARA', items: [
      { icon: <Users size={18} />, label: 'Wafanyakazi', path: '/dashboard/staff', adminOnly: true },
      { icon: <Wallet size={18} />, label: 'Matumizi (Expenses)', path: '/dashboard/expenses', adminOnly: true },
      { icon: <Truck size={18} />, label: 'Suppliers', path: '/dashboard/suppliers', adminOnly: true },
      { icon: <ShoppingBag size={18} />, label: 'Purchases', path: '/dashboard/purchases', adminOnly: true },
      { icon: <Scissors size={18} />, label: 'Ushonaji', path: '/dashboard/tailoring' },
      { icon: <UserCircle size={18} />, label: 'Wateja & Vipimo', path: '/dashboard/customers' },
    ]},
    { group: 'MIPANGILIO', items: [
      { icon: <Package size={18} />, label: 'Bidhaa Zote', path: '/dashboard/products' },
      { icon: <Image size={18} />, label: 'Banner Slider', path: '/dashboard/settings/banners' },
      { icon: <Gift size={18} />, label: 'Promo Codes', path: '/dashboard/settings/promo' },
      { icon: <MessageSquare size={18} />, label: 'Broadcast WA', path: '/dashboard/broadcast' },
      { icon: <Truck size={18} />, label: 'Delivery', path: '/dashboard/settings/delivery' },
      { icon: <FileText size={18} />, label: 'Custom Orders', path: '/dashboard/custom-orders' },
      { icon: <FileDown size={18} />, label: 'Ripoti PDF', path: '/dashboard/reports' },
      { icon: <Settings size={18} />, label: 'Mipangilio Ofisi', path: '/dashboard/settings/office' },
      { icon: <Smartphone size={18} />, label: 'Mipangilio App', path: '/dashboard/settings/app' },
    ]},
  ];

  const handleLogout = async () => {
    await signOut(auth);
    navigate('/login');
  };

  if (!user) return null;

  return (
    <div className="flex min-h-screen bg-[#050505]">
      {/* Sidebar */}
      <aside className="hidden lg:flex w-64 flex-col border-r border-white/5 bg-[#0a0a0a]">
        <div className="p-6">
          <div className="flex items-center gap-2 text-gold">
            <span className="text-2xl">🕌</span>
            <span className="font-serif text-sm font-bold tracking-tight uppercase">Kanzu Palace</span>
          </div>
        </div>

        {/* User Profile */}
        <div className="px-6 py-4 flex items-center gap-3 border-y border-white/5">
          <div className="h-10 w-10 rounded-full bg-gold flex items-center justify-center text-black font-bold text-lg">
            {user.email?.[0].toUpperCase()}
          </div>
          <div>
            <p className="text-xs font-bold text-white truncate w-32">{user.email?.split('@')[0]}</p>
            <p className="text-[10px] font-bold text-gold uppercase tracking-widest">{isAdmin ? 'Admin' : 'Staff'}</p>
          </div>
        </div>

        <nav className="flex-1 px-3 py-6 space-y-6 overflow-y-auto custom-scrollbar">
          {menuItems.map((group) => (
            <div key={group.group} className="space-y-1">
              <p className="px-4 text-[9px] font-bold text-white/20 uppercase tracking-[0.2em] mb-2">{group.group}</p>
              {group.items.map((item) => {
                if (item.adminOnly && !isAdmin) return null;
                const isActive = location.pathname === item.path || (item.path === '/dashboard' && location.pathname === '/dashboard/');
                return (
                  <Link
                    key={item.path}
                    to={item.path}
                    className={cn(
                      "flex items-center gap-3 px-4 py-2.5 rounded-lg text-[11px] font-bold transition-all",
                      isActive 
                        ? "bg-white/5 text-gold border-r-2 border-gold" 
                        : "text-white/40 hover:bg-white/5 hover:text-white"
                    )}
                  >
                    <span className={cn(isActive ? "text-gold" : "text-white/40")}>{item.icon}</span>
                    {item.label}
                  </Link>
                );
              })}
            </div>
          ))}
        </nav>

        <div className="p-4 border-t border-white/5">
          <button 
            onClick={handleLogout}
            className="flex w-full items-center gap-3 px-4 py-3 rounded-xl text-xs font-bold text-white/40 hover:bg-red-500/10 hover:text-red-500 transition-all bg-white/5"
          >
            <LogOut size={18} />
            Toka
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        <header className="h-16 border-b border-white/5 bg-[#0a0a0a] flex items-center justify-between px-8">
          <div className="flex items-center gap-3">
             <div className="p-2 rounded-lg bg-white/5 text-gold">
               {menuItems.flatMap(g => g.items).find(i => i.path === location.pathname)?.icon || <LayoutDashboard size={20} />}
             </div>
             <h2 className="text-lg font-bold text-white">
               {menuItems.flatMap(g => g.items).find(i => i.path === location.pathname)?.label || 'Overview'}
             </h2>
          </div>
          
          <div className="flex items-center gap-4">
            <Link to="/" className="flex items-center gap-2 px-4 py-2 rounded-lg bg-white/5 border border-white/10 text-xs font-bold text-white/60 hover:text-white hover:bg-white/10 transition-all">
              <Store size={16} className="text-gold" />
              Duka
            </Link>
          </div>
        </header>

        <main className="flex-1 overflow-y-auto p-6 bg-[#050505]">
          <Routes>
            <Route path="/" element={<Overview />} />
            <Route path="/orders" element={<OrdersManagement />} />
            <Route path="/pos" element={<POSManagement />} />
            <Route path="/products" element={<ProductsManagement />} />
            <Route path="/staff" element={<StaffManagement />} />
            <Route path="/expenses" element={<ExpensesManagement />} />
            <Route path="/suppliers" element={<SuppliersManagement />} />
            <Route path="/purchases" element={<PurchasesManagement />} />
            <Route path="/tailoring" element={<TailoringManagement />} />
            <Route path="/customers" element={<CustomersManagement />} />
            <Route path="/broadcast" element={<BroadcastManagement />} />
            <Route path="/custom-orders" element={<CustomOrdersManagement />} />
            <Route path="/reports" element={<ReportsManagement />} />
            <Route path="/calendar" element={<CalendarView />} />
            <Route path="/settings/*" element={<SettingsManagement />} />
          </Routes>
        </main>
      </div>
    </div>
  );
};
