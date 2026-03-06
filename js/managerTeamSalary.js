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
            if (currentUser) {
                const displayName = ((currentUser.firstName || currentUser.lastName)) ? `${currentUser.firstName || ''} ${currentUser.lastName || ''}`.trim() : currentUser.username || 'Manager';
                document.getElementById('user-name').innerText = displayName;
                document.getElementById('user-role-dept').innerText = `${currentUser.roleName || 'Manager'} - ${currentUser.department || 'All'}`;
            }

            // Fetch all users to display as Team
            const users = await API.users.getAll();
            
            // Map users and generate mock salary data
            this.employees = users.map(user => {
                const salary = this.generateMockSalary(user);
                return {
                    id: user.id,
                    employeeId: `EMP${String(user.id).padStart(3, '0')}`,
                    name: `${user.firstName || ''} ${user.lastName || ''}`.trim() || user.username || 'Unknown Employee',
                    initials: this.getInitials(user),
                    position: user.roleName || 'Employee',
                    department: user.department || 'General',
                    baseSalary: salary,
                    rawUser: user
                };
            });

            this.filteredEmployees = [...this.employees];
            
            this.sortData();
            this.renderTable();

        } catch (error) {
            console.error('Error fetching data:', error);
            const tbody = document.getElementById('salaryTableBody');
            if (tbody) {
                tbody.innerHTML = `<tr><td colspan="5" class="px-6 py-8 text-center text-red-500">Error loading data: ${error.message}</td></tr>`;
            }
        }
    }

    generateMockSalary(user) {
        const baseRates = {
            'Manager': 80000,
            'HR Manager': 75000,
            'Senior': 60000,
            'Developer': 45000,
            'Designer': 40000,
            'QA': 35000,
            'Admin': 25000
        };

        let role = user.roleName || '';
        let matchedRate = 30000;

        for (const [key, rate] of Object.entries(baseRates)) {
            if (role.toLowerCase().includes(key.toLowerCase())) {
                matchedRate = rate;
                break;
            }
        }

        let idHash = 0;
        const idStr = String(user.id);
        for (let i = 0; i < idStr.length; i++) {
            idHash = ((idHash << 5) - idHash) + idStr.charCodeAt(i);
            idHash = idHash & idHash;
        }
        
        const variationPercent = (Math.abs(idHash) % 40) - 15; 
        let finalSalary = matchedRate * (1 + (variationPercent / 100));
        
        return Math.round(finalSalary / 500) * 500;
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
        return new Intl.NumberFormat('en-US', { 
            style: 'currency', 
            currency: 'USD',
            minimumFractionDigits: 0,
            maximumFractionDigits: 0
        }).format(amount).replace('$', '฿');
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
                        <button onclick="salaryManager.viewDetails('${emp.id}')" class="px-4 py-2 bg-blue-600 text-white hover:bg-blue-700 active:bg-blue-800 rounded-lg text-[11px] font-bold transition-all shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-1 tracking-wide">
                            View Details
                        </button>
                    </div>
                </td>
            </tr>
        `).join('');

        if (window.lucide) {
            lucide.createIcons();
        }

        totalCount.innerText = this.employees.length;
        showingText.innerText = `Showing ${this.filteredEmployees.length} of ${this.employees.length} employees`;
    }

    viewDetails(id) {
        const emp = this.employees.find(e => e.id == id);
        if (!emp) return;

        // Populate User Banner
        document.getElementById('modalAvatar').innerText = emp.initials;
        document.getElementById('modalName').innerText = emp.name;
        document.getElementById('modalPosition').innerText = emp.position;
        document.getElementById('modalEmpId').innerText = `ID: ${emp.employeeId}`;

        // Populate Contact Info
        document.getElementById('modalDept').innerText = emp.department;
        
        // Mock email and phone
        const usernameBase = emp.rawUser?.username || emp.name.split(' ')[0].toLowerCase() || 'employee';
        document.getElementById('modalEmail').innerText = `${usernameBase}@company.com`.toLowerCase();
        
        let hash = 0;
        const idStr = String(emp.id);
        for (let i = 0; i < idStr.length; i++) {
            hash = ((hash << 5) - hash) + idStr.charCodeAt(i);
        }
        const p1 = Math.abs(hash % 900) + 100;
        const p2 = Math.abs((hash * 7) % 9000) + 1000;
        document.getElementById('modalPhone').innerText = `+66 8X-${p1}-${p2}`;

        // Render Mock Leave Balances
        this.renderMockLeaveBalances(emp.id);

        // Show Modal
        const modal = document.getElementById('employeeModal');
        modal.classList.remove('hidden');
        document.body.style.overflow = 'hidden'; // Prevent background scrolling
    }

    closeModal() {
        const modal = document.getElementById('employeeModal');
        modal.classList.add('hidden');
        document.body.style.overflow = '';
    }

    renderMockLeaveBalances(userId) {
        // Deterministic mock generation
        let hash = 0;
        const idStr = String(userId);
        for (let i = 0; i < idStr.length; i++) {
            hash = ((hash << 5) - hash) + idStr.charCodeAt(i);
        }
        hash = Math.abs(hash);

        const leaves = [
            {
                name: 'Annual Leave',
                icon: 'u', // Umbrella icon approx (umbrella is lucide standard, fallback to umbrella)
                lucide: 'umbrella',
                total: 7,
                used: (hash % 5),
                colors: { bg: 'bg-blue-50', text: 'text-blue-600', fill: 'bg-blue-600', ring: 'border-blue-100' }
            },
            {
                name: 'Sick Leave',
                icon: 'heart',
                lucide: 'heart-pulse',
                total: 30,
                used: (hash % 10) + 1,
                colors: { bg: 'bg-red-50', text: 'text-red-500', fill: 'bg-red-600', ring: 'border-red-100' }
            },
            {
                name: 'Personal Leave',
                icon: 'user',
                lucide: 'user',
                total: 3,
                used: (hash % 3),
                colors: { bg: 'bg-purple-50', text: 'text-purple-500', fill: 'bg-purple-600', ring: 'border-purple-100' }
            },
            {
                name: 'Unpaid Leave',
                icon: 'dollar-sign',
                lucide: 'dollar-sign',
                total: 30,
                used: 0,
                colors: { bg: 'bg-gray-50', text: 'text-gray-500', fill: 'bg-gray-400', ring: 'border-gray-200' },
                hideProgress: true
            },
            {
                name: 'Ordination Leave',
                icon: 'star',
                lucide: 'sparkles',
                total: 15,
                used: (hash % 15 === 0) ? 15 : 0, // Rare
                colors: { bg: 'bg-amber-50', text: 'text-amber-500', fill: 'bg-amber-500', ring: 'border-amber-100' }
            }
        ];

        const container = document.getElementById('modalLeaveBalances');
        
        container.innerHTML = leaves.map(leave => {
            const left = leave.total - leave.used;
            const percentage = (leave.used / leave.total) * 100;
            
            const progressHtml = leave.hideProgress ? '' : `
                <div class="w-full bg-gray-100 rounded-full h-1.5 mt-3">
                    <div class="${leave.colors.fill} h-1.5 rounded-full" style="width: ${percentage}%"></div>
                </div>
            `;
            
            const textHtml = leave.hideProgress 
                ? `<div class="text-[11px] text-gray-500 font-medium">${leave.total} days available</div>`
                : `<div class="text-[11px] text-gray-500 font-medium">${left} of ${leave.total} days left</div>`;
                
            const valueHtml = leave.hideProgress
                ? `<div class="text-xl font-bold ${leave.colors.text} leading-none">${leave.total}</div>`
                : `<div class="text-xl font-bold ${leave.colors.text} leading-none">${left}</div>`;

            return `
                <div class="p-4 rounded-xl border ${leave.colors.ring} bg-white shadow-sm flex flex-col justify-center">
                    <div class="flex justify-between items-center w-full">
                        <div class="flex items-center space-x-3">
                            <div class="w-10 h-10 rounded-xl ${leave.colors.bg} ${leave.colors.text} flex items-center justify-center">
                                <i data-lucide="${leave.lucide}" class="w-5 h-5"></i>
                            </div>
                            <div>
                                <h5 class="font-bold text-gray-800 text-sm">${leave.name}</h5>
                                ${textHtml}
                            </div>
                        </div>
                        <div class="text-right flex flex-col items-end">
                            ${valueHtml}
                            <div class="text-[10px] text-gray-400 font-medium mt-0.5">days</div>
                        </div>
                    </div>
                    ${progressHtml}
                </div>
            `;
        }).join('');

        if (window.lucide) {
            lucide.createIcons();
        }
    }
}

const salaryManager = new ManagerTeamSalaryManager();
document.addEventListener('DOMContentLoaded', () => {
    salaryManager.init();
});
