/**
 * Employee Leave System - Main Application
 */

// ============================================
// Configuration
// ============================================
const CONFIG = {
    // ปรับค่าเริ่มต้นให้ชี้ไปยัง Backend ที่เพื่อนอัพเดท
    API_BASE_URL: 'https://emp-leave-backend.onrender.com',
    DATE_FORMAT: 'th-TH',
    // เปิดการเชื่อมต่อ Notifications สำหรับทดสอบ (สามารถปิดได้โดยตั้งเป็น false)
    ENABLE_NOTIFICATIONS: true
};

// ============================================
// Leave Rules (Business Logic)
// ============================================
const LEAVE_RULES = {
    annual:     { key: 'annual',     advanceDays: 7,  maxDays: 6,   requireAttachment: false, label: 'ลาพักผ่อน' },
    sick:       { key: 'sick',       advanceDays: 0,  maxDays: 30,  requireAttachmentAfter: 3, label: 'ลาป่วย' },
    personal:   { key: 'personal',   advanceDays: 3,  maxDays: 3,   requireAttachment: true,  label: 'ลากิจส่วนตัว' },
    ordination: { key: 'ordination', advanceDays: 30, maxDays: 30,  requireAttachment: true,  label: 'ลาอุปสมบท' },
    unpaid:     { key: 'unpaid',     advanceDays: 7,  maxDays: 120, requireAttachment: false, label: 'ลางานไม่รับเงิน' }
};

// ============================================
// Feature Flag: Hidden leave types
// To restore Ordination & Unpaid Leave, change to: []
// ============================================
const HIDDEN_LEAVE_TYPES = [];

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
        const s = (status || '').toString().toLowerCase();
        if (s === 'approved' || s === 'approve') {
            return `<span class="px-3 py-1 bg-green-100 text-green-700 text-xs rounded-full font-medium">Approved</span>`;
        }
        if (s === 'pending') {
            return `<span class="px-3 py-1 bg-yellow-100 text-yellow-700 text-xs rounded-full font-medium">Pending</span>`;
        }
        if (s === 'rejected' || s === 'reject') {
            return `<span class="px-3 py-1 bg-red-100 text-red-700 text-xs rounded-full font-medium">Rejected</span>`;
        }
        // default neutral badge
        return `<span class="px-3 py-1 bg-gray-100 text-gray-700 text-xs rounded-full font-medium">${status}</span>`;
    },

    async fillLeaveTypes(selectElementId) {
        try {
            const types = await API.references.getLeaveTypes();
            const select = document.getElementById(selectElementId);
            if (!select) return;

            // Apply HIDDEN_LEAVE_TYPES feature flag
            const visibleTypes = HIDDEN_LEAVE_TYPES.length
                ? types.filter(t => {
                    const name = (t.typeName || '').toLowerCase();
                    return !HIDDEN_LEAVE_TYPES.some(kw => name.includes(kw.toLowerCase()));
                  })
                : types;

            // วาดตัวเลือกใหม่ โดยเก็บ "ค่าเริ่มต้น" ไว้
            select.innerHTML = '<option value="">Select Leave Type</option>' + 
                visibleTypes.map(t => `<option value="${t.id}">${t.typeName}</option>`).join('');
        } catch (error) {
            console.error('Failed to fill leave types:', error);
            this.showToast('ไม่สามารถโหลดประเภทการลาได้', 'error');
        }
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
     * Calculate tenure in years from a joining date/createdAt
     */
    calculateTenure(createdAt) {
        if (!createdAt) return 0;
        const joined = new Date(createdAt);
        const today = new Date();
        let years = today.getFullYear() - joined.getFullYear();
        const m = today.getMonth() - joined.getMonth();
        if (m < 0 || (m === 0 && today.getDate() < joined.getDate())) {
            years--;
        }
        return Math.max(0, years);
    },

    /**
     * Get dynamic annual quota based on tenure
     */
    getAnnualQuota(createdAt) {
        const tenureYears = this.calculateTenure(createdAt);
        // Show 0 if tenure < 1 as per business rules.
        if (tenureYears >= 7) return 8;
        if (tenureYears >= 4) return 7;
        if (tenureYears >= 1) return 6;
        return 0;
    },

    /**
     * Get dynamic annual quota with carry-over logic (Max 12 days)
     */
    getAnnualQuotaWithCarryOver(createdAt, allLeaves = []) {
        if (!createdAt) return 0;
        
        const joinedDate = new Date(createdAt);
        const currentYear = new Date().getFullYear();
        const joiningYear = joinedDate.getFullYear();
        
        let carryOver = 0;
        let totalThisYear = 0;

        // Process year by year from joining to current
        for (let year = joiningYear; year <= currentYear; year++) {
            // Calculate tenure for the start of THIS specific year to get base quota
            // (Actually, tenure usually increases on the anniversary, but we'll use 
            // the year difference for simplicity as per the 6/7/8 rules)
            const dateInYear = new Date(year, 11, 31); // End of that year
            const baseQuota = this.getAnnualQuota(createdAt); 
            // Wait, the getAnnualQuota(createdAt) calculates tenure based on 'today'.
            // I need a version that calculates tenure for a SPECIFIC PAST DATE.
            
            // Tenure at year Y = Year - Joining Year
            const tenureInYear = Math.max(0, year - joiningYear);
            let baseY = (tenureInYear >= 7) ? 8 : (tenureInYear >= 4) ? 7 : (tenureInYear >= 1) ? 6 : 0;

            // Total available for THIS year
            totalThisYear = Math.min(12, baseY + carryOver);

            // Subtract approved leaves taken in THIS year
            const approvedLeavesInYear = allLeaves.filter(l => {
                const isAnnual = (l.leaveTypeName || l.leaveType || '').toLowerCase().includes('annual');
                const isApproved = (l.status || '').toLowerCase() === 'approved';
                const leafYear = new Date(l.startDate).getFullYear();
                return isAnnual && isApproved && leafYear === year;
            });

            const usedInYear = approvedLeavesInYear.reduce((sum, l) => {
                return sum + (this.calculateDays(l.startDate, l.endDate) || 0);
            }, 0);

            // Carry over for NEXT year
            carryOver = Math.max(0, totalThisYear - usedInYear);
        }

        return totalThisYear;
    },

    /**
     * Validate leave request
     */
    validate(leaveTypeKey, startDate, endDate, employee = null, allLeaves = []) {
        let rules = { ...LEAVE_RULES[leaveTypeKey] };
        if (!rules.key) return { valid: true, needsAttachment: false }; 

        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const start = new Date(startDate);
        start.setHours(0, 0, 0, 0);
        
        const leadTime = Math.ceil((start - today) / (1000 * 60 * 60 * 24));
        const days = this.calculateDays(startDate, endDate);
        
        // Use 0 as default tenure if employee data is missing (safer)
        const tenureYears = employee ? this.calculateTenure(employee.createdAt || employee.joiningDate) : 0; 

        let carryOverCapped = false;

        if (rules.key === 'annual') {
            if (tenureYears < 1) {
                return {
                    valid: false,
                    message: `การลาพักผ่อนต้องมีอายุงานอย่างน้อย 1 ปี (อายุงานปัจจุบันของคุณคือ ${tenureYears} ปี)`
                };
            }
            
            // USE CARRY-OVER LOGIC (Dynamic Quota)
            if (employee?.createdAt || employee?.joiningDate) {
                const joinDate = employee.createdAt || employee.joiningDate;
                rules.maxDays = this.getAnnualQuotaWithCarryOver(joinDate, allLeaves);

                // Detect if the cap at 12 was applied
                const joiningYear = new Date(joinDate).getFullYear();
                const currentYear = new Date().getFullYear();
                const tenureInYear = Math.max(0, currentYear - joiningYear);
                let baseY = tenureInYear >= 7 ? 8 : tenureInYear >= 4 ? 7 : tenureInYear >= 1 ? 6 : 0;
                // Estimate previous carry-over: if maxDays is 12 and baseY < 12, cap was applied
                carryOverCapped = (baseY < 12) && (rules.maxDays === 12);
            } else {
                // Fallback to basic tenure tiers if no history provided
                if (tenureYears >= 7) rules.maxDays = 8;
                else if (tenureYears >= 4) rules.maxDays = 7;
                else rules.maxDays = 6;
            }
        }
        
        if (rules.key === 'ordination') {
            if (employee?.gender === 'Female' || employee?.gender === 'หญิง') {
                return { valid: false, message: 'ลาอุปสมบทสงวนสิทธิ์เฉพาะพนักงานชาย' };
            }
            if (tenureYears < 3) {
                return { valid: false, message: 'การลาอุปสมบทต้องมีอายุงานอย่างน้อย 3 ปี' };
            }
        }

        // 2. Check advance notice
        if (leadTime < rules.advanceDays) {
            return { 
                valid: false, 
                message: `${rules.label} ต้องแจ้งล่วงหน้าอย่างน้อย ${rules.advanceDays} วัน (เริ่มลาได้ตั้งแต่วันที่ ${UI.formatDate(new Date(today.getTime() + rules.advanceDays * 86400000))})` 
            };
        }

        // 3. Check max days per request
        if (days > rules.maxDays) {
            return { 
                valid: false, 
                message: `${rules.label} สามารถลาได้สูงสุด ${rules.maxDays} วันสำหรับอายุงานของคุณ (คุณพยายามลา ${days} วัน)` 
            };
        }

        // 4. Check REMAINING QUOTA — count already used + pending days this year
        if (allLeaves && allLeaves.length > 0) {
            const currentYear = new Date(startDate).getFullYear();
            const usedDays = allLeaves.reduce((sum, l) => {
                const s = (l.status || '').toLowerCase();
                // Count Approved and Pending (not Rejected/Cancelled)
                if (s === 'rejected' || s === 'reject' || s === 'cancelled') return sum;
                // Match leave type by key
                const typeName = (l.leaveTypeName || l.leaveType || l.type || '').toLowerCase();
                const isMatchingType = (() => {
                    if (rules.key === 'annual')      return typeName.includes('annual') || typeName.includes('พักผ่อน') || typeName.includes('พักร้อน');
                    if (rules.key === 'sick')        return typeName.includes('sick')   || typeName.includes('ป่วย');
                    if (rules.key === 'personal')    return typeName.includes('personal') || typeName.includes('กิจ');
                    if (rules.key === 'ordination')  return typeName.includes('ordination') || typeName.includes('บวช') || typeName.includes('อุปสมบท');
                    if (rules.key === 'unpaid')      return typeName.includes('unpaid') || typeName.includes('ไม่รับเงิน');
                    return false;
                })();
                if (!isMatchingType) return sum;
                // Same year only
                const leaveYear = new Date(l.startDate).getFullYear();
                if (leaveYear !== currentYear) return sum;
                return sum + (this.calculateDays(l.startDate, l.endDate) || 0);
            }, 0);

            const remaining = rules.maxDays - usedDays;
            if (days > remaining) {
                return {
                    valid: false,
                    message: `${rules.label} สิทธิ์คงเหลือไม่เพียงพอ — ใช้ไปแล้ว ${usedDays} วัน จากสิทธิ์ทั้งหมด ${rules.maxDays} วัน (คงเหลือ ${Math.max(0, remaining)} วัน แต่ขอลา ${days} วัน)`
                };
            }
        }

        // 5. Check attachment requirement (Boolean normalized)
        const needsAttachment = !!(rules.requireAttachment || 
            (rules.requireAttachmentAfter && days > rules.requireAttachmentAfter));

        return { valid: true, needsAttachment, carryOverCapped };

    },

    /**
     * Check if attachment is required
     */
    checkAttachmentRequired(leaveType, days) {
        const rules = LEAVE_RULES[leaveType];
        if (!rules) return false;
        
        return !!(rules.requireAttachment || 
            (rules.requireAttachmentAfter && days > rules.requireAttachmentAfter));
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
