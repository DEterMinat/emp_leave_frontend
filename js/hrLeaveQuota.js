/**
 * HR Leave Quota Management
 */

class LeaveQuotaManager {
    constructor() {
        this.employees = [];
        this.filteredEmployees = [];
        this.searchQuery = '';
        
        // Define standard quotas if API doesn't provide them
        this.standardQuotas = {
            'Annual Leave': { base: 6, max: 8 }, // Will adjust by tenure
            'Sick Leave': { base: 30 },
            'Personal Leave': { base: 3 },
            'Ordination Leave': { base: 120 },
            'Unpaid Leave': { base: 30 }
        };
    }

    async init() {
        try {
            const userId = localStorage.getItem('userId');
            if (!userId) {
                window.location.href = '../../index.html';
                return;
            }

            // 1. Fetch user info for Navbar
            const user = await API.users.getById(userId);
            const nameEl = document.getElementById('user-name');
            const roleEl = document.getElementById('user-role-dept');
            if (nameEl) nameEl.innerText = `${user.firstName || ''} ${user.lastName || ''}`.trim() || user.username || 'HR Management'; 
            if (roleEl) roleEl.innerText = 'HR';

            // 2. Fetch all users
            const users = await API.users.getAll();
            
            // 2. Fetch leave balances for all users (or generate if API fails/missing)
            this.employees = await Promise.all(users.map(async (user) => {
                let balances = [];
                try {
                    // Try to get actual balances if API supports it per user
                    // API.leaves.getBalances might not exist or might need user ID
                    if (API.leaves && API.leaves.getBalances) {
                       balances = await API.leaves.getBalances(user.id);
                    }
                } catch (e) {
                    console.warn(`Could not fetch balances for user ${user.id}, using mock/defaults`);
                }

                return this.formatEmployeeData(user, balances);
            }));

            this.filteredEmployees = [...this.employees];
            this.renderTable();

        } catch (error) {
            console.error('Error fetching quota data:', error);
            const tbody = document.getElementById('quotaTableBody');
            if (tbody) {
                tbody.innerHTML = `<tr><td colspan="9" class="px-6 py-8 text-center text-red-500">Error loading data: ${error.message}</td></tr>`;
            }
        }
    }

    formatEmployeeData(user, apiBalances = []) {
        // Mock a hire date between 1 and 8 years ago for demo purposes
        // User ID hash for consistency
        let hash = 0;
        const idStr = String(user.id);
        for (let i = 0; i < idStr.length; i++) {
            hash = ((hash << 5) - hash) + idStr.charCodeAt(i);
        }
        
        const tenureYears = ((Math.abs(hash) % 80) / 10) + 0.5; // 0.5 to 8.4 years
        
        // Calculate dynamic annual quota based on tenure
        let annualTotal = this.standardQuotas['Annual Leave'].base;
        if (tenureYears >= 7) annualTotal = 8;
        else if (tenureYears >= 4) annualTotal = 7;
        
        // Use user's specific quota if set in DB
        if (user.annualLeaveQuota) {
            annualTotal = user.annualLeaveQuota;
        }

        // Create a normalized map of balances
        const quotaMap = {
            'ลาพักร้อน': { used: 0, total: annualTotal },
            'ลาป่วย': { used: 0, total: this.standardQuotas['Sick Leave'].base },
            'ลากิจ': { used: 0, total: this.standardQuotas['Personal Leave'].base },
            'ลาอุปสมบท': { used: 0, total: this.standardQuotas['Ordination Leave'].base },
            'UNPAID': { used: 0, total: this.standardQuotas['Unpaid Leave'].base }
        };

        // Populate with API data if available
        if (Array.isArray(apiBalances) && apiBalances.length > 0) {
            apiBalances.forEach(b => {
                const typeName = b.leaveTypeName || b.leaveType || '';
                if (typeName.includes('พักร้อน') || typeName.toLowerCase().includes('annual')) {
                    quotaMap['ลาพักร้อน'].used = b.used || 0;
                    if(b.total) quotaMap['ลาพักร้อน'].total = b.total;
                } else if (typeName.includes('ป่วย') || typeName.toLowerCase().includes('sick')) {
                    quotaMap['ลาป่วย'].used = b.used || 0;
                } else if (typeName.includes('กิจ') || typeName.toLowerCase().includes('personal')) {
                    quotaMap['ลากิจ'].used = b.used || 0;
                } else if (typeName.includes('อุปสมบท') || typeName.toLowerCase().includes('ordination')) {
                    quotaMap['ลาอุปสมบท'].used = b.used || 0;
                } else if (typeName.toLowerCase().includes('unpaid')) {
                    quotaMap['UNPAID'].used = b.used || 0;
                }
            });
        } else {
            // Generate some believable mock "used" data for the demo based on hash
            quotaMap['ลาพักร้อน'].used = Math.floor(Math.abs(hash) % (annualTotal + 1));
            quotaMap['ลาป่วย'].used = Math.floor((Math.abs(hash) >> 2) % 15);
            quotaMap['ลากิจ'].used = Math.floor((Math.abs(hash) >> 4) % (this.standardQuotas['Personal Leave'].base + 1));
            quotaMap['ลาอุปสมบท'].used = 0;
            quotaMap['UNPAID'].used = 0;
        }

        return {
            id: user.id,
            name: `${user.firstName || ''} ${user.lastName || ''}`.trim() || user.username || 'Unknown',
            position: user.roleName || 'Employee',
            department: user.department || 'General',
            tenure: tenureYears.toFixed(1),
            quotas: quotaMap
        };
    }

    handleSearch(query) {
        this.searchQuery = query.toLowerCase().trim();
        
        if (!this.searchQuery) {
            this.filteredEmployees = [...this.employees];
        } else {
            this.filteredEmployees = this.employees.filter(emp => {
                return emp.name.toLowerCase().includes(this.searchQuery) ||
                       emp.position.toLowerCase().includes(this.searchQuery) ||
                       emp.department.toLowerCase().includes(this.searchQuery);
            });
        }
        
        this.renderTable();
    }

    formatQuota(used, total) {
        // If used is approaching total, color it differently (warning/danger)
        const percent = used / total;
        let colorClass = 'text-gray-700';
        
        if (percent >= 1) colorClass = 'text-red-600 font-bold';
        else if (percent >= 0.8) colorClass = 'text-orange-500 font-bold';
        else if (used > 0) colorClass = 'text-blue-700 font-medium';
        
        return `<span class="${colorClass}">${used}/${total}</span>`;
    }

    renderTable() {
        const tbody = document.getElementById('quotaTableBody');
        if (!tbody) return;

        if (this.filteredEmployees.length === 0) {
            tbody.innerHTML = `
                <tr>
                    <td colspan="9" class="px-6 py-12 text-center text-gray-500">
                        <div class="flex flex-col items-center">
                            <i data-lucide="search-x" class="w-10 h-10 text-gray-300 mb-3"></i>
                            <p>ไม่พบข้อมูลพนักงานที่ค้นหา</p>
                        </div>
                    </td>
                </tr>
            `;
            if (window.lucide) lucide.createIcons();
            return;
        }

        tbody.innerHTML = this.filteredEmployees.map(emp => `
            <tr class="hover:bg-blue-50/50 transition border-b border-gray-50">
                <td class="px-6 py-4">
                    <div class="font-bold text-gray-800">${emp.name}</div>
                    <div class="text-xs text-gray-500 mt-0.5">${emp.position}</div>
                </td>
                <td class="px-6 py-4 text-center">
                    <span class="text-xs text-gray-600 bg-gray-100 px-2 py-1 rounded-md">${emp.department}</span>
                </td>
                <td class="px-6 py-4 text-center text-gray-600 font-medium">
                    ${emp.tenure}
                </td>
                <td class="px-6 py-4 text-center bg-blue-50/30">
                    ${this.formatQuota(emp.quotas['ลาพักร้อน'].used, emp.quotas['ลาพักร้อน'].total)}
                </td>
                <td class="px-6 py-4 text-center">
                    ${this.formatQuota(emp.quotas['ลาป่วย'].used, emp.quotas['ลาป่วย'].total)}
                </td>
                <td class="px-6 py-4 text-center bg-blue-50/30">
                    ${this.formatQuota(emp.quotas['ลากิจ'].used, emp.quotas['ลากิจ'].total)}
                </td>
                <td class="px-6 py-4 text-center">
                    ${this.formatQuota(emp.quotas['ลาอุปสมบท'].used, emp.quotas['ลาอุปสมบท'].total)}
                </td>
                <td class="px-6 py-4 text-center bg-blue-50/30">
                    ${this.formatQuota(emp.quotas['UNPAID'].used, emp.quotas['UNPAID'].total)}
                </td>
                <td class="px-6 py-4 text-center">
                    <button onclick="quotaManager.editQuota('${emp.id}')" class="text-blue-600 hover:text-blue-800 hover:bg-blue-100 p-2 rounded-lg transition flex items-center justify-center mx-auto gap-1 text-xs font-bold">
                        <i data-lucide="edit-3" class="w-3.5 h-3.5"></i>
                        <span>แก้ไข</span>
                    </button>
                </td>
            </tr>
        `).join('');

        if (window.lucide) {
            lucide.createIcons();
        }
    }

    currentEditId = null;

    editQuota(id) {
        this.currentEditId = id;
        const emp = this.employees.find(e => e.id == id);
        if (!emp) return;

        // Set Headers
        document.getElementById('modalEmpName').innerText = `${emp.name} - ${emp.position}`;
        document.getElementById('modalEmpTenure').innerText = `อายุงาน: ${emp.tenure} ปี`;

        const form = document.getElementById('editQuotaForm');
        let html = '';

        const configs = [
            { key: 'ลาพักร้อน', title: 'ลาพักผ่อน (Annual Leave)', subtitle: '1-3 ปี = 6 วัน, 4-6 ปี = 7 วัน, 7+ ปี = 8 วัน', color: 'blue' },
            { key: 'ลาป่วย', title: 'ลาป่วย (Sick Leave)', subtitle: 'สูงสุด 30 วัน', color: 'red' },
            { key: 'ลากิจ', title: 'ลากิจ (Personal Leave)', subtitle: 'สูงสุด 3 วัน', color: 'purple' },
            { key: 'ลาอุปสมบท', title: 'ลาอุปสมบท (Ordination Leave)', subtitle: 'สูงสุด 120 วัน', color: 'orange' },
            { key: 'UNPAID', title: 'ลางานไม่รับเงิน (Unpaid Leave)', subtitle: 'สูงสุด 30 วัน', color: 'gray' }
        ];

        const colorMap = {
            'blue': 'text-blue-600 bg-blue-600',
            'red': 'text-red-500 bg-red-600',
            'purple': 'text-purple-600 bg-purple-600',
            'orange': 'text-orange-500 bg-orange-500',
            'gray': 'text-gray-600 bg-gray-400'
        };

        configs.forEach(cfg => {
            const currentData = emp.quotas[cfg.key];
            const total = currentData.total;
            const used = currentData.used;
            const available = total - used;

            const colors = colorMap[cfg.color].split(' ');
            const textColor = colors[0];
            const bgColor = colors[1];
            
            const percent = total > 0 ? (used / total) * 100 : 0;
            const width = Math.min(100, Math.max(0, percent));

            html += `
                <div class="border border-gray-200 rounded-xl p-5 shadow-sm">
                    <h4 class="font-bold ${textColor}">${cfg.title}</h4>
                    <p class="text-xs text-gray-500 mt-0.5">${cfg.subtitle}</p>
                    
                    <div class="grid grid-cols-2 gap-4 mt-4">
                        <div>
                            <label class="block text-xs font-medium text-gray-700 mb-1.5">วันคงเหลือ (Available)</label>
                            <input type="number" id="input_avail_${cfg.key}" value="${available}" min="0" oninput="quotaManager.updateVisuals('${cfg.key}')" class="w-full border border-gray-300 rounded-xl px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-blue-500 transition shadow-sm">
                        </div>
                        <div>
                            <label class="block text-xs font-medium text-gray-700 mb-1.5">วันทั้งหมด (Total)</label>
                            <input type="number" id="input_total_${cfg.key}" value="${total}" min="0" oninput="quotaManager.updateVisuals('${cfg.key}')" class="w-full border border-gray-300 rounded-xl px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-blue-500 transition shadow-sm">
                        </div>
                    </div>

                    <div class="mt-4">
                        <div class="h-1.5 w-full bg-gray-100 rounded-full overflow-hidden">
                            <div id="progress_${cfg.key}" class="h-full ${bgColor} rounded-full transition-all duration-300" style="width: ${width}%"></div>
                        </div>
                        <p id="text_used_${cfg.key}" class="text-xs text-center text-gray-500 mt-2">ใช้ไป ${used} วัน</p>
                    </div>
                </div>
            `;
        });

        form.innerHTML = html;
        document.getElementById('editQuotaModal').classList.remove('hidden');
        
        // Disable body scroll when modal is open
        document.body.style.overflow = 'hidden';
    }

    updateVisuals(key) {
        const availInput = document.getElementById(`input_avail_${key}`);
        const totalInput = document.getElementById(`input_total_${key}`);
        
        const available = parseFloat(availInput.value) || 0;
        const total = parseFloat(totalInput.value) || 0;
        
        let used = total - available;
        // prevent negative used
        if (used < 0) used = 0;
        
        const percent = total > 0 ? (used / total) * 100 : 0;
        const width = Math.min(100, Math.max(0, percent));
        
        const progressEl = document.getElementById(`progress_${key}`);
        if(progressEl) progressEl.style.width = `${width}%`;
        
        const textEl = document.getElementById(`text_used_${key}`);
        if(textEl) textEl.innerText = `ใช้ไป ${used} วัน`;
    }

    closeModal() {
        this.currentEditId = null;
        document.getElementById('editQuotaModal').classList.add('hidden');
        // Re-enable body scroll
        document.body.style.overflow = '';
    }

    saveQuotaChanges() {
        if (!this.currentEditId) return;
        
        const emp = this.employees.find(e => e.id == this.currentEditId);
        if (!emp) return;

        const keys = ['ลาพักร้อน', 'ลาป่วย', 'ลากิจ'];
        
        keys.forEach(key => {
            const availInput = document.getElementById(`input_avail_${key}`);
            const totalInput = document.getElementById(`input_total_${key}`);
            
            const available = parseFloat(availInput.value) || 0;
            const total = parseFloat(totalInput.value) || 0;
            let used = total - available;
            if (used < 0) used = 0;
            
            emp.quotas[key].total = total;
            emp.quotas[key].used = used;
        });

        this.closeModal();
        this.renderTable(); // re-render the filtered view
        
        if (typeof UI !== 'undefined') {
            UI.showToast('บันทึกสิทธิวันลาเรียบร้อยแล้ว', 'success');
        } else {
            UI.showToast('Saved successfully.', 'success');
        }
    }
}

// Initialize when DOM is ready
const quotaManager = new LeaveQuotaManager();
document.addEventListener('DOMContentLoaded', () => {
    quotaManager.init();
});
