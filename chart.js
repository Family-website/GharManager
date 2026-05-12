// ==========================================
// 📊 3. CHARTS & PDF REPORTS
// ==========================================
let categoryChartInstance = null; 
let memberChartInstance = null; 

function renderCategoryChart(dataObj) {
    const ctx = document.getElementById('categoryChart'); if(!ctx) return; 
    if(categoryChartInstance) categoryChartInstance.destroy(); 
    const labels = Object.keys(dataObj); const data = Object.values(dataObj); 
    const hasData = data.some(val => val > 0); 
    const textColor = isDarkMode ? '#fff' : '#333';
    
    categoryChartInstance = new Chart(ctx.getContext('2d'), { 
        type: 'doughnut', 
        data: { 
            labels: labels, 
            datasets: [{ 
                data: hasData ? data : [1], 
                backgroundColor: hasData ? ['#2563eb', '#ef4444', '#10b981', '#f59e0b', '#8b5cf6', '#64748b'] : ['#ecf0f1'], 
                borderWidth: 2, 
                borderColor: isDarkMode ? '#1e293b' : '#fff' 
            }] 
        }, 
        options: { responsive: true, plugins: { legend: { position: 'bottom', labels: { color: textColor, font: {size: 11} } } }, cutout: '70%' } 
    });
}

function renderMemberChart(dataObj) {
    const ctx = document.getElementById('memberChart'); if(!ctx) return; 
    if(memberChartInstance) memberChartInstance.destroy(); 
    const labels = Object.keys(dataObj); const data = Object.values(dataObj); 
    const hasData = data.some(val => val > 0); 
    const textColor = isDarkMode ? '#fff' : '#333';
    
    memberChartInstance = new Chart(ctx.getContext('2d'), { 
        type: 'pie', 
        data: { 
            labels: labels, 
            datasets: [{ 
                data: hasData ? data : [1], 
                backgroundColor: hasData ? ['#2980b9', '#e84393', '#27ae60', '#8e44ad', '#16a085'] : ['#ecf0f1'], 
                borderWidth: 2, 
                borderColor: isDarkMode ? '#1e293b' : '#fff' 
            }] 
        }, 
        options: { responsive: true, plugins: { legend: { position: 'bottom', labels: { color: textColor, font: {size: 12, weight: 'bold'} } } } } 
    });
}

async function shareReport() {
    if(!window.jspdf) return Swal.fire('Wait', 'PDF library load ho rahi hai.', 'info');
    const filterMonth = document.getElementById('month-filter').value;
    const dataToExport = familyExpenses.filter(item => item.date && item.date.startsWith(filterMonth));
    if(dataToExport.length === 0) return Swal.fire('Khali hai!', 'Koi record nahi hai.', 'info');
    
    const { jsPDF } = window.jspdf; const doc = new jsPDF();
    doc.setFillColor(30, 60, 114); doc.rect(0, 0, 210, 22, 'F'); doc.setTextColor(255, 255, 255); 
    doc.setFontSize(18); doc.text(`GharManager (${filterMonth})`, 14, 15);
    
    const tableColumn = ["Date", "Name", "Category", "Details", "Amount"]; 
    const tableRows = []; let totalAmount = 0;
    
    [...dataToExport].sort((a, b) => new Date(b.date) - new Date(a.date)).forEach(exp => { 
        const p = exp.date.split('-'); 
        tableRows.push([`${p[2]}/${p[1]}`, exp.member || '-', exp.category || 'Other', exp.description, `Rs ${exp.amount}`]); 
        totalAmount += exp.amount; 
    });
    
    doc.autoTable({ head: [tableColumn], body: tableRows, startY: 30, theme: 'grid', headStyles: { fillColor: [46, 204, 113] }, foot: [["", "", "", "Total :", `Rs ${totalAmount}`]], footStyles: { fillColor: [231, 76, 60] } });
    
    const pdfBlob = doc.output('blob'); const fileName = `GharManager_${filterMonth}.pdf`; 
    const pdfFile = new File([pdfBlob], fileName, { type: 'application/pdf' });
    
    if (navigator.canShare && navigator.canShare({ files: [pdfFile] })) { 
        try { await navigator.share({ title: `Hisaab - ${filterMonth}`, text: `Total kharcha: ₹${totalAmount}.`, files: [pdfFile] }); } catch (error) { console.log('Share cancel hua:', error); } 
    } else { doc.save(fileName); }
}

function exportToPDF() { shareReport(); }

