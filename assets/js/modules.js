// Load approved modules
async function loadApprovedModules() {
    const modulesGrid = document.getElementById('modulesGrid');
    
    if (!modulesGrid) {
        console.error("Modules grid element not found");
        return;
    }
    
    try {
        // Clear modules grid
        modulesGrid.innerHTML = `
            <div class="text-center py-5">
                <div class="spinner-border text-primary" role="status">
                    <span class="visually-hidden">Loading...</span>
                </div>
                <p class="mt-2">Memuat modul...</p>
            </div>
        `;
        
        // Get approved modules from Firestore
        const snapshot = await firebase.firestore().collection('modules')
            .where('isApproved', '==', true)
            .orderBy('approvedAt', 'desc')
            .get();
        
        if (snapshot.empty) {
            modulesGrid.innerHTML = `
                <div class="text-center py-5">
                    <i class="fas fa-book fa-3x text-muted mb-3"></i>
                    <p>Belum ada modul yang tersedia.</p>
                </div>
            `;
            return;
        }
        
        // Build modules HTML
        let modulesHTML = '';
        
        snapshot.forEach(doc => {
            const module = doc.data();
            const moduleId = doc.id;
            
            modulesHTML += `
                <div class="module-card" data-category="${module.category || 'lainnya'}">
                    <img src="${module.thumbnailUrl || '/assets/img/module-placeholder.jpg'}" alt="${module.title}" class="module-thumbnail">
                    <div class="module-info">
                        <h3 class="module-title">${module.title}</h3>
                        <p class="module-description">${module.description || 'Tidak ada deskripsi'}</p>
                        <div class="module-meta">
                            <span class="module-category">${getCategoryName(module.category)}</span>
                            <span class="module-downloads"><i class="fas fa-download"></i> ${module.downloadCount || 0}</span>
                        </div>
                        <div class="module-actions">
                            <button class="btn btn-primary btn-sm preview-btn" data-module-id="${moduleId}" data-module-url="${module.pdfUrl}" data-module-title="${module.title}">
                                <i class="fas fa-eye me-1"></i> Preview
                            </button>
                            ${isLoggedInPage() ? `
                                <button class="btn btn-success btn-sm download-btn" data-module-id="${moduleId}" data-module-url="${module.pdfUrl}" data-module-title="${module.title}">
                                    <i class="fas fa-download me-1"></i> Download
                                </button>
                            ` : ''}
                        </div>
                    </div>
                </div>
            `;
        });
        
        // Update modules grid
        modulesGrid.innerHTML = modulesHTML;
        
        // Add event listeners to preview buttons
        document.querySelectorAll('.preview-btn').forEach(button => {
            button.addEventListener('click', function() {
                const moduleId = this.getAttribute('data-module-id');
                const moduleUrl = this.getAttribute('data-module-url');
                const moduleTitle = this.getAttribute('data-module-title');
                
                previewPDF(moduleUrl, moduleTitle, moduleId);
            });
        });
        
        // Add event listeners to download buttons (only on loginsuccess.html)
        if (isLoggedInPage()) {
            document.querySelectorAll('.download-btn').forEach(button => {
                button.addEventListener('click', function() {
                    const moduleId = this.getAttribute('data-module-id');
                    const moduleUrl = this.getAttribute('data-module-url');
                    const moduleTitle = this.getAttribute('data-module-title');
                    
                    downloadPDF(moduleUrl, moduleTitle, moduleId);
                });
            });
        }
    } catch (error) {
        console.error("Error loading modules:", error);
        modulesGrid.innerHTML = `
            <div class="text-center py-5">
                <i class="fas fa-exclamation-circle fa-3x text-danger mb-3"></i>
                <p>Terjadi kesalahan saat memuat modul. Silakan coba lagi.</p>
            </div>
        `;
    }
}

// Preview PDF
function previewPDF(pdfUrl, title, moduleId) {
    // Use PDF.js viewer
    const viewerUrl = `https://mozilla.github.io/pdf.js/web/viewer.html?file=${encodeURIComponent(pdfUrl)}`;
    
    // Set modal title and iframe src
    document.getElementById('pdfPreviewTitle').textContent = title;
    document.getElementById('pdfPreviewFrame').src = viewerUrl;
    
    // Set module ID and URL for download button
    const downloadBtn = document.getElementById('downloadBtn');
    if (downloadBtn) {
        downloadBtn.setAttribute('data-module-id', moduleId);
        downloadBtn.setAttribute('data-module-url', pdfUrl);
        downloadBtn.setAttribute('data-module-title', title);
    }
    
    // Show modal
    const modal = new bootstrap.Modal(document.getElementById('pdfPreviewModal'));
    modal.show();
}

// Download PDF
async function downloadPDF(pdfUrl, title, moduleId) {
    try {
        // Create a temporary link element
        const link = document.createElement('a');
        link.href = pdfUrl;
        link.download = `${title}.pdf`;
        link.target = '_blank';
        
        // Append to body, click, and remove
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        
        // Update download count
        await updateDownloadCount(moduleId);
    } catch (error) {
        console.error("Error downloading PDF:", error);
        alert("Terjadi kesalahan saat mendownload modul. Silakan coba lagi.");
    }
}

// Update download count
async function updateDownloadCount(moduleId) {
    try {
        await firebase.firestore().collection('modules').doc(moduleId).update({
            downloadCount: firebase.firestore.FieldValue.increment(1)
        });
    } catch (error) {
        console.error("Error updating download count:", error);
    }
}

// Search modules
function searchModules(searchTerm) {
    const modules = document.querySelectorAll('.module-card');
    
    if (searchTerm === '') {
        // Show all modules
        modules.forEach(module => {
            module.style.display = 'block';
        });
        return;
    }
    
    // Filter modules
    modules.forEach(module => {
        const title = module.querySelector('.module-title').textContent.toLowerCase();
        const description = module.querySelector('.module-description').textContent.toLowerCase();
        
        if (title.includes(searchTerm) || description.includes(searchTerm)) {
            module.style.display = 'block';
        } else {
            module.style.display = 'none';
        }
    });
}

// Filter modules by category
function filterModules(category) {
    const modules = document.querySelectorAll('.module-card');
    
    if (category === 'all') {
        // Show all modules
        modules.forEach(module => {
            module.style.display = 'block';
        });
        return;
    }
    
    // Filter modules
    modules.forEach(module => {
        const moduleCategory = module.getAttribute('data-category');
        
        if (moduleCategory === category) {
            module.style.display = 'block';
        } else {
            module.style.display = 'none';
        }
    });
}

// Get category name
function getCategoryName(category) {
    const categories = {
        'matematika': 'Matematika',
        'sains': 'Sains',
        'komputer': 'Komputer',
        'bahasa': 'Bahasa',
        'ekonomi': 'Ekonomi',
        'lainnya': 'Lainnya'
    };
    
    return categories[category] || 'Lainnya';
}

// Check if current page is loginsuccess.html
function isLoggedInPage() {
    return window.location.pathname.includes('loginsuccess.html');
}

// Initialize on page load
document.addEventListener('DOMContentLoaded', function() {
    // Load modules if on index.html or loginsuccess.html
    if (document.getElementById('modulesGrid')) {
        loadApprovedModules();
    }
});