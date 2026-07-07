document.addEventListener('DOMContentLoaded', () => {
    // Config form elements
    const configForm = document.getElementById('config-form');
    const maxPagesInput = document.getElementById('max_pages');
    const maxPagesVal = document.getElementById('max_pages_val');
    const btnScrape = document.getElementById('btn-scrape');
    const scrapeSpinner = document.getElementById('scrape-spinner');
    
    // Status indicators
    const statusBadge = document.getElementById('status-badge');
    const statusDot = document.getElementById('status-dot');
    const statusText = document.getElementById('status-text');
    
    // Console / Terminal
    const terminalScreen = document.getElementById('terminal-screen');
    const btnClearLogs = document.getElementById('btn-clear-logs');
    
    // Progress
    const progressContainer = document.getElementById('progress-container');
    const progressLabel = document.getElementById('progress-label');
    const progressPct = document.getElementById('progress-pct');
    const progressFill = document.getElementById('progress-fill');
    
    // Stats cards
    const statTotal = document.getElementById('stat-total');
    const statPrice = document.getElementById('stat-price');
    const statStock = document.getElementById('stat-stock');
    
    // Table, Search and Pagination
    const tableTbody = document.getElementById('table-tbody');
    const tableSearch = document.getElementById('table-search');
    const paginationContainer = document.getElementById('pagination-container');
    const pagStart = document.getElementById('pag-start');
    const pagEnd = document.getElementById('pag-end');
    const pagTotal = document.getElementById('pag-total');
    const btnPagPrev = document.getElementById('btn-pag-prev');
    const btnPagNext = document.getElementById('btn-pag-next');
    const pagPagesList = document.getElementById('pag-pages-list');
    
    // Report Box
    const reportContent = document.getElementById('report-content');

    // Local state variables
    let scrapedData = [];
    let filteredData = [];
    let currentPage = 1;
    const itemsPerPage = 6;
    let sortColumn = null;
    let sortDirection = 'asc';
    
    // Chart instances
    let priceChart = null;
    let ratingChart = null;
    let eventSource = null;

    // 1. Sync Slider UI Value
    maxPagesInput.addEventListener('input', (e) => {
        maxPagesVal.textContent = `${e.target.value} Pages`;
    });

    // 2. Clear Terminal Logs
    btnClearLogs.addEventListener('click', () => {
        terminalScreen.innerHTML = '<div class="terminal-line system-line">> Console logs cleared.</div>';
    });

    // Write logs to terminal
    function appendTerminalLog(message, type = 'system') {
        const line = document.createElement('div');
        line.className = `terminal-line ${type}-line`;
        line.textContent = message;
        terminalScreen.appendChild(line);
        terminalScreen.scrollTop = terminalScreen.scrollHeight;
    }

    // 3. Form Submission & Scraper Runner
    configForm.addEventListener('submit', (e) => {
        e.preventDefault();
        
        // Stop any active scraper stream
        if (eventSource) {
            eventSource.close();
        }
        
        // Gather params
        const targetUrl = document.getElementById('target_url').value;
        const maxPages = maxPagesInput.value;
        const runValidation = document.getElementById('run_validation').checked;
        
        // Set UI to running status
        setScrapingState(true);
        appendTerminalLog(`> Starting ETL pipeline run...`, 'info');
        
        // Build SSE URL
        const sseUrl = `/api/scrape/stream?target_url=${encodeURIComponent(targetUrl)}&max_pages=${maxPages}&run_validation=${runValidation}`;
        
        eventSource = new EventSource(sseUrl);
        
        eventSource.onmessage = function(event) {
            try {
                const data = JSON.parse(event.data);
                
                if (data.type === 'start') {
                    appendTerminalLog(`[SYSTEM] ETL Job Initialized. Targeting max {${data.max_pages}} pages.`, 'system');
                    progressContainer.classList.remove('hidden');
                    updateProgressBar(0, data.max_pages, "Connecting to target server...");
                }
                else if (data.type === 'log') {
                    let logType = 'system';
                    if (data.message.includes('[WARNING]')) logType = 'warn';
                    else if (data.message.includes('[ERROR]')) logType = 'error';
                    else if (data.message.includes('Successfully') || data.message.includes('complete')) logType = 'info';
                    
                    appendTerminalLog(data.message, logType);
                }
                else if (data.type === 'progress') {
                    const pct = Math.round((data.page / data.total_pages) * 100);
                    updateProgressBar(pct, 100, `Extracting catalog page ${data.page} of ${data.total_pages}...`);
                }
                else if (data.type === 'error') {
                    appendTerminalLog(`[FATAL ERROR] Scraping failed: ${data.message}`, 'error');
                    eventSource.close();
                    setScrapingState(false, 'Error');
                }
                else if (data.type === 'done') {
                    appendTerminalLog(`[SUCCESS] Pipeline extraction finished!`, 'info');
                    eventSource.close();
                    setScrapingState(false, 'Idle');
                    updateProgressBar(100, 100, "ETL Pipeline completed successfully.");
                    
                    // Display stats
                    displayStats(data.summary);
                    
                    // Fetch items and update UI dashboard
                    fetchScrapedData();
                    fetchReport();
                }
            } catch (err) {
                appendTerminalLog(`[SYSTEM ERROR] Failed parsing stream data: ${err}`, 'error');
            }
        };

        eventSource.onerror = function() {
            appendTerminalLog("[CONNECTION ERROR] Server-Sent Events stream terminated unexpectedly.", 'error');
            eventSource.close();
            setScrapingState(false, 'Error');
        };
    });

    function setScrapingState(isScraping, statusLabel = 'Scraping') {
        if (isScraping) {
            btnScrape.disabled = true;
            scrapeSpinner.classList.remove('hidden');
            btnScrape.querySelector('.btn-icon').classList.add('hidden');
            
            statusDot.className = 'status-dot scraping';
            statusText.textContent = 'Scraping...';
            
            statTotal.textContent = '-';
            statPrice.textContent = '-';
            statStock.textContent = '-';
        } else {
            btnScrape.disabled = false;
            scrapeSpinner.classList.add('hidden');
            btnScrape.querySelector('.btn-icon').classList.remove('hidden');
            
            if (statusLabel === 'Error') {
                statusDot.className = 'status-dot error';
                statusText.textContent = 'Failed';
            } else {
                statusDot.className = 'status-dot idle';
                statusText.textContent = 'Idle';
            }
        }
    }

    function updateProgressBar(value, max, label) {
        const pct = Math.min(Math.round((value / max) * 100), 100);
        progressPct.textContent = `${pct}%`;
        progressFill.style.width = `${pct}%`;
        progressLabel.textContent = label;
    }

    function displayStats(summary) {
        if (!summary) return;
        statTotal.textContent = summary.total_extracted || 0;
        statPrice.textContent = `₹${(summary.average_price || 0).toFixed(2)}`;
        statStock.textContent = `${(summary.in_stock_percentage || 0).toFixed(1)}%`;
    }

    function fetchScrapedData() {
        fetch('/api/results')
            .then(res => res.json())
            .then(data => {
                scrapedData = data;
                filteredData = [...scrapedData];
                currentPage = 1;
                
                renderTable();
                updateCharts();
            })
            .catch(err => {
                appendTerminalLog(`[SYSTEM] Failed to load results table: ${err}`, 'error');
            });
    }

    function fetchReport() {
        fetch('/api/report')
            .then(res => res.json())
            .then(data => {
                if (!data.report || data.report.includes("No report available")) {
                    reportContent.innerHTML = `
                        <div class="report-empty">
                            <i data-lucide="alert-circle" class="empty-icon"></i>
                            <p>No summary report generated yet.</p>
                        </div>
                    `;
                    lucide.createIcons();
                    return;
                }
                
                // Parse the report text
                const lines = data.report.split('\n');
                let totalProducts = '';
                let avgPrice = '';
                let itemsStock = '';
                let csvPath = '';
                let jsonPath = '';
                
                lines.forEach(line => {
                    if (line.includes('Total Products Extracted')) {
                        totalProducts = line.split(':')[1].trim();
                    } else if (line.includes('Average Product Price')) {
                        avgPrice = line.split(':')[1].trim();
                    } else if (line.includes('Items in Stock')) {
                        itemsStock = line.split(':')[1].trim();
                    } else if (line.includes('Data Export CSV Path')) {
                        csvPath = line.split(':')[1].trim();
                    } else if (line.includes('Data Export JSON Path')) {
                        jsonPath = line.split(':')[1].trim();
                    }
                });

                if (totalProducts) {
                    reportContent.innerHTML = `
                        <div class="premium-report-container">
                            <div class="report-metric-row">
                                <div class="report-metric-card">
                                    <div class="metric-icon"><i data-lucide="package" style="color: #a78bfa;"></i></div>
                                    <div class="metric-details">
                                        <span class="metric-label">Total Extracted</span>
                                        <span class="metric-val text-violet">${totalProducts}</span>
                                    </div>
                                </div>
                                <div class="report-metric-card">
                                    <div class="metric-icon"><i data-lucide="indian-rupee" style="color: #34d399;"></i></div>
                                    <div class="metric-details">
                                        <span class="metric-label">Average Price</span>
                                        <span class="metric-val text-emerald">${avgPrice}</span>
                                    </div>
                                </div>
                            </div>
                            
                            <div class="report-metric-card full-width">
                                <div class="metric-icon"><i data-lucide="check-circle" style="color: #22d3ee;"></i></div>
                                <div class="metric-details" style="width: 100%;">
                                    <div style="display: flex; justify-content: space-between; align-items: center; width: 100%;">
                                        <span class="metric-label">Items in Stock</span>
                                        <span class="metric-val text-cyan">${itemsStock}</span>
                                    </div>
                                    <div class="progress-bar-mini">
                                        <div class="progress-fill-mini" style="width: ${extractPercentage(itemsStock)}%"></div>
                                    </div>
                            </div>
                        </div>
                    `;
                } else {
                    // Fallback to text representation
                    reportContent.innerHTML = `<pre class="report-box">${data.report}</pre>`;
                }
                lucide.createIcons();
            })
            .catch(() => {
                reportContent.innerHTML = `
                    <div class="report-error">
                        <i data-lucide="x-circle" class="error-icon"></i>
                        <p>Error loading report file.</p>
                    </div>
                `;
                lucide.createIcons();
            });
    }

    function extractPercentage(stockStr) {
        const match = stockStr.match(/\(([\d\.]+)%\)/);
        return match ? parseFloat(match[1]) : 0;
    }

    function renderTable() {
        tableTbody.innerHTML = '';
        
        if (filteredData.length === 0) {
            tableTbody.innerHTML = `
                <tr>
                    <td colspan="6" class="table-empty-state">
                        <i data-lucide="info" class="empty-icon"></i>
                        <p>No products match your search query.</p>
                    </td>
                </tr>
            `;
            paginationContainer.classList.add('hidden');
            lucide.createIcons();
            return;
        }

        paginationContainer.classList.remove('hidden');
        pagTotal.textContent = filteredData.length;

        const start = (currentPage - 1) * itemsPerPage;
        const end = Math.min(start + itemsPerPage, filteredData.length);
        
        pagStart.textContent = start + 1;
        pagEnd.textContent = end;

        const paginatedItems = filteredData.slice(start, end);

        paginatedItems.forEach(item => {
            const tr = document.createElement('tr');
            
            const stockBadge = item.in_stock 
                ? '<span class="stock-tag in-stock"><i data-lucide="check" class="btn-icon"></i> In Stock</span>' 
                : '<span class="stock-tag out-stock"><i data-lucide="x" class="btn-icon"></i> Out of Stock</span>';
                
            const ratingVal = parseInt(item.rating) || 0;
            const starsText = '★'.repeat(ratingVal) + '☆'.repeat(5 - ratingVal);
            
            const coverImg = item.image_url 
                ? `<img src="${item.image_url}" class="book-thumbnail" alt="Cover" onerror="this.src='https://images.unsplash.com/photo-1543002588-bfa74002ed7e?q=80&w=120&auto=format&fit=crop'">`
                : `<div class="book-thumbnail" style="display:flex;align-items:center;justify-content:center;background:rgba(255,255,255,0.05);"><i data-lucide="book-open"></i></div>`;
            
            const viewLink = item.detail_url 
                ? `<a href="${item.detail_url}" target="_blank" class="btn-table-action" title="View Source Product"><i data-lucide="external-link"></i></a>` 
                : '-';

            tr.innerHTML = `
                <td>${coverImg}</td>
                <td style="font-weight: 500;">${escapeHtml(item.name)}</td>
                <td class="text-right price-tag">₹${parseFloat(item.price).toFixed(2)}</td>
                <td class="text-center rating-stars" title="${ratingVal} out of 5 stars">${starsText}</td>
                <td class="text-center">${stockBadge}</td>
                <td class="text-center">${viewLink}</td>
            `;
            tableTbody.appendChild(tr);
        });

        lucide.createIcons();
        renderPaginationControls();
    }

    function renderPaginationControls() {
        const totalPages = Math.ceil(filteredData.length / itemsPerPage);
        pagPagesList.innerHTML = '';

        btnPagPrev.disabled = currentPage === 1;
        btnPagNext.disabled = currentPage === totalPages || totalPages === 0;

        for (let i = 1; i <= totalPages; i++) {
            if (totalPages > 5 && Math.abs(currentPage - i) > 1 && i !== 1 && i !== totalPages) {
                if (i === 2 || i === totalPages - 1) {
                    const span = document.createElement('span');
                    span.textContent = '...';
                    span.style.padding = '0 4px';
                    span.style.color = 'var(--text-muted)';
                    pagPagesList.appendChild(span);
                }
                continue;
            }

            const button = document.createElement('button');
            button.className = `pag-page ${currentPage === i ? 'active' : ''}`;
            button.textContent = i;
            button.addEventListener('click', () => {
                currentPage = i;
                renderTable();
            });
            pagPagesList.appendChild(button);
        }
    }

    btnPagPrev.addEventListener('click', () => {
        if (currentPage > 1) {
            currentPage--;
            renderTable();
        }
    });

    btnPagNext.addEventListener('click', () => {
        const totalPages = Math.ceil(filteredData.length / itemsPerPage);
        if (currentPage < totalPages) {
            currentPage++;
            renderTable();
        }
    });

    tableSearch.addEventListener('input', (e) => {
        const query = e.target.value.toLowerCase().trim();
        filteredData = scrapedData.filter(item => {
            return item.name.toLowerCase().includes(query);
        });
        
        currentPage = 1;
        
        if (sortColumn) {
            applySort();
        }
        
        renderTable();
    });

    const sortPriceBtn = document.getElementById('sort-price');
    const sortRatingBtn = document.getElementById('sort-rating');

    sortPriceBtn.addEventListener('click', () => handleSortClick('price', sortPriceBtn));
    sortRatingBtn.addEventListener('click', () => handleSortClick('rating', sortRatingBtn));

    function handleSortClick(column, element) {
        if (sortColumn === column) {
            sortDirection = sortDirection === 'asc' ? 'desc' : 'asc';
        } else {
            sortColumn = column;
            sortDirection = 'asc';
        }
        
        sortPriceBtn.querySelector('i').setAttribute('data-lucide', 'chevrons-up-down');
        sortRatingBtn.querySelector('i').setAttribute('data-lucide', 'chevrons-up-down');
        
        const newIconName = sortDirection === 'asc' ? 'chevron-up' : 'chevron-down';
        element.querySelector('i').setAttribute('data-lucide', newIconName);
        lucide.createIcons();

        applySort();
        renderTable();
    }

    function applySort() {
        filteredData.sort((a, b) => {
            let valA = a[sortColumn];
            let valB = b[sortColumn];

            if (sortColumn === 'price' || sortColumn === 'rating') {
                valA = parseFloat(valA) || 0;
                valB = parseFloat(valB) || 0;
            }

            if (valA < valB) return sortDirection === 'asc' ? -1 : 1;
            if (valA > valB) return sortDirection === 'asc' ? 1 : -1;
            return 0;
        });
    }

    function updateCharts() {
        if (scrapedData.length === 0) return;
        
        if (priceChart) priceChart.destroy();
        if (ratingChart) ratingChart.destroy();

        const priceRanges = ['0-20', '20-30', '30-40', '40-50', '50+'];
        const priceCounts = [0, 0, 0, 0, 0];

        scrapedData.forEach(item => {
            const price = parseFloat(item.price) || 0;
            if (price <= 20) priceCounts[0]++;
            else if (price <= 30) priceCounts[1]++;
            else if (price <= 40) priceCounts[2]++;
            else if (price <= 50) priceCounts[3]++;
            else priceCounts[4]++;
        });

        const priceCtx = document.getElementById('priceChart').getContext('2d');
        priceChart = new Chart(priceCtx, {
            type: 'bar',
            data: {
                labels: priceRanges.map(range => `₹${range}`),
                datasets: [{
                    label: 'Product Count',
                    data: priceCounts,
                    backgroundColor: 'rgba(139, 92, 246, 0.4)',
                    borderColor: '#8b5cf6',
                    borderWidth: 1.5,
                    borderRadius: 6,
                    hoverBackgroundColor: 'rgba(139, 92, 246, 0.7)'
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: { display: false }
                },
                scales: {
                    y: {
                        beginAtZero: true,
                        grid: { color: 'rgba(255, 255, 255, 0.05)' },
                        ticks: { color: '#9ca3af' }
                    },
                    x: {
                        grid: { display: false },
                        ticks: { color: '#9ca3af' }
                    }
                }
            }
        });

        const ratingsCounts = [0, 0, 0, 0, 0];
        scrapedData.forEach(item => {
            const rating = parseInt(item.rating) || 0;
            if (rating >= 1 && rating <= 5) {
                ratingsCounts[rating - 1]++;
            }
        });

        const ratingCtx = document.getElementById('ratingChart').getContext('2d');
        ratingChart = new Chart(ratingCtx, {
            type: 'doughnut',
            data: {
                labels: ['1 Star', '2 Stars', '3 Stars', '4 Stars', '5 Stars'],
                datasets: [{
                    data: ratingsCounts,
                    backgroundColor: [
                        'rgba(239, 68, 68, 0.6)',
                        'rgba(245, 158, 11, 0.6)',
                        'rgba(59, 130, 246, 0.6)',
                        'rgba(6, 182, 212, 0.6)',
                        'rgba(16, 185, 129, 0.6)'
                    ],
                    borderColor: 'rgba(17, 24, 39, 0.8)',
                    borderWidth: 2,
                    hoverOffset: 8
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        position: 'right',
                        labels: { color: '#9ca3af', font: { family: 'Outfit', size: 11 } }
                    }
                }
            }
        });
    }

    function escapeHtml(str) {
        return str
            .replace(/&/g, "&amp;")
            .replace(/</g, "&lt;")
            .replace(/>/g, "&gt;")
            .replace(/"/g, "&quot;")
            .replace(/'/g, "&#039;");
    }

    fetchScrapedData();
    fetchReport();
});
