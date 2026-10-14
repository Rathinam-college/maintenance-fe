import React, { useState, useEffect } from 'react';
import axios from 'axios';
import ExcelJS from 'exceljs';
import { saveAs } from 'file-saver';
import { Download } from 'lucide-react';

const API_URL = import.meta.env.VITE_API_URL || (window.location.hostname === 'localhost' ? 'http://localhost:8005/api' : '/maintenance/api');

export default function SummaryView({ activeFY }) {
  const [data, setData] = useState({});
  const [loading, setLoading] = useState(true);
  const [months, setMonths] = useState([]);

  useEffect(() => {
    if (!activeFY) return;
    
    // Generate months dynamically based on activeFY start and end dates
    const start = new Date(activeFY.start_date);
    const end = new Date(activeFY.end_date);
    const generatedMonths = [];
    
    let current = new Date(start);
    // Setting day to 1 avoids edge cases with months of different lengths
    current.setDate(1); 
    
    while (current <= end || (current.getFullYear() === end.getFullYear() && current.getMonth() === end.getMonth())) {
      const year = current.getFullYear();
      const month = String(current.getMonth() + 1).padStart(2, '0');
      const shortYear = String(year).slice(-2);
      const monthLabel = current.toLocaleString('default', { month: 'short' });
      
      generatedMonths.push({
        key: `${year}-${month}`,
        label: `${monthLabel}'${shortYear}`
      });
      
      current.setMonth(current.getMonth() + 1);
    }
    setMonths(generatedMonths);

    setLoading(true);
    axios.get(`${API_URL}/summary/?financial_year=${activeFY.id}`)
      .then(res => setData(res.data))
      .catch(err => console.error(err))
      .finally(() => setLoading(false));
  }, [activeFY]);

  const formatCurrency = (amount) => {
    if (!amount || amount === 0) return '';
    return new Intl.NumberFormat('en-IN', { maximumFractionDigits: 0 }).format(amount);
  };

  if (loading) {
    return <div className="flex h-64 items-center justify-center"><div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div></div>;
  }

  // Calculate bottom totals
  const monthlyTotals = {};
  let overallSanctioned = 0;
  let overallTotal = 0;
  let overallActualTotal = 0;
  let overallAdditionalTotal = 0;
  let overallOthersTotal = 0;

  months.forEach(m => {
    monthlyTotals[m.key] = { ACTUAL: 0, ADDITIONAL: 0, OTHERS: 0 };
  });

  Object.keys(data).forEach(cat => {
    const catData = data[cat];
    overallSanctioned += (catData.sanctioned || 0);
    months.forEach(m => {
      const actual = catData.months[m.key]?.ACTUAL || 0;
      const additional = catData.months[m.key]?.ADDITIONAL || 0;
      const others = catData.months[m.key]?.OTHERS || 0;
      
      monthlyTotals[m.key].ACTUAL += actual;
      monthlyTotals[m.key].ADDITIONAL += additional;
      monthlyTotals[m.key].OTHERS += others;
      
      overallActualTotal += actual;
      overallAdditionalTotal += additional;
      overallOthersTotal += others;
      overallTotal += actual + additional + others;
    });
  });

  const exportToExcel = async () => {
    const workbook = new ExcelJS.Workbook();
    const sheet = workbook.addWorksheet('Summary');

    // Define columns
    const columns = [
      { header: 'Head / Category', key: 'category', width: 25 },
      { header: 'Sanctioned Amount', key: 'sanctioned', width: 18 },
      { header: 'Particulars', key: 'particulars', width: 15 },
      ...months.map(m => ({ header: m.label, key: m.key, width: 12 })),
      { header: 'Total', key: 'total', width: 15 },
      { header: 'Category Total', key: 'catTotal', width: 15 },
      { header: 'Balance', key: 'balance', width: 15 },
    ];
    sheet.columns = columns;

    // Insert title rows
    sheet.spliceRows(1, 0, []);
    sheet.spliceRows(1, 0, [`Monthly Spend Summary for Financial Year: ${activeFY?.label || ''} (${activeFY?.start_date} to ${activeFY?.end_date})`]);
    
    sheet.mergeCells(1, 1, 1, 6 + months.length);
    const titleRow = sheet.getRow(1);
    titleRow.font = { bold: true, size: 16, color: { argb: 'FF1F2937' } };
    titleRow.alignment = { vertical: 'middle', horizontal: 'center' };
    titleRow.height = 30;

    // Style header row (now moved to row 3)
    const headerRow = sheet.getRow(3);
    headerRow.font = { color: { argb: 'FFFFFFFF' }, bold: true, size: 11 };
    headerRow.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FF1E3A8A' } // Deep Blue
    };
    headerRow.alignment = { vertical: 'middle', horizontal: 'center' };

    let currentRow = 4;

    // Iterate over categories
    Object.keys(data).forEach((categoryName) => {
      const catData = data[categoryName];
      let catActualTotal = 0;
      let catAdditionalTotal = 0;
      let catOthersTotal = 0;

      months.forEach(m => {
        catActualTotal += catData.months[m.key]?.ACTUAL || 0;
        catAdditionalTotal += catData.months[m.key]?.ADDITIONAL || 0;
        catOthersTotal += catData.months[m.key]?.OTHERS || 0;
      });
      let catGrandTotal = catActualTotal + catAdditionalTotal + catOthersTotal;
      let balance = catData.sanctioned - catGrandTotal;

      const startRow = currentRow;

      // Actual Row
      const row1 = sheet.getRow(currentRow++);
      row1.values = {
        category: categoryName,
        sanctioned: Number(catData.sanctioned) || 0,
        particulars: 'Actual',
        total: Number(catActualTotal) || 0,
        catTotal: Number(catGrandTotal) || 0,
        balance: Number(balance) || 0,
      };
      months.forEach(m => row1.getCell(m.key).value = Number(catData.months[m.key]?.ACTUAL) || 0);

      // Additional Row
      const row2 = sheet.getRow(currentRow++);
      row2.values = {
        particulars: 'Additional Work',
        total: Number(catAdditionalTotal) || 0,
      };
      months.forEach(m => row2.getCell(m.key).value = Number(catData.months[m.key]?.ADDITIONAL) || 0);

      // Others Row
      const row3 = sheet.getRow(currentRow++);
      row3.values = {
        particulars: 'Others',
        total: Number(catOthersTotal) || 0,
      };
      months.forEach(m => row3.getCell(m.key).value = Number(catData.months[m.key]?.OTHERS) || 0);

      // Merge Cells vertically
      sheet.mergeCells(`A${startRow}:A${startRow + 2}`); // Category
      sheet.mergeCells(`B${startRow}:B${startRow + 2}`); // Sanctioned
      
      // Total column indices
      const totalCol = 3 + months.length + 1;
      const catTotalCol = totalCol + 1;
      const balanceCol = catTotalCol + 1;
      
      sheet.mergeCells(startRow, catTotalCol, startRow + 2, catTotalCol); // Cat Total
      sheet.mergeCells(startRow, balanceCol, startRow + 2, balanceCol); // Balance

      // Base row fills
      row1.eachCell(cell => { cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFFFFFF' } }; });
      row2.eachCell(cell => { cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFFFBEB' } }; }); // Amber-50
      row3.eachCell(cell => { cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF1F5F9' } }; }); // Slate-50

      // Formatting category cell
      const catCell = sheet.getCell(`A${startRow}`);
      catCell.alignment = { wrapText: true, vertical: 'middle' };
      catCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFEFF6FF' } }; // Blue-50
      catCell.font = { color: { argb: 'FF1E3A8A' }, bold: true }; // Blue-900
      
      // Formatting sanctioned cell
      const sancCell = sheet.getCell(`B${startRow}`);
      sancCell.alignment = { vertical: 'middle', horizontal: 'right' };
      sancCell.numFmt = '"₹" #,##0';
      sancCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFECFDF5' } }; // Emerald-50
      sancCell.font = { color: { argb: 'FF047857' }, bold: true }; // Emerald-700

      // Format catTotal cell
      const catTotalCell = sheet.getCell(startRow, catTotalCol);
      catTotalCell.alignment = { vertical: 'middle', horizontal: 'right' };
      catTotalCell.numFmt = '"₹" #,##0';
      catTotalCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFDBEAFE' } }; // Blue-100
      catTotalCell.font = { color: { argb: 'FF1D4ED8' }, bold: true }; // Blue-700

      // Format balance cell
      const balCell = sheet.getCell(startRow, balanceCol);
      balCell.alignment = { vertical: 'middle', horizontal: 'right' };
      balCell.numFmt = '"₹" #,##0;[Red]"₹" -#,##0';
      balCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFD1FAE5' } }; // Emerald-100
      balCell.font = { color: { argb: balance < 0 ? 'FFDC2626' : 'FF047857' }, bold: true };

      // Format particulars
      row1.getCell('particulars').font = { color: { argb: 'FF64748B' }, bold: true };
      row2.getCell('particulars').font = { color: { argb: 'FF64748B' }, bold: true };
      row2.getCell('particulars').alignment = { wrapText: true };
      row3.getCell('particulars').font = { color: { argb: 'FF64748B' }, bold: true };

      // Format numbers
      [row1, row2, row3].forEach(row => {
        months.forEach(m => {
          row.getCell(m.key).numFmt = '"₹" #,##0';
        });
        row.getCell('total').numFmt = '"₹" #,##0';
        row.getCell('total').font = { color: { argb: 'FF0F172A' }, bold: true };
      });
      
      // Add thin bottom border
      row3.eachCell(cell => {
        cell.border = { bottom: { style: 'thin', color: { argb: 'FFCBD5E1' } } };
      });
    });

    // Footer / Grand Totals
    const footerStartRow = currentRow;
    const fRow1 = sheet.getRow(currentRow++);
    fRow1.values = {
      category: 'Grand Total',
      sanctioned: Number(overallSanctioned) || 0,
      particulars: 'Actual',
      total: Number(overallActualTotal) || 0,
      catTotal: Number(overallTotal) || 0,
      balance: Number(overallSanctioned - overallTotal) || 0,
    };
    months.forEach(m => fRow1.getCell(m.key).value = Number(monthlyTotals[m.key].ACTUAL) || 0);

    const fRow2 = sheet.getRow(currentRow++);
    fRow2.values = {
      particulars: 'Additional Work',
      total: Number(overallAdditionalTotal) || 0,
    };
    months.forEach(m => fRow2.getCell(m.key).value = Number(monthlyTotals[m.key].ADDITIONAL) || 0);

    const fRow3 = sheet.getRow(currentRow++);
    fRow3.values = {
      particulars: 'Others',
      total: Number(overallOthersTotal) || 0,
    };
    months.forEach(m => fRow3.getCell(m.key).value = Number(monthlyTotals[m.key].OTHERS) || 0);

    // Merge footer
    sheet.mergeCells(`A${footerStartRow}:A${footerStartRow + 2}`);
    sheet.mergeCells(`B${footerStartRow}:B${footerStartRow + 2}`);
    
    const totalCol = 3 + months.length + 1;
    const catTotalCol = totalCol + 1;
    const balanceCol = catTotalCol + 1;
    
    sheet.mergeCells(footerStartRow, catTotalCol, footerStartRow + 2, catTotalCol);
    sheet.mergeCells(footerStartRow, balanceCol, footerStartRow + 2, balanceCol);

    // Style footer
    [fRow1, fRow2, fRow3].forEach(row => {
      row.eachCell(cell => {
        cell.font = { color: { argb: 'FFFFFFFF' }, bold: true };
        cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF1E293B' } }; // Dark Slate
        if (cell._column.key !== 'category' && cell._column.key !== 'particulars') {
          cell.numFmt = '"₹" #,##0';
        }
      });
    });

    sheet.getCell(`A${footerStartRow}`).alignment = { vertical: 'middle' };
    sheet.getCell(`B${footerStartRow}`).alignment = { vertical: 'middle', horizontal: 'right' };
    sheet.getCell(`B${footerStartRow}`).font = { color: { argb: 'FF34D399' }, bold: true }; // Emerald-400
    
    const fCatTotalCell = sheet.getCell(footerStartRow, catTotalCol);
    fCatTotalCell.alignment = { vertical: 'middle', horizontal: 'right' };
    fCatTotalCell.font = { color: { argb: 'FF60A5FA' }, bold: true }; // Blue-400
    fCatTotalCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF0F172A' } }; // Darker Slate

    const overallBalance = overallSanctioned - overallTotal;
    const fBalCell = sheet.getCell(footerStartRow, balanceCol);
    fBalCell.alignment = { vertical: 'middle', horizontal: 'right' };
    fBalCell.font = { color: { argb: overallBalance < 0 ? 'FFF87171' : 'FF34D399' }, bold: true };
    fBalCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF0F172A' } };
    fBalCell.numFmt = '"₹" #,##0;[Red]"₹" -#,##0';

    // Add thick borders to the footer
    [fRow1, fRow2, fRow3].forEach(row => {
      row.eachCell(cell => {
        cell.border = {
          top: {style:'medium', color: { argb: 'FF94A3B8' }},
          bottom: {style:'medium', color: { argb: 'FF94A3B8' }}
        };
      });
    });

    // Save the file
    const buffer = await workbook.xlsx.writeBuffer();
    const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
    saveAs(blob, `Maintenance_Summary_${activeFY?.label || 'Export'}.xlsx`);
  };

  return (
    <div className="theme-panel rounded-2xl overflow-hidden flex flex-col h-[calc(100vh-8rem)]">
      <div className="px-6 py-5 border-b theme-border flex justify-between items-center bg-transparent">
        <h2 className="text-xl font-bold theme-text">Month-Wise Expenditure Summary</h2>
        <button
          onClick={exportToExcel}
          className="flex items-center gap-2 px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg font-medium transition-colors shadow-sm"
        >
          <Download size={18} />
          Export to Excel
        </button>
      </div>
      
      <div className="overflow-auto flex-1 p-0 custom-scrollbar">
        <table className="w-full text-left border-collapse whitespace-nowrap">
          <thead className="sticky top-0 theme-sticky z-20 shadow-sm">
            <tr>
              <th className="px-3 py-3 text-sm font-semibold theme-text border-r theme-border sticky left-0 z-30 theme-sticky leading-tight" style={{ minWidth: '160px', maxWidth: '160px', left: 0 }}>Head / Category</th>
              <th className="px-3 py-3 text-sm font-semibold theme-text border-r theme-border text-right leading-tight sticky z-30 theme-sticky" style={{ minWidth: '110px', maxWidth: '110px', left: '160px' }}>
                Sanctioned<br />Amount
              </th>
              <th className="px-3 py-3 text-sm font-semibold theme-text border-r theme-border sticky z-30 theme-sticky" style={{ minWidth: '110px', maxWidth: '110px', left: '270px' }}>Particulars</th>
              {months.map(m => (
                <th key={m.key} className="px-3 py-3 text-sm font-semibold theme-text border-r theme-border text-right">{m.label}</th>
              ))}
              <th className="px-3 py-3 text-sm font-semibold theme-text border-r theme-border text-right sticky z-30 theme-sticky" style={{ minWidth: '90px', maxWidth: '90px', right: '200px' }}>Total</th>
              <th className="px-3 py-3 text-sm font-semibold theme-text border-r theme-border text-right sticky z-30 theme-sticky leading-tight" style={{ minWidth: '100px', maxWidth: '100px', right: '100px' }}>Category<br/>Total</th>
              <th className="px-3 py-3 text-sm font-semibold theme-accent-text theme-sticky-accent text-right sticky right-0 z-30 leading-tight" style={{ minWidth: '100px', maxWidth: '100px', right: 0 }}>Balance</th>
            </tr>
          </thead>
          <tbody className="theme-border">
            {Object.keys(data).length === 0 ? (
              <tr><td colSpan={14} className="p-8 text-center theme-text-muted">No data available yet. Add entries in the Ledger.</td></tr>
            ) : Object.keys(data).map((categoryName) => {
              const catData = data[categoryName];
              
              // Calculate grand totals for this category across all months
              let catActualTotal = 0;
              let catAdditionalTotal = 0;
              let catOthersTotal = 0;
              
              months.forEach(m => {
                catActualTotal += catData.months[m.key]?.ACTUAL || 0;
                catAdditionalTotal += catData.months[m.key]?.ADDITIONAL || 0;
                catOthersTotal += catData.months[m.key]?.OTHERS || 0;
              });
              let catGrandTotal = catActualTotal + catAdditionalTotal + catOthersTotal;
              
              return (
                <React.Fragment key={categoryName}>
                  {/* ACTUAL ROW */}
                  <tr className="theme-hover transition-colors theme-row-actual">
                    <td className="px-3 py-2 text-sm font-bold theme-text border-r theme-border sticky left-0 z-10 theme-sticky" rowSpan="3" style={{ minWidth: '160px', maxWidth: '160px', left: 0 }}>
                      <div className="whitespace-normal leading-tight break-words" title={categoryName}>{categoryName}</div>
                    </td>
                    <td className="px-3 py-2 text-sm font-bold text-blue-600 dark:text-blue-400 border-r theme-border text-right sticky z-10 theme-sticky" rowSpan="3" style={{ minWidth: '110px', maxWidth: '110px', left: '160px' }}>
                      {formatCurrency(catData.sanctioned)}
                    </td>
                    <td className="px-3 py-2 text-xs theme-text font-bold border-r theme-border sticky z-10 theme-sticky" style={{ minWidth: '110px', maxWidth: '110px', left: '270px' }}>Actual</td>
                    {months.map(m => {
                      const amount = catData.months[m.key]?.ACTUAL || 0;
                      return <td key={m.key} className="px-3 py-2 text-sm theme-text border-r theme-border text-right">{formatCurrency(amount)}</td>
                    })}
                    <td className="px-3 py-2 text-sm theme-text font-bold border-r theme-border text-right sticky z-10 theme-sticky" style={{ minWidth: '90px', maxWidth: '90px', right: '200px' }}>
                      {formatCurrency(catActualTotal)}
                    </td>
                    <td className="px-3 py-2 text-sm font-bold theme-text border-r theme-border text-right sticky z-10 theme-sticky" rowSpan="3" style={{ minWidth: '100px', maxWidth: '100px', right: '100px' }}>
                      {formatCurrency(catGrandTotal)}
                    </td>
                    <td className={`px-3 py-2 text-sm font-bold border-r theme-border text-right sticky right-0 z-10 theme-sticky-accent ${(catData.sanctioned - catGrandTotal) < 0 ? 'text-red-500 dark:text-red-400' : 'theme-accent-text'}`} rowSpan="3" style={{ minWidth: '100px', maxWidth: '100px', right: 0 }}>
                      {formatCurrency(catData.sanctioned - catGrandTotal)}
                    </td>
                  </tr>
                  
                  {/* ADDITIONAL ROW */}
                  <tr className="theme-hover transition-colors theme-row-additional border-t border-opacity-10 theme-border">
                    <td className="px-3 py-2 text-xs theme-text-muted border-r theme-border font-medium sticky z-10 theme-sticky whitespace-normal leading-tight break-words" style={{ minWidth: '110px', maxWidth: '110px', left: '270px' }}>Additional Work</td>
                    {months.map(m => {
                      const amount = catData.months[m.key]?.ADDITIONAL || 0;
                      return <td key={m.key} className="px-3 py-2 text-sm theme-text border-r theme-border text-right">{formatCurrency(amount)}</td>
                    })}
                    <td className="px-3 py-2 text-sm theme-text font-bold border-r theme-border text-right sticky z-10 theme-sticky" style={{ minWidth: '90px', maxWidth: '90px', right: '200px' }}>
                      {formatCurrency(catAdditionalTotal)}
                    </td>
                  </tr>
                  
                  {/* OTHERS ROW */}
                  <tr className="theme-hover transition-colors theme-row-others border-t border-opacity-10 border-b theme-border">
                    <td className="px-3 py-2 text-xs theme-text-muted opacity-80 border-r theme-border font-medium sticky z-10 theme-sticky" style={{ minWidth: '110px', maxWidth: '110px', left: '270px' }}>Others</td>
                    {months.map(m => {
                      const amount = catData.months[m.key]?.OTHERS || 0;
                      return <td key={m.key} className="px-3 py-2 text-sm theme-text border-r theme-border text-right">{formatCurrency(amount)}</td>
                    })}
                    <td className="px-3 py-2 text-sm theme-text font-bold border-r theme-border text-right sticky z-10 theme-sticky" style={{ minWidth: '90px', maxWidth: '90px', right: '200px' }}>
                      {formatCurrency(catOthersTotal)}
                    </td>
                  </tr>
                </React.Fragment>
              )
            })}
          </tbody>
          <tfoot className="sticky bottom-0 z-20 shadow-[0_-2px_10px_rgba(0,0,0,0.1)] theme-sticky border-t-2 theme-border">
            <tr className="theme-hover transition-colors">
              <td className="px-3 py-3 text-sm font-bold theme-text border-r theme-border sticky left-0 z-30 theme-sticky" rowSpan="3" style={{ minWidth: '160px', maxWidth: '160px', left: 0 }}>
                Grand Total
              </td>
              <td className="px-3 py-3 text-sm font-bold text-blue-600 dark:text-blue-400 border-r theme-border text-right sticky z-30 theme-sticky" rowSpan="3" style={{ minWidth: '110px', maxWidth: '110px', left: '160px' }}>
                {formatCurrency(overallSanctioned)}
              </td>
              <td className="px-3 py-3 text-xs theme-text font-bold border-r theme-border sticky z-30 theme-sticky" style={{ minWidth: '110px', maxWidth: '110px', left: '270px' }}>Actual</td>
              {months.map(m => (
                <td key={m.key} className="px-3 py-3 text-sm font-bold theme-text border-r theme-border text-right">{formatCurrency(monthlyTotals[m.key].ACTUAL)}</td>
              ))}
              <td className="px-3 py-3 text-sm font-bold theme-text border-r theme-border text-right sticky z-30 theme-sticky" style={{ minWidth: '90px', maxWidth: '90px', right: '200px' }}>
                {formatCurrency(overallActualTotal)}
              </td>
              <td className="px-3 py-3 text-sm font-bold theme-text border-r theme-border text-right sticky z-30 theme-sticky" rowSpan="3" style={{ minWidth: '100px', maxWidth: '100px', right: '100px' }}>
                {formatCurrency(overallTotal)}
              </td>
              <td className={`px-3 py-3 text-sm font-bold border-r theme-border text-right sticky right-0 z-30 theme-sticky-accent ${(overallSanctioned - overallTotal) < 0 ? 'text-red-500 dark:text-red-400' : 'theme-accent-text'}`} rowSpan="3" style={{ minWidth: '100px', maxWidth: '100px', right: 0 }}>
                {formatCurrency(overallSanctioned - overallTotal)}
              </td>
            </tr>
            <tr className="theme-hover transition-colors">
              <td className="px-3 py-3 text-xs theme-text font-bold border-r theme-border sticky z-30 theme-sticky whitespace-normal leading-tight break-words" style={{ minWidth: '110px', maxWidth: '110px', left: '270px' }}>Additional Work</td>
              {months.map(m => (
                <td key={m.key} className="px-3 py-3 text-sm font-bold theme-text border-r theme-border text-right">{formatCurrency(monthlyTotals[m.key].ADDITIONAL)}</td>
              ))}
              <td className="px-3 py-3 text-sm font-bold theme-text border-r theme-border text-right sticky z-30 theme-sticky" style={{ minWidth: '90px', maxWidth: '90px', right: '200px' }}>
                {formatCurrency(overallAdditionalTotal)}
              </td>
            </tr>
            <tr className="theme-hover transition-colors">
              <td className="px-3 py-3 text-xs theme-text font-bold border-r theme-border sticky z-30 theme-sticky" style={{ minWidth: '110px', maxWidth: '110px', left: '270px' }}>Others</td>
              {months.map(m => (
                <td key={m.key} className="px-3 py-3 text-sm font-bold theme-text border-r theme-border text-right">{formatCurrency(monthlyTotals[m.key].OTHERS)}</td>
              ))}
              <td className="px-3 py-3 text-sm font-bold theme-text border-r theme-border text-right sticky z-30 theme-sticky" style={{ minWidth: '90px', maxWidth: '90px', right: '200px' }}>
                {formatCurrency(overallOthersTotal)}
              </td>
            </tr>
          </tfoot>
        </table>
      </div>
    </div>
  );
}
