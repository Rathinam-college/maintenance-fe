import { useState, useEffect, useRef } from 'react';
import { Save, AlertCircle, Plus, Trash2, CalendarPlus, GripVertical } from 'lucide-react';

const API_URL = import.meta.env.VITE_API_URL || (window.location.hostname === 'localhost' ? 'http://localhost:8005/api' : '/maintenance/api');

const fetchWithAuth = async (url, options = {}) => {
  const token = localStorage.getItem('mt_token');
  const headers = {
    ...options.headers,
    ...(token ? { Authorization: `Bearer ${token}` } : {})
  };
  return fetch(url, { ...options, headers });
};

export default function AllocationView({ activeFY, refreshFinancialYears }) {
  const [categories, setCategories] = useState([]);
  const [budgets, setBudgets] = useState({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  
  const [amounts, setAmounts] = useState({});
  const [newCatName, setNewCatName] = useState('');
  const [deletedBudgetIds, setDeletedBudgetIds] = useState([]);
  
  const [showFYForm, setShowFYForm] = useState(false);
  const [isEditingFY, setIsEditingFY] = useState(false);
  const [fyFormData, setFyFormData] = useState({ label: '', start_date: '', end_date: '' });

  // Drag and Drop refs
  const dragItem = useRef(null);
  const dragOverItem = useRef(null);

  const handleSort = () => {
    // duplicate items
    let _categories = [...categories];
    // remove and save the dragged item content
    const draggedItemContent = _categories.splice(dragItem.current, 1)[0];
    // switch the position
    _categories.splice(dragOverItem.current, 0, draggedItemContent);
    // update sort_order for each
    _categories = _categories.map((cat, index) => ({ ...cat, sort_order: index + 1 }));
    // reset the position ref
    dragItem.current = null;
    dragOverItem.current = null;
    // update the actual array
    setCategories(_categories);
  };

  useEffect(() => {
    if (activeFY) {
      setFyFormData({
        label: activeFY.label,
        start_date: activeFY.start_date,
        end_date: activeFY.end_date
      });
      fetchData();
    }
  }, [activeFY]);

  async function fetchData() {
    setLoading(true);
    try {
      // Fetch categories
      const catRes = await fetchWithAuth(`${API_URL}/categories/`);
      if (!catRes.ok) throw new Error('Failed to fetch categories');
      const catData = await catRes.json();
      
      // Fetch budgets for activeFY
      const budRes = await fetchWithAuth(`${API_URL}/category_budgets/?financial_year=${activeFY.id}`);
      if (!budRes.ok) throw new Error('Failed to fetch budgets');
      const budData = await budRes.json();
      
      const budMap = {};
      const amtMap = {};
      budData.forEach(b => {
        budMap[b.category] = b;
        amtMap[b.category] = b.sanctioned_amount;
      });
      setBudgets(budMap);
      setAmounts(amtMap);

      const activeCatIds = budData.map(b => b.category);
      // Sort them according to global sort_order
      setCategories(catData.filter(c => activeCatIds.includes(c.id)).sort((a,b) => a.sort_order - b.sort_order));
      setDeletedBudgetIds([]);

    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  const handleAmountChange = (id, value) => {
    setAmounts(prev => ({ ...prev, [id]: value }));
  };

  const handleAddCategory = async () => {
    if (!newCatName.trim()) return;
    try {
      // Create or find global category immediately to get an ID for the UI
      const catRes = await fetchWithAuth(`${API_URL}/categories/`);
      const allCats = await catRes.json();
      let cat = allCats.find(c => c.name.toLowerCase() === newCatName.trim().toLowerCase());
      
      if (!cat) {
        const createRes = await fetchWithAuth(`${API_URL}/categories/`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ name: newCatName, is_active: true, sort_order: allCats.length + 1 })
        });
        if (!createRes.ok) throw new Error('Failed to create global category');
        cat = await createRes.json();
      }
      
      // Stage it in the UI (CategoryBudget will be created on Save)
      if (!categories.find(c => c.id === cat.id)) {
        setCategories(prev => [...prev, cat].sort((a,b) => a.sort_order - b.sort_order));
        setAmounts(prev => ({ ...prev, [cat.id]: 0 }));
      }
      
      setNewCatName('');
    } catch (err) {
      setError(err.message);
    }
  };

  const handleLoadDefaults = async () => {
    try {
      const catRes = await fetchWithAuth(`${API_URL}/categories/`);
      const allCats = await catRes.json();
      
      const defaults = [
        "Employee Cost – Technician Salary",
        "Employee Cost – Contract Salary",
        "Employee Cost – Admin & Executive",
        "AC Maintenance",
        "Electrical Maintenance",
        "Plumbing Maintenance",
        "Carpentry Maintenance",
        "Fabrication Maintenance",
        "Painting Maintenance",
        "Civil Maintenance",
        "Other Maintenance",
        "Fire Extinguisher Maintenance",
        "Pest Control",
        "Infrastructure / Improvement (Capex)"
      ];

      const newCategories = [...categories];
      const newAmounts = { ...amounts };

      for (let i = 0; i < defaults.length; i++) {
        const name = defaults[i];
        let cat = allCats.find(c => c.name.toLowerCase() === name.toLowerCase());
        
        if (!cat) {
          const createRes = await fetchWithAuth(`${API_URL}/categories/`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ name: name, is_active: true, sort_order: i + 1, is_capex: name.includes("Capex") })
          });
          cat = await createRes.json();
          allCats.push(cat);
        } else {
          // Fix sort order if it's messed up globally
          if (cat.sort_order !== i + 1) {
             fetchWithAuth(`${API_URL}/categories/${cat.id}/`, {
               method: 'PATCH',
               headers: { 'Content-Type': 'application/json' },
               body: JSON.stringify({ sort_order: i + 1 })
             });
             cat.sort_order = i + 1;
          }
        }
        
        if (!newCategories.find(c => c.id === cat.id)) {
          newCategories.push(cat);
          newAmounts[cat.id] = 0;
        }
      }
      
      setCategories(newCategories.sort((a,b) => a.sort_order - b.sort_order));
      setAmounts(newAmounts);
    } catch (err) {
      setError(err.message);
    }
  };

  const handleDeleteCategory = (id) => {
    // Stage deletion in the UI
    const budget = budgets[id];
    if (budget) {
      setDeletedBudgetIds(prev => [...prev, budget.id]);
    }
    setCategories(prev => prev.filter(c => c.id !== id));
  };

  const handleSaveFYForm = async () => {
    if (!fyFormData.label || !fyFormData.start_date || !fyFormData.end_date) {
      setError('Please fill all financial year fields');
      return;
    }
    setSaving(true);
    try {
      if (isEditingFY) {
        // Update existing FY
        const res = await fetchWithAuth(`${API_URL}/financial_years/${activeFY.id}/`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(fyFormData)
        });
        if (!res.ok) throw new Error('Failed to update financial year');
        setSuccess('Financial year updated successfully!');
        if (refreshFinancialYears) refreshFinancialYears(activeFY.id);
      } else {
        // Create new FY
        const res = await fetchWithAuth(`${API_URL}/financial_years/`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ ...fyFormData, is_active: false })
        });
        if (!res.ok) throw new Error('Failed to create financial year');
        
        const createdFY = await res.json();
        setSuccess(`Financial Year ${createdFY.label} created successfully!`);
        if (refreshFinancialYears) refreshFinancialYears(createdFY.id);
      }
      setShowFYForm(false);
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  const handleSaveAll = async () => {
    setSaving(true);
    setError('');
    setSuccess('');
    
    try {
      // 1. Process deletions first
      const deletePromises = deletedBudgetIds.map(budgetId => {
        return fetchWithAuth(`${API_URL}/category_budgets/${budgetId}/`, {
          method: 'DELETE'
        });
      });
      await Promise.all(deletePromises);

      // 2. Process saves and creations
      const savePromises = [];
      categories.forEach(cat => {
        const amount = amounts[cat.id] || 0;
        const existingBudget = budgets[cat.id];
        
        if (existingBudget && !deletedBudgetIds.includes(existingBudget.id)) {
          // Update existing budget
          savePromises.push(fetchWithAuth(`${API_URL}/category_budgets/${existingBudget.id}/`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ sanctioned_amount: amount })
          }));
        } else if (!existingBudget) {
          // Create new budget
          savePromises.push(fetchWithAuth(`${API_URL}/category_budgets/`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              category: cat.id,
              financial_year: activeFY.id,
              sanctioned_amount: amount
            })
          }));
        }
        
        // Always patch sort_order if it was reordered
        savePromises.push(fetchWithAuth(`${API_URL}/categories/${cat.id}/`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ sort_order: cat.sort_order })
        }));
      });

      await Promise.all(savePromises);
      
      setSuccess(`All changes saved successfully for ${activeFY.label}!`);
      setTimeout(() => setSuccess(''), 3000);
      fetchData();
    } catch (err) {
      setError('Failed to save budgets. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return <div className="flex items-center justify-center h-[50vh]"><div className="w-8 h-8 rounded-full border-4 theme-border border-t-blue-500 animate-spin"></div></div>;
  }

  const grandTotal = categories.reduce((sum, cat) => {
    return sum + (parseFloat(amounts[cat.id]) || 0);
  }, 0);

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h2 className="text-2xl font-bold theme-text">Budget Management</h2>
          <p className="theme-text-muted mt-1">Managing allocations for <strong>{activeFY?.label}</strong></p>
          <div className="mt-3 inline-flex items-center px-4 py-2 theme-accent-bg/10 theme-accent-text rounded-lg font-bold border theme-accent-border text-lg shadow-sm">
            Total Sanctioned: ₹{grandTotal.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </div>
        </div>
        <div className="flex items-center gap-3">
          <button 
            onClick={() => {
              setIsEditingFY(true);
              setFyFormData({ label: activeFY.label, start_date: activeFY.start_date, end_date: activeFY.end_date });
              setShowFYForm(true);
            }}
            className="inline-flex items-center gap-2 px-4 py-2 bg-transparent border theme-border theme-text rounded hover:bg-black/5 transition-colors font-medium text-sm"
          >
            Edit Settings
          </button>
          <button 
            onClick={() => {
              setIsEditingFY(false);
              setFyFormData({ label: '', start_date: '', end_date: '' });
              setShowFYForm(true);
            }}
            className="inline-flex items-center gap-2 px-4 py-2 bg-transparent border theme-border theme-text rounded hover:bg-black/5 transition-colors font-medium text-sm"
          >
            <CalendarPlus size={18} />
            New Year
          </button>
          <button 
            onClick={handleSaveAll}
            disabled={saving}
            className="inline-flex items-center gap-2 px-6 py-2 theme-accent-bg text-white font-medium rounded-lg hover:opacity-80 transition-opacity shadow-lg disabled:opacity-50"
          >
            {saving ? <div className="w-5 h-5 rounded-full border-2 border-white/20 border-t-white animate-spin"></div> : <Save size={20} />}
            {saving ? 'Saving...' : 'Save Budgets'}
          </button>
        </div>
      </div>

      {showFYForm && (
        <div className="theme-panel p-5 rounded-xl border mb-6 shadow-sm">
          <h3 className="text-lg font-bold theme-text mb-4">
            {isEditingFY ? `Edit Settings for ${activeFY.label}` : 'Create New Financial Year'}
          </h3>
          <div className="flex flex-wrap items-end gap-4">
            <div>
              <label className="block text-xs font-semibold theme-text-muted mb-1 uppercase tracking-wide">Year Label (e.g., 2027-2028)</label>
              <input 
                type="text" 
                placeholder="2027-2028"
                value={fyFormData.label}
                onChange={e => setFyFormData({...fyFormData, label: e.target.value})}
                className="w-48 px-3 py-2 theme-input rounded focus:outline-none focus:ring-2 focus:ring-[var(--color-accent)] font-medium"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold theme-text-muted mb-1 uppercase tracking-wide">Start Date</label>
              <input 
                type="date" 
                value={fyFormData.start_date}
                onChange={e => setFyFormData({...fyFormData, start_date: e.target.value})}
                className="w-40 px-3 py-2 theme-input rounded focus:outline-none focus:ring-2 focus:ring-[var(--color-accent)]"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold theme-text-muted mb-1 uppercase tracking-wide">End Date</label>
              <input 
                type="date" 
                value={fyFormData.end_date}
                onChange={e => setFyFormData({...fyFormData, end_date: e.target.value})}
                className="w-40 px-3 py-2 theme-input rounded focus:outline-none focus:ring-2 focus:ring-[var(--color-accent)]"
              />
            </div>
            <button 
              onClick={handleSaveFYForm}
              disabled={saving}
              className="px-6 py-2 theme-accent-bg text-white font-semibold rounded hover:opacity-80 transition-opacity"
            >
              {isEditingFY ? 'Update Details' : 'Create Year'}
            </button>
            <button 
              onClick={() => setShowFYForm(false)}
              className="px-4 py-2 border theme-border theme-text rounded hover:bg-black/5 transition-opacity font-medium"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {error && (
        <div className="p-4 bg-red-500/10 border border-red-500/20 rounded-lg flex items-center gap-3 text-red-500">
          <AlertCircle size={20} />
          <p>{error}</p>
        </div>
      )}

      {success && (
        <div className="p-4 bg-green-500/10 border border-green-500/20 rounded-lg text-green-500 font-medium">
          {success}
        </div>
      )}

      {/* Categories Table */}
      <div className="theme-panel rounded-2xl overflow-hidden">
        <div className="px-6 py-5 border-b theme-border flex justify-between items-center">
          <div>
            <h3 className="text-lg font-bold theme-text">Category Budgets ({activeFY?.label})</h3>
            <p className="text-sm theme-text-muted mt-1">Set the sanctioned amount or add new categories.</p>
          </div>
          
          <div className="flex items-center gap-2">
            <button 
              onClick={handleLoadDefaults}
              className="px-3 py-1.5 border theme-border theme-text rounded hover:bg-black/5 transition-colors text-sm font-medium mr-2"
              title="Load standard category list"
            >
              Load Defaults
            </button>
            <input 
              type="text"
              placeholder="New Category Name..."
              value={newCatName}
              onChange={(e) => setNewCatName(e.target.value)}
              className="px-3 py-1.5 theme-input rounded focus:outline-none focus:ring-2 focus:ring-[var(--color-accent)] text-sm"
            />
            <button 
              onClick={handleAddCategory}
              className="p-1.5 theme-accent-bg text-white rounded hover:opacity-80 transition-opacity"
            >
              <Plus size={20} />
            </button>
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b theme-border opacity-80 bg-black/5">
                <th className="px-6 py-4 text-sm font-semibold theme-text w-1/2">Category</th>
                <th className="px-6 py-4 text-sm font-semibold theme-text w-1/3">Sanctioned Amount (₹)</th>
                <th className="px-6 py-4 text-sm font-semibold theme-text text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y theme-border">
              {categories.length === 0 ? (
                <tr><td colSpan="3" className="px-6 py-8 text-center theme-text-muted">No categories available.</td></tr>
              ) : categories.map((cat, index) => (
                <tr 
                  key={cat.id} 
                  className="theme-hover transition-colors"
                  draggable
                  onDragStart={(e) => (dragItem.current = index)}
                  onDragEnter={(e) => (dragOverItem.current = index)}
                  onDragEnd={handleSort}
                  onDragOver={(e) => e.preventDefault()}
                >
                  <td className="px-6 py-4 font-medium theme-text flex items-center gap-3">
                    <div className="cursor-grab text-gray-400 hover:text-gray-600 dark:hover:text-gray-300">
                      <GripVertical size={20} />
                    </div>
                    {cat.name} {cat.is_capex && <span className="text-xs bg-blue-500/20 text-blue-500 px-2 py-1 rounded-full">Capex</span>}
                  </td>
                  <td className="px-6 py-4">
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none theme-text-muted font-medium">₹</div>
                      <input 
                        type="number"
                        value={amounts[cat.id] ?? ''}
                        onChange={(e) => handleAmountChange(cat.id, e.target.value)}
                        className="w-full pl-8 pr-3 py-2 theme-input rounded focus:outline-none focus:ring-2 focus:ring-[var(--color-accent)] font-medium"
                        step="0.01"
                      />
                    </div>
                  </td>
                  <td className="px-6 py-4 text-right">
                    <button 
                      onClick={() => handleDeleteCategory(cat.id)}
                      className="p-2 text-red-400 hover:text-red-500 hover:bg-red-500/10 rounded transition-colors"
                      title="Remove from this year"
                    >
                      <Trash2 size={18} />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
