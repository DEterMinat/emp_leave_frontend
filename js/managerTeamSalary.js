/**
 * Manager Team Salary Management
 */

class ManagerTeamSalaryManager {
    constructor() {
        this.employees = [];
        this.filteredEmployees = [];
        this.currentSort = 'name';
        this.searchQuery = '';
    }

    async init() {
        try {
            // Check auth
            const userId = localStorage.getItem('userId');
            if (!userId) {
                window.location.href = '../../index.html';
                return;
            }

            // Set user profile Info in Navbar
            const currentUser = await API.users.getById(userId);
            const currentEmployee = await API.employees.getByUserId(userId);
            const managerDept = currentEmployee ? currentEmployee.departmentName : null;

            if (currentUser) {
                const displayName = ((currentUser.firstName || currentUser.lastName)) ? `${currentUser.firstName || ''} ${currentUser.lastName || ''}`.trim() : currentUser.username || 'Manager';
                document.getElementById('user-name').innerText = displayName;
                document.getElementById('user-role-dept').innerText = managerDept ? `Manager - ${managerDept}` : 'Manager';
            }

            // Fetch all employees from the new endpoint
            let employeesData = await API.employees.getAll();
            
            // Filter by manager's department
            if (managerDept) {
                employeesData = employeesData.filter(emp => emp.departmentName === managerDept);
            }
            
            // Map the real employee data
            this.employees = employeesData.map(emp => {
                const id = emp.id || emp.userId;
                return {
                    id: id,
                    employeeId: emp.employeeNumber || `EMP${String(id).slice(-4).toUpperCase()}`,
                    userId: emp.userId,
                    name: `${emp.firstName || ''} ${emp.lastName || ''}`.trim() || emp.username || 'Unknown Employee',
                    initials: this.getInitials(emp),
                    position: emp.position || 'Employee',
                    department: emp.departmentName || 'General',
                    baseSalary: emp.salary || 0,
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

    getBgColorClass(initials) {
        const colors = [
            'text-blue-600 bg-blue-100 border border-blue-200',
            'text-indigo-600 bg-indigo-100 border border-indigo-200',
            'text-purple-600 bg-purple-100 border border-purple-200',
            'text-rose-600 bg-rose-100 border border-rose-200',
            'text-emerald-600 bg-emerald-100 border border-emerald-200',
            'text-cyan-600 bg-cyan-100 border border-cyan-200'
        ];
        
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
                        <p>No employees found matching your search.</p>
                    </td>
                </tr>
            `;
            if (window.lucide) lucide.createIcons();
            totalCount.innerText = '0';
            showingText.innerText = `Showing 0 of ${this.employees.length} employees`;
            return;
        }

        tbody.innerHTML = this.filteredEmployees.map(emp => `
            <tr class="hover:bg-gray-50/80 transition border-b border-gray-100 group bg-white">
                <td class="px-6 py-4">
                    <div class="flex items-center space-x-4">
                        <div class="w-10 h-10 rounded-full flex items-center justify-center font-bold text-sm ${this.getBgColorClass(emp.initials)}">
                            ${emp.initials}
                        </div>
                        <div>
                            <div class="font-bold text-gray-800">${emp.name}</div>
                            <div class="text-[11px] text-gray-500 mt-0.5 tracking-wider font-semibold opacity-70">
                                ID: ${emp.employeeId}
                            </div>
                        </div>
                    </div>
                </td>
                <td class="px-6 py-4 text-gray-600 text-sm font-medium">${emp.position}</td>
                <td class="px-6 py-4 text-center">
                    <span class="inline-flex items-center px-3 py-1 rounded-full text-[11px] font-bold bg-blue-50 text-blue-600 border border-blue-100/60 tracking-wide">
                        ${emp.department || 'General'}
                    </span>
                </td>
                <td class="px-6 py-4 text-right font-bold text-gray-800 text-sm tracking-wide">
                    ${this.formatCurrency(emp.baseSalary)}
                </td>
                <td class="px-6 py-4">
                    <div class="flex items-center justify-center">
                        <button onclick="salaryManager.viewDetails('${emp.id}')" class="px-4 py-2 bg-blue-600 text-white hover:bg-blue-700 rounded-xl text-[11px] font-bold tracking-wide transition-all flex items-center justify-center gap-2 shadow-sm whitespace-nowrap min-w-[120px]">
                            <i data-lucide="eye" class="w-3.5 h-3.5"></i>
                            <span data-i18n="common.viewDetails">View Details</span>
                        </button>
                    </div>
                </td>
            </tr>
        `).join('');

        if (window.lucide) {
            lucide.createIcons();
        }
        if (window.I18N) {
            I18N.updateDOM();
        }

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
        
        // Email and Phone from rawUser or fallbacks (matching HR logic)
        const userRaw = emp.rawUser || {};
        document.getElementById('modalEmail').innerText = userRaw.email || (userRaw.username ? `${userRaw.username}@company.com` : 'employee@company.com');
        document.getElementById('modalPhone').innerText = userRaw.phoneNumber || userRaw.phone || '+66 8X-XXX-XXXX';

        // Show loading state for balances
        document.getElementById('modalLeaveBalances').innerHTML = `
            <div class="col-span-full py-8 text-center text-gray-500">
                <i data-lucide="loader-2" class="w-8 h-8 animate-spin mx-auto mb-2 text-blue-500"></i>
                <p>Loading leave balances...</p>
            </div>
        `;
        if (window.lucide) lucide.createIcons();

        // Show Modal immediately 
        const modal = document.getElementById('employeeModal');
        modal.classList.remove('hidden');
        document.body.style.overflow = 'hidden'; 

        try {
            // HYBRID + DASHBOARD LOGIC (Synced with HR View)
            const targetId = emp.userId || emp.id;
            let quotas = [];
            let leaves = [];
            
            const results = await Promise.allSettled([
                API.leaveBalances.getByEmployeeId(targetId),
                API.leaves.getAll(targetId)
            ]);

            if (results[0].status === 'fulfilled') quotas = results[0].value;
            if (results[1].status === 'fulfilled') leaves = results[1].value;

            const consolidatedBalances = this.calculateDashboardStyleBalances(leaves, quotas, emp.rawUser);
            this.renderRealLeaveBalances(consolidatedBalances);

        } catch (error) {
            console.error('Error loading leave balances:', error);
            document.getElementById('modalLeaveBalances').innerHTML = `
                <div class="col-span-full py-4 text-center text-red-500 bg-red-50 rounded-lg">
                    <p class="font-medium text-sm">Failed to load leave balances.</p>
                </div>
            `;
        }
    }

    closeModal() {
        const modal = document.getElementById('employeeModal');
        if (modal) modal.classList.add('hidden');
        document.body.style.overflow = '';
    }

    calculateDashboardStyleBalances(leaves, quotas = null, employee = null) {
        // Default Entitlements (Matching Global Sync: Sick 30, Unpaid 365)
        const types = [
            { key: 'Annual Leave', idKey: 'annual', total: 6 },
            { key: 'Sick Leave', idKey: 'sick', total: 30 },
            { key: 'Personal Leave', idKey: 'personal', total: 3 },
            { key: 'Ordination Leave', idKey: 'ordination', total: 15 },
            { key: 'Unpaid Leave', idKey: 'unpaid', total: 365 }
        ];

        const normalize = s => (s || '').toString().trim().toLowerCase().replace(/[^a-z0-9]+/g, ' ');

        const usedByKey = {};
        (leaves || []).forEach(l => {
            if ((l.status || '').toString().toLowerCase() !== 'approved') return;
            
            let days = 1;
            if (l.startDate && l.endDate) {
                const s = new Date(l.startDate);
                const e = new Date(l.endDate);
                days = LeaveRequest.calculateDays(l.startDate, l.endDate) || 0;
            }
            
            const candidates = [l.leaveTypeName, l.leaveType, l.type, l.leaveTypeCode, l.leaveTypeId, l.leaveTypeKey, l.name, l.code];
            candidates.forEach(c => {
                if (!c) return;
                const k = normalize(c);
                if (!k) return;
                usedByKey[k] = (usedByKey[k] || 0) + days;
            });
        });

        const quotaMap = {};
        if (Array.isArray(quotas)) {
            quotas.forEach(q => {
                if (q.leaveTypeName) quotaMap[normalize(q.leaveTypeName)] = q.totalDays;
            });
        }

        const getUsedForType = (t) => {
            const wantKeys = [normalize(t.key)];
            if (t.idKey) wantKeys.push(normalize(t.idKey));
            const tokens = (t.key || '').toString().toLowerCase().split(/[^a-z0-9]+/).filter(Boolean);
            tokens.forEach(tok => {
                if (tok !== 'leave') wantKeys.push(tok);
            });

            for (const wk of wantKeys) {
                if (usedByKey[wk]) return usedByKey[wk];
            }

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
            
            // ADJUST ANNUAL QUOTA BASED ON TENURE + CARRY-OVER
            if (t.idKey === 'annual' && employee && (employee.createdAt || employee.joiningDate)) {
                total = LeaveRequest.getAnnualQuotaWithCarryOver(employee.createdAt || employee.joiningDate, leaves);
            }

            // Force Sick and Unpaid Leave
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

    renderRealLeaveBalances(balancesData) {
        const container = document.getElementById('modalLeaveBalances');
        
        if (!balancesData || balancesData.length === 0) {
            container.innerHTML = `<div class="col-span-full py-6 text-center text-gray-400"><p class="text-sm">No leave balances found.</p></div>`;
            return;
        }

        const styleConfig = {
            'Annual Leave': { icon: 'umbrella', colors: { bg: 'bg-blue-50', text: 'text-blue-600', fill: 'bg-blue-600', ring: 'border-blue-100' } },
            'Sick Leave': { icon: 'heart', colors: { bg: 'bg-red-50', text: 'text-red-500', fill: 'bg-red-600', ring: 'border-red-100' } },
            'Personal Leave': { icon: 'user', colors: { bg: 'bg-purple-50', text: 'text-purple-500', fill: 'bg-purple-600', ring: 'border-purple-100' } },
            'Ordination Leave': { icon: 'sparkles', colors: { bg: 'bg-amber-50', text: 'text-amber-500', fill: 'bg-amber-500', ring: 'border-amber-100' } },
            'Unpaid Leave': { icon: 'dollar-sign', colors: { bg: 'bg-gray-50', text: 'text-gray-500', fill: 'bg-gray-400', ring: 'border-gray-200' } },
            'default': { icon: 'calendar', colors: { bg: 'bg-gray-50', text: 'text-gray-600', fill: 'bg-gray-500', ring: 'border-gray-200' } }
        };

        container.innerHTML = `<div class="space-y-4">` + balancesData.map(balance => {
            const config = styleConfig[balance.leaveTypeName] || styleConfig['default'];
            const left = balance.remainingDays;
            const used = balance.usedDays;
            const total = balance.totalDays;
            const percentage = total > 0 ? Math.min(100, (used / total) * 100) : 0;

            return `
                <div class="p-4 rounded-xl border ${config.colors.ring} ${config.colors.bg} shadow-sm group hover:shadow-md transition-all duration-300">
                    <div class="flex justify-between items-center relative z-10">
                        <div class="flex items-center space-x-3">
                            <div class="w-10 h-10 rounded-xl bg-white shadow-sm flex items-center justify-center ${config.colors.text}">
                                <i data-lucide="${config.icon}" class="w-5 h-5"></i>
                            </div>
                            <div>
                                <h5 class="font-bold text-gray-800 text-sm">${balance.leaveTypeName}</h5>
                                <p class="text-[11px] text-gray-500 font-medium">
                                    <span class="font-bold text-gray-700">${used}</span> of ${total} days used
                                </p>
                            </div>
                        </div>
                        <div class="text-right">
                            <div class="text-xl font-bold ${config.colors.text}">${left}</div>
                            <div class="text-[10px] text-gray-400 font-bold uppercase mt-0.5">left</div>
                        </div>
                    </div>
                    <div class="mt-3 w-full bg-white/60 rounded-full h-1.5 px-0.5 py-0.5 overflow-hidden">
                        <div class="${config.colors.fill} h-1 rounded-full transition-all duration-500" style="width: ${percentage}%"></div>
                    </div>
                </div>
            `;
        }).join('') + `</div>`;

        if (window.lucide) lucide.createIcons();
    }
}

const salaryManager = new ManagerTeamSalaryManager();
document.addEventListener('DOMContentLoaded', () => {
    salaryManager.init();
});
