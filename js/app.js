/**
 * Employee Leave System - Main Application
 */

// ============================================
// Configuration
// ============================================
const CONFIG = {
    API_BASE_URL: 'http://localhost:5082',
    DATE_FORMAT: 'th-TH'
};

// ============================================
// Leave Rules (Business Logic)
// ============================================
const LEAVE_RULES = {
    annual: { advanceDays: 7, maxDays: 6, requireAttachment: false },
    sick: { advanceDays: 0, maxDays: 30, requireAttachmentAfter: 3 },
    personal: { advanceDays: 3, maxDays: 3, requireAttachment: true },
    ordination: { advanceDays: 30, maxDays: 15, requireAttachment: true }
};

// ============================================
// UI Utilities
// ============================================
const UI = {
    /**
     * Toggle modal visibility
     */
    toggleModal(modalId) {
        const modal = document.getElementById(modalId);
        if (modal) {
            modal.classList.toggle('hidden');
        }
    },

    /**
     * Show toast notification
     */
    showToast(message, type = 'info') {
        const toast = document.createElement('div');
        toast.className = `fixed bottom-4 right-4 px-6 py-3 rounded-xl shadow-lg text-white z-50 ${
            type === 'success' ? 'bg-green-500' :
            type === 'error' ? 'bg-red-500' :
            type === 'warning' ? 'bg-yellow-500' : 'bg-blue-500'
        }`;
        toast.textContent = message;
        document.body.appendChild(toast);
        
        setTimeout(() => toast.remove(), 3000);
    },

    /**
     * Format date for display
     */
    formatDate(dateStr) {
        const date = new Date(dateStr);
        return date.toLocaleDateString(CONFIG.DATE_FORMAT, {
            year: 'numeric',
            month: 'short',
            day: 'numeric'
        });
    },

    /**
     * Get status badge HTML
     */
    getStatusBadge(status) {
        const badges = {
            'approved': '<span class="badge badge-success">Approved</span>',
            'pending': '<span class="badge badge-warning">Pending</span>',
            'rejected': '<span class="badge badge-danger">Rejected</span>'
        };
        return badges[status.toLowerCase()] || `<span class="badge badge-info">${status}</span>`;
    }
};

// ============================================
// Leave Request Handler
// ============================================
const LeaveRequest = {
    /**
     * Calculate number of leave days
     */
    calculateDays(startDate, endDate) {
        const start = new Date(startDate);
        const end = new Date(endDate);
        if (end < start) return 0;
        
        const diffTime = Math.abs(end - start);
        return Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;
    },

    /**
     * Validate leave request
     */
    validate(leaveType, startDate, endDate) {
        const rules = LEAVE_RULES[leaveType];
        if (!rules) return { valid: false, message: 'Invalid leave type' };

        const today = new Date();
        const start = new Date(startDate);
        const leadTime = Math.ceil((start - today) / (1000 * 60 * 60 * 24));
        const days = this.calculateDays(startDate, endDate);

        // Check advance notice
        if (leadTime < rules.advanceDays) {
            return { 
                valid: false, 
                message: `ต้องแจ้งล่วงหน้าอย่างน้อย ${rules.advanceDays} วัน` 
            };
        }

        // Check max days
        if (days > rules.maxDays) {
            return { 
                valid: false, 
                message: `ลาได้สูงสุด ${rules.maxDays} วัน` 
            };
        }

        // Check attachment requirement
        const needsAttachment = rules.requireAttachment || 
            (rules.requireAttachmentAfter && days > rules.requireAttachmentAfter);

        return { valid: true, needsAttachment };
    },

    /**
     * Check if attachment is required
     */
    checkAttachmentRequired(leaveType, days) {
        const rules = LEAVE_RULES[leaveType];
        if (!rules) return false;
        
        return rules.requireAttachment || 
            (rules.requireAttachmentAfter && days > rules.requireAttachmentAfter);
    }
};

// ============================================
// Initialize Lucide Icons
// ============================================
document.addEventListener('DOMContentLoaded', () => {
    if (typeof lucide !== 'undefined') {
        lucide.createIcons();
    }
});

async function handleLogin() {
    const user = document.getElementById('username').value;
    const pass = document.getElementById('password').value;

    try {
        // เรียกใช้ API.request ที่เพื่อนเตรียมไว้ให้
        // หมายเหตุ: ตรวจสอบ endpoint กับเพื่อนอีกครั้ง (เช่น /api/users/login)
        const response = await API.request('/api/users/login', {
            method: 'POST',
            body: JSON.stringify({ username: user, password: pass })
        });

        if (response) {
            // 1. เก็บข้อมูลลง LocalStorage เพื่อใช้ในหน้าอื่นๆ
            localStorage.setItem('token', response.token);
            localStorage.setItem('userId', response.id);
            localStorage.setItem('userRole', response.role);
            localStorage.setItem('userName', response.firstName + ' ' + response.lastName);

            UI.showToast('เข้าสู่ระบบสำเร็จ', 'success');

            // 2. เปลี่ยนหน้าตาม Role
            if (response.role === 'Employee') {
                window.location.href = 'pages/employee/dashboard.html';
            } else if (response.role === 'Manager') {
                window.location.href = 'pages/manager/dashboard.html';
            } else {
                window.location.href = 'pages/hr/dashboard.html';
            }
        }
    } catch (error) {
        UI.showToast('Login ไม่สำเร็จ: ' + error.message, 'error');
    }
}

// Export for use in HTML
window.UI = UI;
window.LeaveRequest = LeaveRequest;
window.CONFIG = CONFIG;
