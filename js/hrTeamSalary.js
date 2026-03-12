/**
 * HR Team Salary Management
 */

class TeamSalaryManager {
    constructor() {
        this.employees = [];
        this.filteredEmployees = [];
        this.currentSort = 'name';
        this.searchQuery = '';
        this.baseSalaries = {}; // Mock data store
    }

    async init() {
        try {
            // Check auth
            const userId = localStorage.getItem('userId');
            if (!userId) {
                window.location.href = '../../index.html';
                return;
            }

            // Fetch all employees from the new endpoint
            const employeesData = await API.employees.getAll();
            
            // Map the real employee data
            this.employees = employeesData.map(emp => {
                const id = emp.id || emp.userId;
                return {
                    id: id,
                    employeeId: emp.employeeNumber || `EMP${String(id).slice(-4).toUpperCase()}`,
                    userId: emp.userId,
                    name: `${emp.firstName || ''} ${emp.lastName || ''}`.trim() || emp.username || 'Unknown Employee',
                    initials: this.getInitials(emp),
                    firstName: emp.firstName || '',
                    lastName: emp.lastName || '',
                    position: emp.position || 'Employee',
                    department: emp.departmentName || 'General',
                    baseSalary: emp.salary || 0,
                    bonus: emp.bonus || 0,
                    rawUser: emp
                };
            });

            this.filteredEmployees = [...this.employees];
            
            this.sortData();
            this.renderTable();

        } catch (error) {
            console.error('Error fetching employee data:', error);
            const tbody = document.getElementById('salaryTableBody');
            if (tbody) {
                tbody.innerHTML = `<tr><td colspan="5" class="px-6 py-8 text-center text-red-500">Error loading data: ${error.message}</td></tr>`;
            }
        }
    }

    getInitials(user) {
        if (user.firstName && user.lastName) {
            return `${user.firstName.charAt(0)}${user.lastName.charAt(0)}`.toUpperCase();
        }
        if (user.username) {
            return user.username.substring(0, 2).toUpperCase();
        }
        return 'U';
    }

    formatCurrency(amount) {
        return new Intl.NumberFormat('th-TH', { 
            style: 'currency', 
            currency: 'THB',
            minimumFractionDigits: 0,
            maximumFractionDigits: 0
        }).format(amount);
    }

    handleSearch(query) {
        this.searchQuery = query.toLowerCase().trim();
        this.filterData();
    }

    handleSort(sortKey) {
        this.currentSort = sortKey;
        this.sortData();
        this.renderTable();
    }

    filterData() {
        if (!this.searchQuery) {
            this.filteredEmployees = [...this.employees];
        } else {
            this.filteredEmployees = this.employees.filter(emp => {
                return emp.name.toLowerCase().includes(this.searchQuery) ||
                       emp.employeeId.toLowerCase().includes(this.searchQuery) ||
                       emp.position.toLowerCase().includes(this.searchQuery) ||
                       emp.department.toLowerCase().includes(this.searchQuery);
            });
        }
        
        this.sortData();
        this.renderTable();
    }

    sortData() {
        this.filteredEmployees.sort((a, b) => {
            switch (this.currentSort) {
                case 'name':
                    return a.name.localeCompare(b.name);
                case 'salary_asc':
                    return a.baseSalary - b.baseSalary;
                case 'salary_desc':
                    return b.baseSalary - a.baseSalary;
                case 'department':
                    return a.department.localeCompare(b.department);
                default:
                    return 0;
            }
        });
    }

    // Helper to generate a background color class based on initials
    getBgColorClass(initials) {
        const colors = [
            'bg-blue-500', 'bg-indigo-500', 'bg-purple-500', 
            'bg-pink-500', 'bg-rose-500', 'bg-emerald-500', 
            'bg-teal-500', 'bg-cyan-500'
        ];
        
        // Simple hash of initials to pick a consistent color
        let hash = 0;
        for (let i = 0; i < initials.length; i++) {
            hash = initials.charCodeAt(i) + ((hash << 5) - hash);
        }
        
        const index = Math.abs(hash) % colors.length;
        return colors[index];
    }

    renderTable() {
        const tbody = document.getElementById('salaryTableBody');
        const totalCount = document.getElementById('totalCount');
        const showingText = document.getElementById('showingText');

        if (!tbody) return;

        if (this.filteredEmployees.length === 0) {
            tbody.innerHTML = `
                <tr>
                    <td colspan="5" class="px-6 py-12 text-center text-gray-500">
                        <div class="flex flex-col items-center">
                            <i data-lucide="search-x" class="w-10 h-10 text-gray-300 mb-3"></i>
                            <p>No employees found matching your search.</p>
                        </div>
                    </td>
                </tr>
            `;
            if (window.lucide) lucide.createIcons();
            totalCount.innerText = '0';
            showingText.innerText = `Showing 0 of ${this.employees.length} employees`;
            return;
        }

        tbody.innerHTML = this.filteredEmployees.map(emp => `
            <tr class="hover:bg-gray-50 transition border-b border-gray-50 group">
                <td class="px-6 py-4">
                    <div class="flex items-center space-x-4">
                        <div class="w-10 h-10 rounded-full flex items-center justify-center text-white font-bold text-sm ${this.getBgColorClass(emp.initials)}">
                            ${emp.initials}
                        </div>
                        <div>
                            <div class="font-bold text-gray-800">${emp.name}</div>
                            <div class="text-xs text-gray-500 flex items-center gap-1 mt-0.5">
                                <i data-lucide="hash" class="w-3 h-3"></i>
                                ${emp.employeeId}
                            </div>
                        </div>
                    </div>
                </td>
                <td class="px-6 py-4 text-gray-600 font-medium">${emp.position}</td>
                <td class="px-6 py-4 text-center">
                    <span class="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold bg-blue-50 text-blue-600 border border-blue-100">
                        ${emp.department || 'General'}
                    </span>
                </td>
                <td class="px-6 py-4 text-right font-bold text-gray-800">
                    ${this.formatCurrency(emp.baseSalary)}
                </td>
                <td class="px-6 py-4">
                    <div class="flex items-center justify-center space-x-2">
                        <button onclick="salaryManager.viewDetails('${emp.id}')" class="px-4 py-2 bg-blue-600 text-white hover:bg-blue-700 rounded-lg text-xs font-bold transition flex items-center gap-2 shadow-sm">
                            <i data-lucide="eye" class="w-4 h-4"></i>
                            <span>View Details</span>
                        </button>
                        <button onclick="salaryManager.editSalary('${emp.id}')" class="px-4 py-2 bg-green-600 text-white hover:bg-green-700 rounded-lg text-xs font-bold transition flex items-center gap-2 shadow-sm">
                            <i data-lucide="edit-3" class="w-3.5 h-3.5"></i>
                            <span>Edit</span>
                        </button>
                    </div>
                </td>
            </tr>
        `).join('');

        // Re-init icons 
        if (window.lucide) lucide.createIcons();

        // Update counters
        totalCount.innerText = this.employees.length;
        showingText.innerText = `Showing ${this.filteredEmployees.length} of ${this.employees.length} employees`;
    }

    async viewDetails(id) {
        const emp = this.employees.find(e => e.id == id);
        if (!emp) return;

        // Populate User Banner
        document.getElementById('modalAvatar').innerText = emp.initials;
        document.getElementById('modalName').innerText = emp.name;
        document.getElementById('modalPosition').innerText = emp.position;
        document.getElementById('modalEmpId').innerText = `ID: ${emp.employeeId}`;

        // Populate Contact Info
        document.getElementById('modalDept').innerText = emp.department;
        const usernameBase = emp.rawUser?.username || emp.name.split(' ')[0].toLowerCase() || 'employee';
        document.getElementById('modalEmail').innerText = emp.rawUser?.email || `${usernameBase}@company.com`.toLowerCase();
        document.getElementById('modalPhone').innerText = emp.rawUser?.phoneNumber || emp.phone || '+66 8X-XXX-XXXX';

        // Show loading state
        document.getElementById('modalLeaveBalances').innerHTML = `
            <div class="col-span-full py-8 text-center text-gray-500">
                <i data-lucide="loader-2" class="w-8 h-8 animate-spin mx-auto mb-2 text-blue-500"></i>
                <p>Loading leave balances...</p>
            </div>
        `;
        if (window.lucide) lucide.createIcons();

        const modal = document.getElementById('employeeModal');
        modal.classList.remove('hidden');
        document.body.style.overflow = 'hidden'; 

        try {
            // HYBRID + DASHBOARD LOGIC: Fetch both Quotas and Leaves
            // Use emp.userId primarily (mapped from API response in init())
            const targetId = emp.userId || emp.id;
            
            let quotas = [];
            let leaves = [];
            
            const results = await Promise.allSettled([
                API.leaveBalances.getByEmployeeId(targetId),
                API.leaves.getAll(targetId)
            ]);

            if (results[0].status === 'fulfilled') quotas = results[0].value;
            if (results[1].status === 'fulfilled') leaves = results[1].value;

            // Use the exact same calculation logic as dashboard.html
            const consolidatedBalances = this.calculateDashboardStyleBalances(leaves, quotas);
            this.renderRealLeaveBalances(consolidatedBalances);

        } catch (error) {
            console.error('Critical error loading details:', error);
            document.getElementById('modalLeaveBalances').innerHTML = `
                <div class="col-span-full py-4 text-center text-red-500 bg-red-50 rounded-lg">
                    <p class="font-medium text-sm">Error loading data. Please try again.</p>
                </div>
            `;
        }
    }

    calculateDashboardStyleBalances(leaves, quotas = null) {
        // Default Entitlements (Matching Dashboard term and values)
        const types = [
            { key: 'Annual Leave', idKey: 'annual', total: 6 },
            { key: 'Sick Leave', idKey: 'sick', total: 30 },
            { key: 'Personal Leave', idKey: 'personal', total: 3 },
            { key: 'Ordination Leave', idKey: 'ordination', total: 15 },
            { key: 'Unpaid Leave', idKey: 'unpaid', total: 365 }
        ];

        // Exact normalization from dashboard.html
        const normalize = s => (s || '').toString().trim().toLowerCase().replace(/[^a-z0-9]+/g, ' ');

        // Exact used-days calculation from dashboard.html
        const usedByKey = {};
        (leaves || []).forEach(l => {
            const status = (l.status || '').toString().toLowerCase();
            if (status !== 'approved') return;
            
            // Calculation helper (matches leaveModal.js)
            let days = 1;
            if (l.startDate && l.endDate) {
                const s = new Date(l.startDate);
                const e = new Date(l.endDate);
                days = Math.max(1, Math.round((e - s) / (1000 * 60 * 60 * 24)) + 1);
            }
            
            // Ported candidates matching from dashboard.html
            const candidates = [l.leaveTypeName, l.leaveType, l.type, l.leaveTypeCode, l.leaveTypeId, l.leaveTypeKey, l.name, l.code];
            candidates.forEach(c => {
                if (!c) return;
                const k = normalize(c);
                if (!k) return;
                usedByKey[k] = (usedByKey[k] || 0) + days;
            });
        });

        // Convert quotas array to a map for easy lookup
        const quotaMap = {};
        if (Array.isArray(quotas)) {
            quotas.forEach(q => {
                if (q.leaveTypeName) quotaMap[normalize(q.leaveTypeName)] = q.totalDays;
            });
        }

        // Exact getUsedForType logic from dashboard.html
        const getUsedForType = (t) => {
            const wantKeys = [];
            wantKeys.push(normalize(t.key));
            if (t.idKey) wantKeys.push(normalize(t.idKey));
            const tokens = (t.key || '').toString().toLowerCase().split(/[^a-z0-9]+/).filter(Boolean);
            tokens.forEach(tok => wantKeys.push(tok));

            // 1) exact matches
            for (const wk of wantKeys) {
                if (usedByKey[wk]) return usedByKey[wk];
            }

            // 2) substring matches
            let sum = 0;
            Object.keys(usedByKey).forEach(k => {
                for (const wk of wantKeys) {
                    if (k.includes(wk)) {
                        sum += usedByKey[k];
                        break;
                    }
                }
            });
            return sum;
        };

        return types.map(t => {
            const used = getUsedForType(t);
            const nKey = normalize(t.key);
            let total = quotaMap[nKey] || t.total;
            
            // Force Sick and Unpaid Leave to their respective defaults
            if (nKey.includes('sick')) total = 30;
            if (nKey.includes('unpaid')) total = 365;

            return {
                leaveTypeName: t.key,
                totalDays: total,
                usedDays: used,
                remainingDays: Math.max(0, total - used)
            };
        });
    }

    closeModal() {
        const modal = document.getElementById('employeeModal');
        modal.classList.add('hidden');
        document.body.style.overflow = '';
    }

    renderRealLeaveBalances(balancesData) {
        const container = document.getElementById('modalLeaveBalances');
        
        if (!balancesData || balancesData.length === 0) {
            container.innerHTML = `<div class="col-span-full py-8 text-center text-gray-400"><p>No data available.</p></div>`;
            return;
        }

        const styleConfig = {
            'Annual Leave': { icon: 'umbrella', colors: { bg: 'bg-blue-50', text: 'text-blue-600', fill: 'bg-blue-600', border: 'border-blue-100/50' } },
            'Sick Leave': { icon: 'heart', colors: { bg: 'bg-red-50', text: 'text-red-500', fill: 'bg-red-500', border: 'border-red-100/50' } },
            'Personal Leave': { icon: 'user', colors: { bg: 'bg-purple-50', text: 'text-purple-600', fill: 'bg-purple-600', border: 'border-purple-100/50' } },
            'Unpaid Leave': { icon: 'dollar-sign', colors: { bg: 'bg-gray-50', text: 'text-gray-600', fill: 'bg-gray-400', border: 'border-gray-200/50' } },
            'Ordination Leave': { icon: 'sparkles', colors: { bg: 'bg-amber-50', text: 'text-amber-600', fill: 'bg-amber-500', border: 'border-amber-100/50' } },
            'default': { icon: 'calendar', colors: { bg: 'bg-gray-50', text: 'text-gray-600', fill: 'bg-gray-500', border: 'border-gray-200/50' } }
        };

        container.innerHTML = `<div class="space-y-4">` + balancesData.map(balance => {
            const config = styleConfig[balance.leaveTypeName] || styleConfig['default'];
            const left = balance.remainingDays;
            const total = balance.totalDays;
            const used = balance.usedDays;
            const percentage = total > 0 ? (used / total) * 100 : 0;

            // terminologies matching dashboard view
            return `
                <div class="p-5 rounded-2xl border ${config.colors.border} ${config.colors.bg} relative overflow-hidden group hover:shadow-md transition-all duration-300">
                    <div class="flex justify-between items-center relative z-10">
                        <div class="flex items-center space-x-4">
                            <div class="w-12 h-12 rounded-xl bg-white shadow-sm flex items-center justify-center ${config.colors.text}">
                                <i data-lucide="${config.icon}" class="w-6 h-6"></i>
                            </div>
                            <div>
                                <h5 class="font-bold text-gray-800 text-base">${balance.leaveTypeName}</h5>
                                <p class="text-[12px] text-gray-500 font-medium">
                                    <span class="font-bold text-gray-700">${used}</span> of ${total} days used
                                </p>
                            </div>
                        </div>
                        <div class="text-right">
                            <div class="text-2xl font-black ${config.colors.text} tracking-tight">${left}</div>
                            <div class="text-[10px] text-gray-400 font-bold uppercase tracking-widest mt-0.5">left</div>
                        </div>
                    </div>
                    <div class="mt-4 w-full bg-white/60 rounded-full h-2 px-0.5 py-0.5">
                        <div class="${config.colors.fill} h-1 rounded-full transition-all duration-500 shadow-[0_0_8px_rgba(0,0,0,0.1)]" style="width: ${percentage}%"></div>
                    </div>
                </div>
            `;
        }).join('') + `</div>`;

        if (window.lucide) lucide.createIcons();
    }

    editSalary(id) {
        const emp = this.employees.find(e => e.id == id);
        if (!emp) return;

        // Populate Form Fields
        document.getElementById('editEmpId').value = emp.id;
        document.getElementById('editFirstName').value = emp.firstName;
        document.getElementById('editLastName').value = emp.lastName;
        document.getElementById('editEmail').value = `${emp.rawUser?.username || 'user'}@company.com`.toLowerCase();
        
        // Use deterministic mock phone for now if not in DB
        let hash = 0;
        const idStr = String(emp.id);
        for (let i = 0; i < idStr.length; i++) { hash = ((hash << 5) - hash) + idStr.charCodeAt(i); }
        const p1 = Math.abs(hash % 900) + 100;
        const p2 = Math.abs((hash * 7) % 9000) + 1000;
        document.getElementById('editPhone').value = emp.phone || `+66 8X-${p1}-${p2}`;
        
        document.getElementById('editPosition').value = emp.position;
        document.getElementById('editDept').value = emp.department;
        document.getElementById('editBaseSalary').value = emp.baseSalary;
        document.getElementById('editBonus').value = emp.bonus;

        // Show Modal
        const modal = document.getElementById('editEmployeeModal');
        modal.classList.remove('hidden');
        document.body.style.overflow = 'hidden'; 
        
        if (window.lucide) lucide.createIcons();
    }

    closeEditModal() {
        const modal = document.getElementById('editEmployeeModal');
        modal.classList.add('hidden');
        document.body.style.overflow = '';
    }

    async saveEdit(event) {
        event.preventDefault();
        const id = document.getElementById('editEmpId').value;
        const saveBtn = document.getElementById('saveEditBtn');
        
        const updatedData = {
            firstName: document.getElementById('editFirstName').value,
            lastName: document.getElementById('editLastName').value,
            position: document.getElementById('editPosition').value,
            departmentName: document.getElementById('editDept').value,
            salary: parseFloat(document.getElementById('editBaseSalary').value) || 0,
            bonus: parseFloat(document.getElementById('editBonus').value) || 0,
            // phone might need to be added to the API/DB schema later
        };

        try {
            saveBtn.disabled = true;
            saveBtn.innerHTML = '<i data-lucide="loader-2" class="w-5 h-5 animate-spin"></i> Saving...';
            if (window.lucide) lucide.createIcons();

            await API.employees.update(id, updatedData);
            
            if (typeof UI !== 'undefined') {
                UI.showToast('Employee information updated successfully!', 'success');
            }

            this.closeEditModal();
            this.init(); // Refresh data

        } catch (error) {
            console.error('Error updating employee:', error);
            if (typeof UI !== 'undefined') {
                UI.showToast('Failed to update employee information.', 'error');
            } else {
                alert('Failed to update employee information.');
            }
        } finally {
            saveBtn.disabled = false;
            saveBtn.innerHTML = '<i data-lucide="save" class="w-5 h-5"></i> Save Changes';
            if (window.lucide) lucide.createIcons();
        }
    }
}

// Initialize when DOM is ready
const salaryManager = new TeamSalaryManager();
document.addEventListener('DOMContentLoaded', () => {
    salaryManager.init();
});
