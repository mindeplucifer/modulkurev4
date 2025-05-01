// Helper function untuk mengambil element
function getElement(id) {
    const element = document.getElementById(id);
    if (!element) {
        console.warn(`Element ${id} tidak ditemukan`);
    }
    return element;
}

// === AUTH CHECK & INIT DASHBOARD ===
document.addEventListener('DOMContentLoaded', function() {
    firebase.auth().onAuthStateChanged(async function(user) {
        if (!user) {
            window.location.href = 'login.html';
            return;
        }
        try {
            const userDoc = await firebase.firestore().collection('users').doc(user.uid).get();
            if (!userDoc.exists || !userDoc.data().isAdmin) {
                alert('Anda tidak memiliki akses ke halaman ini.');
                window.location.href = 'index.html';
                return;
            }
            initAdminDashboard();
        } catch (err) {
            console.error("Error checking admin access:", err);
            alert('Terjadi kesalahan autentikasi. Silakan login ulang.');
            firebase.auth().signOut();
            window.location.href = 'login.html';
        }
    });
});

async function initAdminDashboard() {
    try {
        await Promise.all([
            loadDashboardStats(),
            loadPendingUsers(),
            loadApprovedUsers(),
            loadAllUsers(),
            loadPendingModules(),
            loadApprovedModules(),
            loadAllModules()
        ]);
        setupNavigation();
        setupRefreshButtons();
        setupModuleButtons();
        setupSettingsForm();
        setupLogoutButton();
    } catch (error) {
        console.error("Error initializing admin dashboard:", error);
        alert("Terjadi kesalahan saat memuat dashboard");
    }
}

// --- Semua fungsi dashboard di bawah ini tidak perlu diubah dari versi revisi sebelumnya ---

// Load dashboard stats
async function loadDashboardStats() {
    try {
        // Get total users
        const usersSnapshot = await firebase.firestore().collection('users').get();
        const totalUsers = usersSnapshot.size;
        getElement('totalUsers').textContent = totalUsers;

        // Get pending users
        const pendingUsersSnapshot = await firebase.firestore().collection('users')
            .where('isApproved', '==', false)
            .get();
        const pendingUsers = pendingUsersSnapshot.size;
        getElement('pendingUsers').textContent = pendingUsers;
        getElement('pendingUsersCount').textContent = pendingUsers;

        // Get total modules
        const modulesSnapshot = await firebase.firestore().collection('modules').get();
        const totalModules = modulesSnapshot.size;
        getElement('totalModules').textContent = totalModules;

        // Get pending modules
        const pendingModulesSnapshot = await firebase.firestore().collection('modules')
            .where('isApproved', '==', false)
            .get();
        const pendingModules = pendingModulesSnapshot.size;
        getElement('pendingModules').textContent = pendingModules;
        getElement('pendingModulesCount').textContent = pendingModules;

        // Load recent activity
        await loadRecentActivity();
    } catch (error) {
        console.error("Error loading dashboard stats:", error);
    }
}

// Load recent activity
async function loadRecentActivity() {
    try {
        const activityContainer = document.getElementById('recentActivity');

        // Get recent user registrations
        const recentUsersSnapshot = await firebase.firestore().collection('users')
            .orderBy('registeredAt', 'desc')
            .limit(5)
            .get();

        // Get recent module uploads
        const recentModulesSnapshot = await firebase.firestore().collection('modules')
            .orderBy('uploadedAt', 'desc')
            .limit(5)
            .get();

        // Combine and sort activities
        const activities = [];

        recentUsersSnapshot.forEach(doc => {
            const user = doc.data();
            activities.push({
                type: 'user',
                name: user.name || 'Pengguna',
                timestamp: user.registeredAt ? user.registeredAt.toDate() : new Date(),
                message: 'mendaftar sebagai pengguna baru'
            });
        });

        recentModulesSnapshot.forEach(doc => {
            const module = doc.data();
            activities.push({
                type: 'module',
                name: module.uploadedByName || 'Pengguna',
                timestamp: module.uploadedAt ? module.uploadedAt.toDate() : new Date(),
                message: `mengunggah modul "${module.title}"`
            });
        });

        // Sort by timestamp (newest first)
        activities.sort((a, b) => b.timestamp - a.timestamp);

        // Limit to 10 activities
        activities.splice(10);

        // Build activity HTML
        let activityHTML = '';

        if (activities.length === 0) {
            activityHTML = '<li class="list-group-item text-center">Belum ada aktivitas</li>';
        } else {
            activities.forEach(activity => {
                const icon = activity.type === 'user' ? 'fas fa-user' : 'fas fa-book';
                const iconColor = activity.type === 'user' ? 'text-primary' : 'text-success';
                const timeAgo = formatTimeAgo(activity.timestamp);

                activityHTML += `
                    <li class="list-group-item">
                        <div class="d-flex align-items-center">
                            <i class="${icon} ${iconColor} me-3"></i>
                            <div>
                                <strong>${activity.name}</strong> ${activity.message}
                                <div class="text-muted small">${timeAgo}</div>
                            </div>
                        </div>
                    </li>
                `;
            });
        }

        activityContainer.innerHTML = activityHTML;
    } catch (error) {
        console.error("Error loading recent activity:", error);
    }
}

// Load pending users
async function loadPendingUsers() {
    try {
        const pendingUsersTable = document.getElementById('pendingUsersTable');

        // Get pending users
        const snapshot = await firebase.firestore().collection('users')
            .where('isApproved', '==', false)
            .orderBy('registeredAt', 'desc')
            .get();

        if (snapshot.empty) {
            pendingUsersTable.innerHTML = `
                <tr>
                    <td colspan="5" class="text-center">Tidak ada pengguna yang menunggu persetujuan</td>
                </tr>
            `;
            return;
        }

        // Build users HTML
        let usersHTML = '';

        snapshot.forEach(doc => {
            const user = doc.data();
            const userId = doc.id;
            const registeredAt = user.registeredAt ? formatDate(user.registeredAt.toDate()) : '-';

            usersHTML += `
                <tr>
                    <td>${user.name || '-'}</td>
                    <td>${user.email || '-'}</td>
                    <td>${user.school || '-'}</td>
                    <td>${registeredAt}</td>
                    <td>
                        <button class="btn btn-sm btn-success approve-user-btn" data-user-id="${userId}">
                            <i class="fas fa-check me-1"></i> Setujui
                        </button>
                        <button class="btn btn-sm btn-danger reject-user-btn" data-user-id="${userId}">
                            <i class="fas fa-times me-1"></i> Tolak
                        </button>
                        <button class="btn btn-sm btn-info view-user-btn" data-user-id="${userId}">
                            <i class="fas fa-eye me-1"></i> Detail
                        </button>
                    </td>
                </tr>
            `;
        });

        pendingUsersTable.innerHTML = usersHTML;

        // Add event listeners to buttons
        document.querySelectorAll('.approve-user-btn').forEach(button => {
            button.addEventListener('click', function() {
                const userId = this.getAttribute('data-user-id');
                approveUser(userId);
            });
        });

        document.querySelectorAll('.reject-user-btn').forEach(button => {
            button.addEventListener('click', function() {
                const userId = this.getAttribute('data-user-id');
                rejectUser(userId);
            });
        });

        document.querySelectorAll('.view-user-btn').forEach(button => {
            button.addEventListener('click', function() {
                const userId = this.getAttribute('data-user-id');
                viewUserDetails(userId);
            });
        });
    } catch (error) {
        console.error("Error loading pending users:", error);
    }
}

// Load approved users
async function loadApprovedUsers() {
    try {
        const approvedUsersTable = document.getElementById('approvedUsersTable');

        // Get approved users
        const snapshot = await firebase.firestore().collection('users')
            .where('isApproved', '==', true)
            .orderBy('approvedAt', 'desc')
            .get();

        if (snapshot.empty) {
            approvedUsersTable.innerHTML = `
                <tr>
                    <td colspan="6" class="text-center">Tidak ada pengguna yang disetujui</td>
                </tr>
            `;
            return;
        }

        // Build users HTML
        let usersHTML = '';

        snapshot.forEach(doc => {
            const user = doc.data();
            const userId = doc.id;
            const approvedAt = user.approvedAt ? formatDate(user.approvedAt.toDate()) : '-';
            const canUpload = user.canUpload ? 'Diizinkan' : 'Tidak Diizinkan';
            const canUploadClass = user.canUpload ? 'text-success' : 'text-danger';

            usersHTML += `
                <tr>
                    <td>${user.name || '-'}</td>
                    <td>${user.email || '-'}</td>
                    <td>${user.school || '-'}</td>
                    <td>${approvedAt}</td>
                    <td class="${canUploadClass}">${canUpload}</td>
                    <td>
                        <button class="btn btn-sm btn-${user.canUpload ? 'danger' : 'success'} toggle-upload-btn" data-user-id="${userId}" data-can-upload="${user.canUpload}">
                            <i class="fas fa-${user.canUpload ? 'ban' : 'check'} me-1"></i> ${user.canUpload ? 'Cabut Izin' : 'Izinkan'} Upload
                        </button>
                        <button class="btn btn-sm btn-info view-user-btn" data-user-id="${userId}">
                            <i class="fas fa-eye me-1"></i> Detail
                        </button>
                    </td>
                </tr>
            `;
        });

        approvedUsersTable.innerHTML = usersHTML;

        // Add event listeners to buttons
        document.querySelectorAll('.toggle-upload-btn').forEach(button => {
            button.addEventListener('click', function() {
                const userId = this.getAttribute('data-user-id');
                const canUpload = this.getAttribute('data-can-upload') === 'true';
                toggleUserUploadPermission(userId, !canUpload);
            });
        });

        document.querySelectorAll('.view-user-btn').forEach(button => {
            button.addEventListener('click', function() {
                const userId = this.getAttribute('data-user-id');
                viewUserDetails(userId);
            });
        });
    } catch (error) {
        console.error("Error loading approved users:", error);
    }
}

// Load all users
async function loadAllUsers() {
    try {
        const allUsersTable = document.getElementById('allUsersTable');

        // Get all users
        const snapshot = await firebase.firestore().collection('users')
            .orderBy('registeredAt', 'desc')
            .get();

        if (snapshot.empty) {
            allUsersTable.innerHTML = `
                <tr>
                    <td colspan="6" class="text-center">Tidak ada pengguna</td>
                </tr>
            `;
            return;
        }

        // Build users HTML
        let usersHTML = '';

        snapshot.forEach(doc => {
            const user = doc.data();
            const userId = doc.id;
            const registeredAt = user.registeredAt ? formatDate(user.registeredAt.toDate()) : '-';

            let status = 'Menunggu';
            let statusClass = 'text-warning';

            if (user.isApproved) {
                status = 'Disetujui';
                statusClass = 'text-success';
            }

            usersHTML += `
                <tr>
                    <td>${user.name || '-'}</td>
                    <td>${user.email || '-'}</td>
                    <td>${user.school || '-'}</td>
                    <td class="${statusClass}">${status}</td>
                    <td>${registeredAt}</td>
                    <td>
                        <button class="btn btn-sm btn-info view-user-btn" data-user-id="${userId}">
                            <i class="fas fa-eye me-1"></i> Detail
                        </button>
                    </td>
                </tr>
            `;
        });

        allUsersTable.innerHTML = usersHTML;

        // Add event listeners to buttons
        document.querySelectorAll('.view-user-btn').forEach(button => {
            button.addEventListener('click', function() {
                const userId = this.getAttribute('data-user-id');
                viewUserDetails(userId);
            });
        });
    } catch (error) {
        console.error("Error loading all users:", error);
    }
}

// Load pending modules
async function loadPendingModules() {
    try {
        const pendingModulesTable = document.getElementById('pendingModulesTable');

        // Get pending modules
        const snapshot = await firebase.firestore().collection('modules')
            .where('isApproved', '==', false)
            .orderBy('uploadedAt', 'desc')
            .get();

        if (snapshot.empty) {
            pendingModulesTable.innerHTML = `
                <tr>
                    <td colspan="5" class="text-center">Tidak ada modul yang menunggu persetujuan</td>
                </tr>
            `;
            return;
        }

        // Build modules HTML
        let modulesHTML = '';

        snapshot.forEach(doc => {
            const module = doc.data();
            const moduleId = doc.id;
            const uploadedAt = module.uploadedAt ? formatDate(module.uploadedAt.toDate()) : '-';

            modulesHTML += `
                <tr>
                    <td>${module.title || '-'}</td>
                    <td>${getCategoryName(module.category) || '-'}</td>
                    <td>${module.uploadedByName || '-'}</td>
                    <td>${uploadedAt}</td>
                    <td>
                        <button class="btn btn-sm btn-primary preview-module-btn" data-module-id="${moduleId}" data-module-url="${module.pdfUrl}" data-module-title="${module.title}">
                            <i class="fas fa-eye me-1"></i> Preview
                        </button>
                        <button class="btn btn-sm btn-success approve-module-btn" data-module-id="${moduleId}">
                            <i class="fas fa-check me-1"></i> Setujui
                        </button>
                        <button class="btn btn-sm btn-danger reject-module-btn" data-module-id="${moduleId}">
                            <i class="fas fa-times me-1"></i> Tolak
                        </button>
                    </td>
                </tr>
            `;
        });

        pendingModulesTable.innerHTML = modulesHTML;

        // Add event listeners to buttons
        document.querySelectorAll('.preview-module-btn').forEach(button => {
            button.addEventListener('click', function() {
                const moduleId = this.getAttribute('data-module-id');
                const moduleUrl = this.getAttribute('data-module-url');
                const moduleTitle = this.getAttribute('data-module-title');

                previewModule(moduleUrl, moduleTitle, moduleId);
            });
        });

        document.querySelectorAll('.approve-module-btn').forEach(button => {
            button.addEventListener('click', function() {
                const moduleId = this.getAttribute('data-module-id');
                approveModule(moduleId);
            });
        });

        document.querySelectorAll('.reject-module-btn').forEach(button => {
            button.addEventListener('click', function() {
                const moduleId = this.getAttribute('data-module-id');
                rejectModule(moduleId);
            });
        });
    } catch (error) {
        console.error("Error loading pending modules:", error);
    }
}

// Load approved modules
async function loadApprovedModules() {
    try {
        const approvedModulesTable = document.getElementById('approvedModulesTable');

        // Get approved modules
        const snapshot = await firebase.firestore().collection('modules')
            .where('isApproved', '==', true)
            .orderBy('approvedAt', 'desc')
            .get();

        if (snapshot.empty) {
            approvedModulesTable.innerHTML = `
                <tr>
                    <td colspan="6" class="text-center">Tidak ada modul yang disetujui</td>
                </tr>
            `;
            return;
        }

        // Build modules HTML
        let modulesHTML = '';

        snapshot.forEach(doc => {
            const module = doc.data();
            const moduleId = doc.id;
            const approvedAt = module.approvedAt ? formatDate(module.approvedAt.toDate()) : '-';

            modulesHTML += `
                <tr>
                    <td>${module.title || '-'}</td>
                    <td>${getCategoryName(module.category) || '-'}</td>
                    <td>${module.uploadedByName || '-'}</td>
                    <td>${approvedAt}</td>
                    <td>${module.downloadCount || 0}</td>
                    <td>
                        <button class="btn btn-sm btn-primary preview-module-btn" data-module-id="${moduleId}" data-module-url="${module.pdfUrl}" data-module-title="${module.title}">
                            <i class="fas fa-eye me-1"></i> Preview
                        </button>
                        <button class="btn btn-sm btn-danger remove-module-btn" data-module-id="${moduleId}">
                            <i class="fas fa-trash me-1"></i> Hapus
                        </button>
                    </td>
                </tr>
            `;
        });

        approvedModulesTable.innerHTML = modulesHTML;

        // Add event listeners to buttons
        document.querySelectorAll('.preview-module-btn').forEach(button => {
            button.addEventListener('click', function() {
                const moduleId = this.getAttribute('data-module-id');
                const moduleUrl = this.getAttribute('data-module-url');
                const moduleTitle = this.getAttribute('data-module-title');

                previewModule(moduleUrl, moduleTitle, moduleId);
            });
        });

        document.querySelectorAll('.remove-module-btn').forEach(button => {
            button.addEventListener('click', function() {
                const moduleId = this.getAttribute('data-module-id');
                removeModule(moduleId);
            });
        });
    } catch (error) {
        console.error("Error loading approved modules:", error);
    }
}

// Load all modules
async function loadAllModules() {
    try {
        const allModulesTable = document.getElementById('allModulesTable');

        // Get all modules
        const snapshot = await firebase.firestore().collection('modules')
            .orderBy('uploadedAt', 'desc')
            .get();

        if (snapshot.empty) {
            allModulesTable.innerHTML = `
                <tr>
                    <td colspan="6" class="text-center">Tidak ada modul</td>
                </tr>
            `;
            return;
        }

        // Build modules HTML
        let modulesHTML = '';

        snapshot.forEach(doc => {
            const module = doc.data();
            const moduleId = doc.id;
            const uploadedAt = module.uploadedAt ? formatDate(module.uploadedAt.toDate()) : '-';

            let status = 'Menunggu';
            let statusClass = 'text-warning';

            if (module.isApproved) {
                status = 'Disetujui';
                statusClass = 'text-success';
            }

            modulesHTML += `
                <tr>
                    <td>${module.title || '-'}</td>
                    <td>${getCategoryName(module.category) || '-'}</td>
                    <td>${module.uploadedByName || '-'}</td>
                    <td class="${statusClass}">${status}</td>
                    <td>${uploadedAt}</td>
                    <td>
                        <button class="btn btn-sm btn-primary preview-module-btn" data-module-id="${moduleId}" data-module-url="${module.pdfUrl}" data-module-title="${module.title}">
                            <i class="fas fa-eye me-1"></i> Preview
                        </button>
                    </td>
                </tr>
            `;
        });

        allModulesTable.innerHTML = modulesHTML;

        // Add event listeners to buttons
        document.querySelectorAll('.preview-module-btn').forEach(button => {
            button.addEventListener('click', function() {
                const moduleId = this.getAttribute('data-module-id');
                const moduleUrl = this.getAttribute('data-module-url');
                const moduleTitle = this.getAttribute('data-module-title');

                previewModule(moduleUrl, moduleTitle, moduleId);
            });
        });
    } catch (error) {
        console.error("Error loading all modules:", error);
    }
}

// Approve user
async function approveUser(userId) {
    try {
        if (!confirm('Apakah Anda yakin ingin menyetujui pengguna ini?')) {
            return;
        }

        await firebase.firestore().collection('users').doc(userId).update({
            isApproved: true,
            canUpload: true,
            approvedAt: firebase.firestore.FieldValue.serverTimestamp()
        });

        alert('Pengguna berhasil disetujui.');

        // Reload users
        loadPendingUsers();
        loadApprovedUsers();
        loadAllUsers();

        // Reload dashboard stats
        loadDashboardStats();
    } catch (error) {
        console.error("Error approving user:", error);
        alert('Terjadi kesalahan saat menyetujui pengguna.');
    }
}

// Reject user
async function rejectUser(userId) {
    try {
        if (!confirm('Apakah Anda yakin ingin menolak pengguna ini?')) {
            return;
        }

        await firebase.firestore().collection('users').doc(userId).delete();

        alert('Pengguna berhasil ditolak.');

        // Reload users
        loadPendingUsers();
        loadApprovedUsers();
        loadAllUsers();

        // Reload dashboard stats
        loadDashboardStats();
    } catch (error) {
        console.error("Error rejecting user:", error);
        alert('Terjadi kesalahan saat menolak pengguna.');
    }
}

// Toggle user upload permission
async function toggleUserUploadPermission(userId, canUpload) {
    try {
        const action = canUpload ? 'mengizinkan' : 'mencabut izin';

        if (!confirm(`Apakah Anda yakin ingin ${action} pengguna ini untuk mengupload modul?`)) {
            return;
        }

        await firebase.firestore().collection('users').doc(userId).update({
            canUpload: canUpload
        });

        alert(`Berhasil ${action} pengguna untuk mengupload modul.`);

        // Reload users
        loadApprovedUsers();
    } catch (error) {
        console.error("Error toggling user upload permission:", error);
        alert('Terjadi kesalahan saat mengubah izin upload pengguna.');
    }
}

// View user details
async function viewUserDetails(userId) {
    try {
        const userDoc = await firebase.firestore().collection('users').doc(userId).get();

        if (!userDoc.exists) {
            alert('Pengguna tidak ditemukan.');
            return;
        }

        const user = userDoc.data();

        // Set user details in modal
        document.getElementById('userDetailsTitle').textContent = `Detail Pengguna: ${user.name || 'Tanpa Nama'}`;

        if (user.photoURL) {
            document.getElementById('userDetailsPhoto').src = user.photoURL;
        }

        document.getElementById('userDetailsName').value = user.name || '-';
        document.getElementById('userDetailsEmail').value = user.email || '-';
        document.getElementById('userDetailsSchool').value = user.school || '-';
        document.getElementById('userDetailsMajor').value = user.major || '-';
        document.getElementById('userDetailsRole').value = user.role || '-';
        document.getElementById('userDetailsRegisteredAt').value = user.registeredAt ? formatDate(user.registeredAt.toDate()) : '-';

        let status = 'Menunggu Persetujuan';
        if (user.isApproved) {
            status = 'Disetujui';
            if (user.canUpload) {
                status += ' (Dapat Upload)';
            } else {
                status += ' (Tidak Dapat Upload)';
            }
        }

        document.getElementById('userDetailsStatus').value = status;

        // Set footer buttons based on user status
        const footer = document.getElementById('userDetailsFooter');

        if (!user.isApproved) {
            footer.innerHTML = `
                <button type="button" class="btn btn-success approve-user-modal-btn" data-user-id="${userId}">
                    <i class="fas fa-check me-1"></i> Setujui
                </button>
                <button type="button" class="btn btn-danger reject-user-modal-btn" data-user-id="${userId}">
                    <i class="fas fa-times me-1"></i> Tolak
                </button>
                <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Tutup</button>
            `;
        } else {
            footer.innerHTML = `
                <button type="button" class="btn btn-${user.canUpload ? 'danger' : 'success'} toggle-upload-modal-btn" data-user-id="${userId}" data-can-upload="${user.canUpload}">
                    <i class="fas fa-${user.canUpload ? 'ban' : 'check'} me-1"></i> ${user.canUpload ? 'Cabut Izin' : 'Izinkan'} Upload
                </button>
                <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Tutup</button>
            `;
        }

        // Add event listeners to buttons
        const approveBtn = document.querySelector('.approve-user-modal-btn');
        if (approveBtn) {
            approveBtn.addEventListener('click', function() {
                const userId = this.getAttribute('data-user-id');
                approveUser(userId);

                // Close modal
                const modal = bootstrap.Modal.getInstance(document.getElementById('userDetailsModal'));
                modal.hide();
            });
        }

        const rejectBtn = document.querySelector('.reject-user-modal-btn');
        if (rejectBtn) {
            rejectBtn.addEventListener('click', function() {
                const userId = this.getAttribute('data-user-id');
                rejectUser(userId);

                // Close modal
                const modal = bootstrap.Modal.getInstance(document.getElementById('userDetailsModal'));
                modal.hide();
            });
        }

        const toggleUploadBtn = document.querySelector('.toggle-upload-modal-btn');
        if (toggleUploadBtn) {
            toggleUploadBtn.addEventListener('click', function() {
                const userId = this.getAttribute('data-user-id');
                const canUpload = this.getAttribute('data-can-upload') === 'true';
                toggleUserUploadPermission(userId, !canUpload);

                // Close modal
                const modal = bootstrap.Modal.getInstance(document.getElementById('userDetailsModal'));
                modal.hide();
            });
        }

        // Show modal
        const modal = new bootstrap.Modal(document.getElementById('userDetailsModal'));
        modal.show();
    } catch (error) {
        console.error("Error viewing user details:", error);
        alert('Terjadi kesalahan saat memuat detail pengguna.');
    }
}

// Preview module
function previewModule(moduleUrl, title, moduleId) {
    // Use PDF.js viewer
    const viewerUrl = `https://mozilla.github.io/pdf.js/web/viewer.html?file=${encodeURIComponent(moduleUrl)}`;

    // Set modal title and iframe src
    document.getElementById('modulePreviewTitle').textContent = title;
    document.getElementById('modulePreviewFrame').src = viewerUrl;

    // Set module ID for approve and reject buttons
    document.getElementById('approveModuleBtn').setAttribute('data-module-id', moduleId);
    document.getElementById('rejectModuleBtn').setAttribute('data-module-id', moduleId);

    // Show modal
    const modal = new bootstrap.Modal(document.getElementById('modulePreviewModal'));
    modal.show();
}

// Approve module
async function approveModule(moduleId) {
    try {
        if (!confirm('Apakah Anda yakin ingin menyetujui modul ini?')) {
            return;
        }

        await firebase.firestore().collection('modules').doc(moduleId).update({
            isApproved: true,
            approvedAt: firebase.firestore.FieldValue.serverTimestamp()
        });

        alert('Modul berhasil disetujui.');

        // Close modal if open
        const modal = bootstrap.Modal.getInstance(document.getElementById('modulePreviewModal'));
        if (modal) {
            modal.hide();
        }

        // Reload modules
        loadPendingModules();
        loadApprovedModules();
        loadAllModules();

        // Reload dashboard stats
        loadDashboardStats();
    } catch (error) {
        console.error("Error approving module:", error);
        alert('Terjadi kesalahan saat menyetujui modul.');
    }
}

// Reject module
async function rejectModule(moduleId) {
    try {
        if (!confirm('Apakah Anda yakin ingin menolak modul ini?')) {
            return;
        }

        await firebase.firestore().collection('modules').doc(moduleId).delete();

        alert('Modul berhasil ditolak.');

        // Close modal if open
        const modal = bootstrap.Modal.getInstance(document.getElementById('modulePreviewModal'));
        if (modal) {
            modal.hide();
        }

        // Reload modules
        loadPendingModules();
        loadApprovedModules();
        loadAllModules();

        // Reload dashboard stats
        loadDashboardStats();
    } catch (error) {
        console.error("Error rejecting module:", error);
        alert('Terjadi kesalahan saat menolak modul.');
    }
}

// Remove module
async function removeModule(moduleId) {
    try {
        if (!confirm('Apakah Anda yakin ingin menghapus modul ini?')) {
            return;
        }

        await firebase.firestore().collection('modules').doc(moduleId).delete();

        alert('Modul berhasil dihapus.');

        // Reload modules
        loadApprovedModules();
        loadAllModules();

        // Reload dashboard stats
        loadDashboardStats();
    } catch (error) {
        console.error("Error removing module:", error);
        alert('Terjadi kesalahan saat menghapus modul.');
    }
}

// Format date
function formatDate(date) {
    return new Date(date).toLocaleDateString('id-ID', {
        day: 'numeric',
        month: 'long',
        year: 'numeric'
    });
}

// Format time ago
function formatTimeAgo(date) {
    const now = new Date();
    const diffInSeconds = Math.floor((now - date) / 1000);

    if (diffInSeconds < 60) {
        return 'Baru saja';
    }

    const diffInMinutes = Math.floor(diffInSeconds / 60);
    if (diffInMinutes < 60) {
        return `${diffInMinutes} menit yang lalu`;
    }

    const diffInHours = Math.floor(diffInMinutes / 60);
    if (diffInHours < 24) {
        return `${diffInHours} jam yang lalu`;
    }

    const diffInDays = Math.floor(diffInHours / 24);
    if (diffInDays < 30) {
        return `${diffInDays} hari yang lalu`;
    }

    const diffInMonths = Math.floor(diffInDays / 30);
    if (diffInMonths < 12) {
        return `${diffInMonths} bulan yang lalu`;
    }

    const diffInYears = Math.floor(diffInMonths / 12);
    return `${diffInYears} tahun yang lalu`;
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

// Navigation between sections
function setupNavigation() {
    document.querySelectorAll('.nav-link').forEach(link => {
        link.addEventListener('click', function(e) {
            e.preventDefault();

            // Get target section
            const target = this.getAttribute('href').substring(1);

            // Hide all sections
            document.querySelectorAll('.section').forEach(section => {
                section.style.display = "none";
                section.classList.remove('active');
            });

            // Show target section
            const showSection = getElement(target);
            if (showSection) {
                showSection.style.display = "";
                showSection.classList.add('active');
            }

            // Update active link
            document.querySelectorAll('.nav-link').forEach(link => {
                link.classList.remove('active');
            });
            this.classList.add('active');
        });
    });
}

function setupRefreshButtons() {
    getElement('refreshBtn').addEventListener('click', function() {
        loadDashboardStats();
    });

    getElement('refreshUsersBtn').addEventListener('click', function() {
        loadPendingUsers();
        loadApprovedUsers();
        loadAllUsers();
    });

    getElement('refreshModulesBtn').addEventListener('click', function() {
        loadPendingModules();
        loadApprovedModules();
        loadAllModules();
    });
}

function setupModuleButtons() {
    getElement('approveModuleBtn').addEventListener('click', function() {
        const moduleId = this.getAttribute('data-module-id');
        approveModule(moduleId);
    });

    getElement('rejectModuleBtn').addEventListener('click', function() {
        const moduleId = this.getAttribute('data-module-id');
        rejectModule(moduleId);
    });
}

function setupSettingsForm() {
    const settingsForm = getElement('settingsForm');
    if (settingsForm) {
        const user = firebase.auth().currentUser;

        if (user) {
            getElement('adminEmail').value = user.email;
            getElement('adminName').value = user.displayName || '';
        }

        settingsForm.addEventListener('submit', async function(e) {
            e.preventDefault();

            try {
                const adminName = getElement('adminName').value;
                const autoApproveUsers = getElement('autoApproveUsers').checked;

                await firebase.auth().currentUser.updateProfile({
                    displayName: adminName
                });

                await firebase.firestore().collection('settings').doc('admin').set({
                    autoApproveUsers: autoApproveUsers,
                    updatedAt: firebase.firestore.FieldValue.serverTimestamp()
                });

                alert('Pengaturan berhasil disimpan.');
            } catch (error) {
                console.error("Error saving settings:", error);
                alert('Terjadi kesalahan saat menyimpan pengaturan.');
            }
        });
    }
}

function setupLogoutButton() {
    getElement('logoutBtn').addEventListener('click', function() {
        firebase.auth().signOut()
            .then(() => {
                window.location.href = 'login.html';
            })
            .catch((error) => {
                console.error("Error signing out:", error);
            });
    });
}