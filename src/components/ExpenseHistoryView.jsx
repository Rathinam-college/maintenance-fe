import { useState, useEffect } from 'react';
import axios from 'axios';
import { History, Download, Trash2, Edit2, X, Save } from 'lucide-react';
import ExcelJS from 'exceljs';

const API_URL = import.meta.env.VITE_API_URL || (window.location.hostname === 'localhost' ? 'http://localhost:8005/api' : '/maintenance/api');

const formatDate = (dateString) => {
  if (!dateString) return '';
  const [year, month, day] = dateString.split('-');
  if (!year || !month || !day) return dateString;
  return `${day}-${month}-${year}`;
};

export default function ExpenseHistoryView({ activeFY }) {
  const [expenses, setExpenses] = useState([]);
  const [categories, setCategories] = useState([]);
  const [activeCategories, setActiveCategories] = useState([]);
  const [tags, setTags] = useState([]);
  
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');
  const [filterCategory, setFilterCategory] = useState('');

  const [editingExpense, setEditingExpense] = useState(null);
  const [editFormData, setEditFormData] = useState({});
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    axios.get(`${API_URL}/tags/`).then(res => setTags(res.data));
    axios.get(`${API_URL}/categories/`).then(res => setCategories(res.data));
  }, []);

  useEffect(() => {
    if (activeFY) {
      setFromDate(activeFY.start_date);
      setToDate(activeFY.end_date);
      setFilterCategory(''); // Reset category filter on year change

      // Fetch active categories for this FY for the filter dropdown
      axios.get(`${API_URL}/category_budgets/?financial_year=${activeFY.id}`).then(budRes => {
        const activeCatIds = budRes.data.map(b => b.category);
        axios.get(`${API_URL}/categories/`).then(catRes => {
          const filteredCats = catRes.data.filter(c => activeCatIds.includes(c.id));
          setActiveCategories(filteredCats.sort((a,b) => a.sort_order - b.sort_order));
        });
      });
    } else {
      setActiveCategories([]);
    }
  }, [activeFY]);

  const fetchExpenses = () => {
    if (!fromDate || !toDate) return;
    let url = `${API_URL}/expenses/?start_date=${fromDate}&end_date=${toDate}`;
    if (filterCategory) {
      url += `&category=${filterCategory}`;
    }
    axios.get(url)
      .then(res => setExpenses(res.data))
      .catch(err => console.error(err));
  };

  useEffect(() => {
    fetchExpenses();
  }, [fromDate, toDate, filterCategory]);

  const handleExportExcel = async () => {
    if (expenses.length === 0) return;
    
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet('Expense History');

    // Define columns
    worksheet.columns = [
      { header: 'Date', key: 'date', width: 15 },
      { header: 'Category', key: 'category', width: 30 },
      { header: 'Sub-Category', key: 'sub_category', width: 25 },
      { header: 'Description', key: 'description', width: 40 },
      { header: 'Amount (₹)', key: 'amount', width: 18 },
      { header: 'Reference No', key: 'reference_no', width: 20 },
      { header: 'Tag', key: 'tag', width: 20 },
    ];

    // Insert a title row at the very top for Financial Year
    worksheet.spliceRows(1, 0, []); // empty row
    worksheet.spliceRows(1, 0, [`Expense History for Financial Year: ${activeFY?.label || 'All Time'}`]);
    worksheet.mergeCells('A1:G1');
    const titleRow = worksheet.getRow(1);
    titleRow.font = { bold: true, size: 16, color: { argb: 'FF1F2937' } };
    titleRow.alignment = { vertical: 'middle', horizontal: 'center' };
    titleRow.height = 30;

    // Style the header row (now it's row 3)
    const headerRow = worksheet.getRow(3);
    headerRow.font = { bold: true, color: { argb: 'FFFFFFFF' } };
    headerRow.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FF4F46E5' } // Indigo color
    };
    headerRow.alignment = { vertical: 'middle', horizontal: 'center' };

    // Add data rows
    expenses.forEach(exp => {
      // Safely compare IDs using toString to avoid type mismatches
      const cat = categories.find(c => c.id.toString() === exp.category?.toString());
      const tag = tags.find(t => t.id.toString() === exp.tag?.toString());
      
      const row = worksheet.addRow({
        date: formatDate(exp.date || exp.month),
        category: cat ? cat.name : 'Unknown',
        sub_category: exp.sub_category,
        description: exp.description || '',
        amount: parseFloat(exp.amount),
        reference_no: exp.reference_no || '',
        tag: tag ? tag.name : ''
      });
      
      // Alternate row colors for neatness
      if (row.number % 2 === 0) {
        row.fill = {
          type: 'pattern',
          pattern: 'solid',
          fgColor: { argb: 'FFF9FAFB' }
        };
      }
    });

    // Number formatting for amount
    worksheet.getColumn('amount').numFmt = '₹#,##0.00';

    // Generate Excel file
    const buffer = await workbook.xlsx.writeBuffer();
    const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `Expense_History_${activeFY?.label || 'Export'}.xlsx`;
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleDelete = async (id) => {
    if (!confirm('Are you sure you want to delete this expense?')) return;
    try {
      await axios.delete(`${API_URL}/expenses/${id}/`);
      fetchExpenses();
    } catch (err) {
      console.error(err);
      alert('Failed to delete expense.');
    }
  };

  const startEdit = (expense) => {
    setEditingExpense(expense);
    setEditFormData({
      category: expense.category.toString(),
      sub_category: expense.sub_category,
      date: expense.date || expense.month,
      description: expense.description,
      amount: expense.amount,
      reference_no: expense.reference_no || '',
      tag: expense.tag || ''
    });
  };

  const handleEditChange = (e) => {
    setEditFormData({ ...editFormData, [e.target.name]: e.target.value });
  };

  const saveEdit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const payload = {
        ...editFormData,
        month: editFormData.date, // Backwards compatibility for testing against old backend
        tag: editFormData.tag || null,
        reference_no: editFormData.reference_no || null
      };
      await axios.patch(`${API_URL}/expenses/${editingExpense.id}/`, payload);
      setEditingExpense(null);
      fetchExpenses();
    } catch (err) {
      console.error(err);
      alert('Failed to update expense.');
    } finally {
      setLoading(false);
    }
  };

  const isCapex = editFormData.category && categories.find(c => c.id.toString() === editFormData.category)?.name.toLowerCase().includes('capex');
  const isOther = editFormData.category && categories.find(c => c.id.toString() === editFormData.category)?.name.toLowerCase().includes('other');

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      <div className="flex justify-between items-center bg-transparent">
        <div>
          <h2 className="text-2xl font-bold theme-text flex items-center gap-3">
            <History className="theme-accent-text" size={28} />
            Expense History
          </h2>
          <p className="text-sm theme-text-muted mt-1">Review, manage, and export historical maintenance expenses.</p>
        </div>
        <button 
          onClick={handleExportExcel}
          disabled={expenses.length === 0}
          className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white font-medium rounded-lg shadow-sm flex items-center gap-2 transition-colors disabled:opacity-50 disabled:hover:bg-green-600"
        >
          <Download size={18} /> Export Excel
        </button>
      </div>

      <div className="theme-panel rounded-xl overflow-hidden p-6 flex items-end gap-6 border theme-border">
        <div className="flex-1">
          <label className="block text-xs font-bold theme-text-muted uppercase tracking-wider mb-2">From Date</label>
          <input 
            type="date" 
            value={fromDate} 
            onChange={(e) => setFromDate(e.target.value)}
            className="w-full bg-black/5 dark:bg-white/5 border theme-border rounded-lg px-4 py-2 text-sm theme-text focus:ring-2 theme-ring outline-none"
          />
        </div>
        <div className="flex-1">
          <label className="block text-xs font-bold theme-text-muted uppercase tracking-wider mb-2">To Date</label>
          <input 
            type="date" 
            value={toDate} 
            onChange={(e) => setToDate(e.target.value)}
            className="w-full bg-black/5 dark:bg-white/5 border theme-border rounded-lg px-4 py-2 text-sm theme-text focus:ring-2 theme-ring outline-none"
          />
        </div>
        <div className="flex-1">
          <label className="block text-xs font-bold theme-text-muted uppercase tracking-wider mb-2">Filter Category</label>
          <select 
            value={filterCategory} 
            onChange={(e) => setFilterCategory(e.target.value)}
            className="w-full bg-black/5 dark:bg-white/5 border theme-border rounded-lg px-4 py-2 text-sm theme-text focus:ring-2 theme-ring outline-none cursor-pointer"
          >
            <option value="">All Categories</option>
            {activeCategories.map(c => (
              <option key={c.id} value={c.id}>{c.name}</option>
            ))}
          </select>
        </div>
      </div>

      <div className="theme-panel rounded-2xl overflow-hidden shadow-sm border theme-border">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b theme-border bg-black/5 dark:bg-white/5">
                <th className="px-6 py-4 text-sm font-semibold theme-text">Date</th>
                <th className="px-6 py-4 text-sm font-semibold theme-text">Category</th>
                <th className="px-6 py-4 text-sm font-semibold theme-text">Description & Ref</th>
                <th className="px-6 py-4 text-sm font-semibold theme-text text-right">Amount (₹)</th>
                <th className="px-6 py-4 text-sm font-semibold theme-text text-center">Actions</th>
              </tr>
            </thead>
            <tbody>
              {expenses.length === 0 ? (
                <tr>
                  <td colSpan="5" className="px-6 py-12 text-center theme-text-muted">No expenses found for this date range.</td>
                </tr>
              ) : (
                expenses.map((exp) => {
                  const cat = categories.find(c => c.id === exp.category);
                  const tag = tags.find(t => t.id === exp.tag);
                  return (
                    <tr key={exp.id} className="border-b theme-border theme-hover transition-colors">
                      <td className="px-6 py-4 text-sm theme-text whitespace-nowrap">{formatDate(exp.date || exp.month)}</td>
                      <td className="px-6 py-4">
                        <span className="font-bold theme-text block">{cat ? cat.name : 'Unknown'}</span>
                        <div className="flex gap-2 mt-1">
                          <span className="text-xs theme-accent-text inline-block px-2 py-0.5 rounded-full theme-accent-bg/10">{exp.sub_category}</span>
                          {tag && <span className="text-xs text-orange-600 bg-orange-100 dark:bg-orange-900/30 inline-block px-2 py-0.5 rounded-full">{tag.name}</span>}
                        </div>
                      </td>
                      <td className="px-6 py-4 text-sm theme-text">
                        <span className="block">{exp.description}</span>
                        {exp.reference_no && <span className="text-xs theme-text-muted block mt-1">Ref: {exp.reference_no}</span>}
                      </td>
                      <td className="px-6 py-4 text-right font-bold text-red-600 dark:text-red-400 whitespace-nowrap">
                        ₹{parseFloat(exp.amount).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center justify-center gap-2">
                          <button 
                            onClick={() => startEdit(exp)}
                            className="p-2 text-blue-500 hover:bg-blue-500/10 rounded-lg transition-colors"
                            title="Edit"
                          >
                            <Edit2 size={18} />
                          </button>
                          <button 
                            onClick={() => handleDelete(exp.id)}
                            className="p-2 text-red-500 hover:bg-red-500/10 rounded-lg transition-colors"
                            title="Delete"
                          >
                            <Trash2 size={18} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Edit Modal */}
      {editingExpense && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="theme-panel rounded-2xl w-full max-w-2xl overflow-hidden shadow-2xl border theme-border animate-in fade-in zoom-in duration-200">
            <div className="px-8 py-5 border-b theme-border flex justify-between items-center bg-black/5 dark:bg-white/5">
              <h3 className="text-xl font-bold theme-text flex items-center gap-2">
                <Edit2 className="theme-accent-text" /> Edit Expense
              </h3>
              <button onClick={() => setEditingExpense(null)} className="text-gray-500 hover:text-gray-800 dark:hover:text-gray-200 transition-colors p-1">
                <X size={24} />
              </button>
            </div>
            <form onSubmit={saveEdit} className="p-8 space-y-5">
              <div className="grid grid-cols-2 gap-6">
                <div>
                  <label className="block text-xs font-bold theme-text-muted uppercase tracking-wider mb-2">Date</label>
                  <input type="date" name="date" required value={editFormData.date} onChange={handleEditChange} className="w-full bg-black/5 dark:bg-white/5 border theme-border rounded-lg px-4 py-2.5 text-sm theme-text focus:ring-2 theme-ring outline-none" />
                </div>
                <div>
                  <label className="block text-xs font-bold theme-text-muted uppercase tracking-wider mb-2">Category</label>
                  <select name="category" required value={editFormData.category} onChange={handleEditChange} className="w-full bg-black/5 dark:bg-white/5 border theme-border rounded-lg px-4 py-2.5 text-sm theme-text focus:ring-2 theme-ring outline-none">
                    <option value="" disabled>Select Category</option>
                    {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                  </select>
                </div>
                
                {isCapex && (
                  <div className="col-span-2">
                    <label className="block text-xs font-bold theme-text-muted uppercase tracking-wider mb-2">CAPEX Tag</label>
                    <select name="tag" value={editFormData.tag || ''} onChange={handleEditChange} className="w-full bg-black/5 dark:bg-white/5 border theme-border rounded-lg px-4 py-2.5 text-sm theme-text focus:ring-2 theme-ring outline-none">
                      <option value="">No Building/Project</option>
                      {tags.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
                    </select>
                  </div>
                )}
                
                <div className="col-span-2">
                  <label className="block text-xs font-bold theme-text-muted uppercase tracking-wider mb-2">Sub-Category</label>
                  <div className="flex gap-4 p-1 rounded-lg border theme-border bg-black/5 dark:bg-white/5">
                    <label className={`flex-1 text-center py-2 rounded-md cursor-pointer text-sm font-medium transition-colors ${editFormData.sub_category === 'ACTUAL' ? 'theme-accent-bg text-white shadow-sm' : 'theme-text-muted theme-hover'}`}>
                      <input type="radio" name="sub_category" value="ACTUAL" className="hidden" checked={editFormData.sub_category === 'ACTUAL'} onChange={handleEditChange} />
                      Actual
                    </label>
                    {!isCapex && (
                      <label className={`flex-1 text-center py-2 rounded-md cursor-pointer text-sm font-medium transition-colors ${editFormData.sub_category === 'ADDITIONAL' ? 'theme-accent-bg text-white shadow-sm' : 'theme-text-muted theme-hover'}`}>
                        <input type="radio" name="sub_category" value="ADDITIONAL" className="hidden" checked={editFormData.sub_category === 'ADDITIONAL'} onChange={handleEditChange} />
                        Additional Work
                      </label>
                    )}
                    <label className={`flex-1 text-center py-2 rounded-md cursor-pointer text-sm font-medium transition-colors ${editFormData.sub_category === 'OTHERS' ? 'theme-accent-bg text-white shadow-sm' : 'theme-text-muted theme-hover'}`}>
                      <input type="radio" name="sub_category" value="OTHERS" className="hidden" checked={editFormData.sub_category === 'OTHERS'} onChange={handleEditChange} />
                      Others
                    </label>
                  </div>
                </div>

                <div className="col-span-2">
                  <label className="block text-xs font-bold theme-text-muted uppercase tracking-wider mb-2">Description</label>
                  <input type="text" name="description" required value={editFormData.description} onChange={handleEditChange} placeholder="What was this expense for?" className="w-full bg-black/5 dark:bg-white/5 border theme-border rounded-lg px-4 py-2.5 text-sm theme-text focus:ring-2 theme-ring outline-none" />
                </div>
                
                <div>
                  <label className="block text-xs font-bold theme-text-muted uppercase tracking-wider mb-2">Amount (₹)</label>
                  <input type="number" step="0.01" name="amount" required value={editFormData.amount} onChange={handleEditChange} placeholder="0.00" className="w-full bg-black/5 dark:bg-white/5 border theme-border rounded-lg px-4 py-2.5 text-sm theme-text focus:ring-2 theme-ring outline-none font-medium" />
                </div>
                <div>
                  <label className="block text-xs font-bold theme-text-muted uppercase tracking-wider mb-2">Reference / Invoice No.</label>
                  <input type="text" name="reference_no" value={editFormData.reference_no} onChange={handleEditChange} placeholder="Optional" className="w-full bg-black/5 dark:bg-white/5 border theme-border rounded-lg px-4 py-2.5 text-sm theme-text focus:ring-2 theme-ring outline-none" />
                </div>
              </div>
              
              <div className="pt-4 border-t theme-border flex justify-end gap-3">
                <button type="button" onClick={() => setEditingExpense(null)} className="px-6 py-2.5 border theme-border text-sm font-medium rounded-lg hover:bg-black/5 transition-colors">Cancel</button>
                <button type="submit" disabled={loading} className="px-6 py-2.5 theme-accent-bg text-white font-medium rounded-lg shadow-sm flex items-center gap-2 transition-colors disabled:opacity-70 hover:opacity-80">
                  {loading ? <div className="h-4 w-4 rounded-full border-2 border-white border-t-transparent animate-spin"></div> : <Save size={18} />}
                  Save Changes
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
