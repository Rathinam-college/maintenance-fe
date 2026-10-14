import { useState, useEffect } from 'react';
import axios from 'axios';
import { Save, FileText, Calendar } from 'lucide-react';

const API_URL = import.meta.env.VITE_API_URL || (window.location.hostname === 'localhost' ? 'http://localhost:8005/api' : '/maintenance/api');

export default function LedgerView({ activeFY }) {
  const [categories, setCategories] = useState([]);
  const [tags, setTags] = useState([]);
  
  const initialFormState = {
    category: '',
    sub_category: 'ACTUAL',
    date: '',
    description: '',
    amount: '',
    reference_no: '',
    tag: ''
  };
  
  const [formData, setFormData] = useState(initialFormState);

  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');

  // When activeFY changes, default the month to the start of that FY
  useEffect(() => {
    if (activeFY && !formData.date) {
      setFormData(prev => ({ ...prev, date: activeFY.start_date }));
    }
  }, [activeFY]);

  useEffect(() => {
    // Fetch tags
    axios.get(`${API_URL}/tags/`).then(res => setTags(res.data));
  }, []);

  useEffect(() => {
    // Fetch categories budgeted for the selected activeFY
    if (activeFY) {
      axios.get(`${API_URL}/category_budgets/?financial_year=${activeFY.id}`).then(budRes => {
        const activeCatIds = budRes.data.map(b => b.category);
        axios.get(`${API_URL}/categories/`).then(catRes => {
          const filteredCats = catRes.data.filter(c => activeCatIds.includes(c.id));
          setCategories(filteredCats.sort((a,b) => a.sort_order - b.sort_order));
        });
      });
    } else {
      setCategories([]);
    }
  }, [activeFY]);

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setMessage('');
    
    // Date validation against active financial year
    if (activeFY) {
      if (formData.date < activeFY.start_date || formData.date > activeFY.end_date) {
        alert(`Date must be within the active financial year (${activeFY.start_date} to ${activeFY.end_date})`);
        setLoading(false);
        return;
      }
    }
    
    try {
      const payload = {
        ...formData,
        month: formData.date, // Backwards compatibility for testing against old backend
        tag: formData.tag || null,
        reference_no: formData.reference_no || null
      };
      
      await axios.post(`${API_URL}/expenses/`, payload);
      setMessage('Expense recorded successfully!');
      // Reset description and amount, keep category/date for faster entry
      setFormData(prev => ({
        ...prev,
        description: '',
        amount: '',
        reference_no: '',
        tag: ''
      }));
    } catch (err) {
      console.error(err);
      setMessage(`Failed to save expense. Please try again.`);
    } finally {
      setLoading(false);
    }
  };

  const selectedCategory = categories.find(c => c.id.toString() === formData.category);
  const isCapex = selectedCategory && selectedCategory.name.toLowerCase().includes('capex');
  const isOther = selectedCategory && selectedCategory.name.toLowerCase().includes('other');

  return (
    <div className="max-w-3xl mx-auto">
      <div className="theme-panel rounded-2xl overflow-hidden">
        <div className="px-8 py-6 border-b theme-border bg-transparent">
          <h2 className="text-xl font-bold theme-text flex items-center gap-2">
            <FileText className="theme-accent-text" />
            Add New Expense
          </h2>
          <p className="text-sm theme-text-muted mt-1">
            Record a new maintenance transaction. {activeFY ? `(Currently logging for ${activeFY.label})` : ''}
          </p>
        </div>
        
        <form onSubmit={handleSubmit} className="p-8 space-y-6">
          {message && (
            <div className={`p-4 rounded-lg text-sm font-medium ${message.includes('success') ? 'bg-green-50 text-green-700 border border-green-200' : 'bg-red-50 text-red-700 border border-red-200'}`}>
              {message}
            </div>
          )}
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <label className="text-sm font-medium theme-text">Category</label>
              <select 
                name="category" 
                required 
                value={formData.category} 
                onChange={handleChange}
                className="w-full px-4 py-2.5 bg-transparent border theme-border theme-text rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all"
              >
                <option value="" className="text-black">Select Category...</option>
                {categories.map(cat => (
                  <option key={cat.id} value={cat.id} className="text-black">{cat.name}</option>
                ))}
              </select>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium theme-text flex items-center gap-2">
                <label className="block text-xs font-bold theme-text-muted uppercase tracking-wider mb-2">Date</label>
              </label>
              <input 
                type="date" 
                name="date" 
                required 
                value={formData.date} 
                onChange={handleChange}
                min={activeFY?.start_date}
                max={activeFY?.end_date}
                className="w-full px-4 py-2.5 bg-transparent border theme-border theme-text rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all"
              />
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium theme-text">Sub-Category</label>
            <div className="flex gap-4 p-1 rounded-lg border theme-border">
              <label className={`flex-1 text-center py-2 rounded-md cursor-pointer text-sm font-medium transition-colors ${formData.sub_category === 'ACTUAL' ? 'theme-accent-bg text-white shadow-sm' : 'theme-text-muted theme-hover'}`}>
                <input type="radio" name="sub_category" value="ACTUAL" className="hidden" checked={formData.sub_category === 'ACTUAL'} onChange={handleChange} />
                Actual
              </label>
              {!isCapex && (
                <label className={`flex-1 text-center py-2 rounded-md cursor-pointer text-sm font-medium transition-colors ${formData.sub_category === 'ADDITIONAL' ? 'theme-accent-bg text-white shadow-sm' : 'theme-text-muted theme-hover'}`}>
                  <input type="radio" name="sub_category" value="ADDITIONAL" className="hidden" checked={formData.sub_category === 'ADDITIONAL'} onChange={handleChange} />
                  Additional Work
                </label>
              )}
              <label className={`flex-1 text-center py-2 rounded-md cursor-pointer text-sm font-medium transition-colors ${formData.sub_category === 'OTHERS' ? 'theme-accent-bg text-white shadow-sm' : 'theme-text-muted theme-hover'}`}>
                <input type="radio" name="sub_category" value="OTHERS" className="hidden" checked={formData.sub_category === 'OTHERS'} onChange={handleChange} />
                Others
              </label>
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium theme-text">Description</label>
            <textarea 
              name="description" 
              required 
              rows="3"
              value={formData.description} 
              onChange={handleChange}
              placeholder="E.g., CV raman lab-3 AC Pipeline work..."
              className="w-full px-4 py-3 bg-transparent border theme-border theme-text rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all resize-none"
            ></textarea>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <label className="text-sm font-medium theme-text">Amount (₹)</label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none theme-text-muted">₹</div>
                <input 
                  type="number" 
                  name="amount" 
                  step="0.01" 
                  required 
                  value={formData.amount} 
                  onChange={handleChange}
                  placeholder="0.00"
                  className="w-full pl-8 pr-4 py-2.5 bg-transparent border theme-border theme-text rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all"
                />
              </div>
            </div>

            {(formData.sub_category === 'ACTUAL' || isCapex) && (
              <div className="space-y-2">
                <label className="text-sm font-medium theme-text">{isCapex ? 'Capex No' : 'Opex No'} (Optional)</label>
                <input 
                  type="text" 
                  name="reference_no" 
                  value={formData.reference_no} 
                  onChange={handleChange}
                  placeholder="E.g., C/6900"
                  className="w-full px-4 py-2.5 bg-transparent border theme-border theme-text rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all"
                />
              </div>
            )}
            
            {isOther && (
              <div className="space-y-2 md:col-span-2">
                <label className="text-sm font-medium theme-text">OT Brk Tag (Optional)</label>
                <select 
                  name="tag" 
                  value={formData.tag} 
                  onChange={handleChange}
                  className="w-full px-4 py-2.5 bg-transparent border theme-border theme-accent-text rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all"
                >
                  <option value="" className="text-black">No special tagging</option>
                  {tags.map(t => (
                    <option key={t.id} value={t.id} className="text-black">{t.name}</option>
                  ))}
                </select>
                <p className="text-xs theme-accent-text">Tagging an item here automatically places it in the OT Brk report.</p>
              </div>
            )}
          </div>

          <div className="pt-4 border-t theme-border flex justify-end">
            <button 
              type="submit" 
              disabled={loading}
              className="px-6 py-2.5 theme-accent-bg text-white font-medium rounded-lg shadow-sm flex items-center gap-2 transition-colors disabled:opacity-70 hover:opacity-80"
            >
              {loading ? <div className="h-4 w-4 rounded-full border-2 border-white border-t-transparent animate-spin"></div> : <Save size={18} />}
              Save Expense
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
