import { useState } from 'react';
import { Package, Plus, Search, X, Pencil, Trash2, Tag, Percent, Boxes } from 'lucide-react';

// Types for our data
interface Item {
  id: number;
  name: string;
  type: 'PRODUCT' | 'SERVICE';
  hsnSacCode: string;
  unit: string;
  defaultPrice: number;
  taxRate: number; // 13 for VAT, 0 for exempt/PAN
  stock: number;
}

// Common units in Nepal
const UNITS = ['Pcs', 'Kg', 'Ltr', 'Box', 'Set', 'Mtr', 'Dozen', 'Service', 'Hours'];

const initialItems: Item[] = [];

export default function Items() {
  const [items, setItems] = useState<Item[]>(initialItems);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState<'ALL' | 'PRODUCT' | 'SERVICE'>('ALL');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<Item | null>(null);

  // Filter logic
  const filteredItems = items.filter((item) => {
    const matchesSearch = item.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          item.hsnSacCode.includes(searchTerm);
    const matchesType = filterType === 'ALL' || item.type === filterType;
    return matchesSearch && matchesType;
  });

  const handleDelete = (id: number) => {
    if (window.confirm('Are you sure you want to delete this item?')) {
      setItems(items.filter(i => i.id !== id));
    }
  };

  const openAddModal = () => {
    setEditingItem(null);
    setIsModalOpen(true);
  };

  const openEditModal = (item: Item) => {
    setEditingItem(item);
    setIsModalOpen(true);
  };

  // Format price to Nepali Rupees with commas
  const formatPrice = (price: number) => {
    return `Rs. ${price.toLocaleString('en-IN')}`;
  };

  return (
    <div className="max-w-6xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-slate-900 flex items-center gap-2">
            <Package className="h-6 w-6 text-teal-800" />
            Items & Services
          </h1>
          <p className="text-sm text-slate-500 mt-1">Your product and service catalog.</p>
        </div>
        <button 
          onClick={openAddModal}
          className="flex items-center justify-center gap-2 bg-teal-800 hover:bg-teal-900 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors shadow-sm"
        >
          <Plus className="h-4 w-4" />
          Add Item
        </button>
      </div>

      {/* Search & Filters */}
      <div className="flex flex-col sm:flex-row gap-4 mb-6">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
          <input 
            type="text" 
            placeholder="Search by name or HSN/SAC code..." 
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-teal-700 focus:border-teal-700 outline-none transition-all text-sm"
          />
        </div>
        <div className="flex bg-slate-100 p-1 rounded-lg w-full sm:w-auto">
          {(['ALL', 'PRODUCT', 'SERVICE'] as const).map((type) => (
            <button
              key={type}
              onClick={() => setFilterType(type)}
              className={`flex-1 sm:flex-none px-4 py-1.5 rounded-md text-sm font-medium transition-colors ${
                filterType === type 
                  ? 'bg-white text-teal-800 shadow-sm' 
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              {type === 'ALL' ? 'All' : type === 'PRODUCT' ? 'Products' : 'Services'}
            </button>
          ))}
        </div>
      </div>

      {/* Desktop Table (Hidden on mobile) */}
      <div className="hidden md:block bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
        <table className="w-full text-left">
          <thead className="bg-slate-50 border-b border-slate-200">
            <tr>
              <th className="px-6 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Item Name</th>
              <th className="px-6 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">HSN/SAC</th>
              <th className="px-6 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Unit</th>
              <th className="px-6 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Price</th>
              <th className="px-6 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Tax Rate</th>
              <th className="px-6 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Stock</th>
              <th className="px-6 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {filteredItems.length > 0 ? (
              filteredItems.map((item) => (
                <tr key={item.id} className="hover:bg-slate-50 transition-colors">
                  <td className="px-6 py-4">
                    <div className="font-medium text-slate-900 text-sm">{item.name}</div>
                    <TypeBadge type={item.type} />
                  </td>
                  <td className="px-6 py-4 text-sm text-slate-600 font-mono">{item.hsnSacCode}</td>
                  <td className="px-6 py-4 text-sm text-slate-600">{item.unit}</td>
                  <td className="px-6 py-4 text-sm font-semibold text-slate-900">{formatPrice(item.defaultPrice)}</td>
                  <td className="px-6 py-4">
                    <TaxBadge rate={item.taxRate} />
                  </td>
                  <td className="px-6 py-4 text-sm text-slate-600">
                    {item.type === 'PRODUCT' ? (
                      <span className={item.stock < 10 ? 'text-red-600 font-medium' : ''}>
                        {item.stock} {item.unit}
                      </span>
                    ) : (
                      <span className="text-slate-400">—</span>
                    )}
                  </td>
                  <td className="px-6 py-4 text-right">
                    <div className="flex justify-end gap-2">
                      <button onClick={() => openEditModal(item)} className="p-1.5 text-slate-400 hover:text-teal-800 hover:bg-teal-50 rounded-md transition-colors">
                        <Pencil className="h-4 w-4" />
                      </button>
                      <button onClick={() => handleDelete(item.id)} className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-md transition-colors">
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={7} className="px-6 py-12 text-center text-slate-500 text-sm">
                  No items found matching your criteria.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Mobile Cards (Hidden on desktop) */}
      <div className="md:hidden space-y-4">
        {filteredItems.length > 0 ? (
          filteredItems.map((item) => (
            <div key={item.id} className="bg-white p-4 rounded-xl shadow-sm border border-slate-200">
              <div className="flex justify-between items-start mb-3">
                <div>
                  <h3 className="font-semibold text-slate-900">{item.name}</h3>
                  <TypeBadge type={item.type} />
                </div>
                <div className="flex gap-1">
                  <button onClick={() => openEditModal(item)} className="p-2 text-slate-400 hover:text-teal-800 hover:bg-teal-50 rounded-md">
                    <Pencil className="h-4 w-4" />
                  </button>
                  <button onClick={() => handleDelete(item.id)} className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-md">
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </div>
              <div className="space-y-2 text-sm text-slate-600">
                <div className="flex justify-between">
                  <span className="flex items-center gap-2"><Tag className="h-4 w-4 text-slate-400" /> HSN/SAC</span>
                  <span className="font-mono">{item.hsnSacCode}</span>
                </div>
                <div className="flex justify-between">
                  <span className="flex items-center gap-2"><Boxes className="h-4 w-4 text-slate-400" /> Unit / Stock</span>
                  <span>
                    {item.unit}
                    {item.type === 'PRODUCT' && (
                      <span className={item.stock < 10 ? ' text-red-600 font-medium' : ' text-slate-500'}> • {item.stock} left</span>
                    )}
                  </span>
                </div>
                <div className="flex justify-between items-center pt-2 border-t border-slate-100">
                  <span className="font-bold text-slate-900">{formatPrice(item.defaultPrice)}</span>
                  <TaxBadge rate={item.taxRate} />
                </div>
              </div>
            </div>
          ))
        ) : (
          <div className="bg-white p-8 rounded-xl shadow-sm border border-slate-200 text-center text-slate-500 text-sm">
            No items found.
          </div>
        )}
      </div>

      {/* Add/Edit Modal */}
      {isModalOpen && (
        <ItemModal 
          item={editingItem} 
          onClose={() => setIsModalOpen(false)} 
          onSave={(itemData) => {
            if (editingItem) {
              setItems(items.map(i => i.id === editingItem.id ? { ...itemData, id: editingItem.id } : i));
            } else {
              setItems([...items, { ...itemData, id: Date.now() }]);
            }
            setIsModalOpen(false);
          }}
        />
      )}
    </div>
  );
}

// Helper component for the type badge
function TypeBadge({ type }: { type: 'PRODUCT' | 'SERVICE' }) {
  return type === 'PRODUCT' ? (
    <span className="inline-flex items-center mt-1 px-2 py-0.5 rounded-full text-xs font-medium bg-teal-50 text-teal-900 border border-teal-100">Product</span>
  ) : (
    <span className="inline-flex items-center mt-1 px-2 py-0.5 rounded-full text-xs font-medium bg-indigo-50 text-indigo-700 border border-indigo-100">Service</span>
  );
}

// Helper component for the tax badge
function TaxBadge({ rate }: { rate: number }) {
  return rate > 0 ? (
    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-amber-50 text-amber-700 border border-amber-100">
      <Percent className="h-3 w-3" /> {rate}% VAT
    </span>
  ) : (
    <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-slate-100 text-slate-600 border border-slate-200">
      0% / Exempt
    </span>
  );
}

// The Modal Component for Adding/Editing
interface ItemModalProps {
  item: Item | null;
  onClose: () => void;
  onSave: (data: Omit<Item, 'id'>) => void;
}

function ItemModal({ item, onClose, onSave }: ItemModalProps) {
  const [formData, setFormData] = useState<Omit<Item, 'id'>>({
    name: item?.name || '',
    type: item?.type || 'PRODUCT',
    hsnSacCode: item?.hsnSacCode || '',
    unit: item?.unit || 'Pcs',
    defaultPrice: item?.defaultPrice || 0,
    taxRate: item?.taxRate || 13,
    stock: item?.stock || 0,
  });

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const value = e.target.value;
    setFormData({ ...formData, [e.target.name]: value });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave({
      ...formData,
      defaultPrice: Number(formData.defaultPrice),
      taxRate: Number(formData.taxRate),
      stock: Number(formData.stock),
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50" onClick={onClose}>
      <div 
        className="bg-white rounded-xl shadow-xl w-full max-w-md max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="px-6 py-4 border-b border-slate-100 flex justify-between items-center">
          <h2 className="text-lg font-semibold text-slate-900">
            {item ? 'Edit Item' : 'Add New Item'}
          </h2>
          <button onClick={onClose} className="p-1 text-slate-400 hover:text-slate-600 rounded-md hover:bg-slate-100">
            <X className="h-5 w-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {/* Type Toggle */}
          <div className="flex gap-4 bg-slate-50 p-1 rounded-lg">
            <button
              type="button"
              onClick={() => setFormData({ ...formData, type: 'PRODUCT' })}
              className={`flex-1 py-2 rounded-md text-sm font-medium transition-colors ${
                formData.type === 'PRODUCT' ? 'bg-white text-teal-900 shadow-sm border border-teal-300' : 'text-slate-500'
              }`}
            >
              Product
            </button>
            <button
              type="button"
              onClick={() => setFormData({ ...formData, type: 'SERVICE' })}
              className={`flex-1 py-2 rounded-md text-sm font-medium transition-colors ${
                formData.type === 'SERVICE' ? 'bg-white text-indigo-700 shadow-sm border border-indigo-200' : 'text-slate-500'
              }`}
            >
              Service
            </button>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Item Name *</label>
            <input type="text" name="name" value={formData.name} onChange={handleChange} required
              className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-teal-700 outline-none text-sm" 
              placeholder="e.g., Wireless Headphones" />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">HSN/SAC Code</label>
              <input type="text" name="hsnSacCode" value={formData.hsnSacCode} onChange={handleChange}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-teal-700 outline-none text-sm" 
                placeholder="e.g., 8518.30" />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Unit *</label>
              <select name="unit" value={formData.unit} onChange={handleChange}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-teal-700 outline-none text-sm bg-white">
                {UNITS.map(u => <option key={u} value={u}>{u}</option>)}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Default Price (Rs.) *</label>
              <input type="number" name="defaultPrice" value={formData.defaultPrice} onChange={handleChange} required min="0" step="0.01"
                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-teal-700 outline-none text-sm" />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Tax Rate *</label>
              <select name="taxRate" value={formData.taxRate} onChange={handleChange}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-teal-700 outline-none text-sm bg-white">
                <option value={13}>13% VAT</option>
                <option value={0}>0% / Exempt</option>
              </select>
            </div>
          </div>

          {/* Stock only for products */}
          {formData.type === 'PRODUCT' && (
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Opening Stock</label>
              <input type="number" name="stock" value={formData.stock} onChange={handleChange} min="0"
                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-teal-700 outline-none text-sm" />
            </div>
          )}

          <div className="pt-4 flex gap-3">
            <button type="button" onClick={onClose} 
              className="flex-1 px-4 py-2 border border-slate-300 text-slate-700 rounded-lg text-sm font-medium hover:bg-slate-50 transition-colors">
              Cancel
            </button>
            <button type="submit" 
              className="flex-1 px-4 py-2 bg-teal-800 text-white rounded-lg text-sm font-medium hover:bg-teal-900 transition-colors shadow-sm">
              {item ? 'Update Item' : 'Save Item'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}