/**
 * Manager Attendance Management
 */

class ManagerAttendanceManager {
    constructor() {
        this.employees = [];
        this.records = [];
        this.filteredRecords = [];
        this.searchQuery = '';
        this.currentFilter = 'all';
    }

    async init() {
        try {
            const userId = localStorage.getItem('userId');
            if (!userId) {
                window.location.href = '../../index.html';
                return;
            }

            // Set user profile Info in Navbar
            const currentUser = await API.users.getById(userId);
            const currentEmployeeProfile = await API.employees.getByUserId(userId);
            const managerDept = currentEmployeeProfile ? currentEmployeeProfile.departmentName : null;

            if (currentUser) {
                const displayName = (currentUser.firstName && currentUser.lastName) ? `${currentUser.firstName} ${currentUser.lastName}` : (currentUser.username || 'Manager');
                document.getElementById('user-name').innerText = displayName;
                document.getElementById('user-role-dept').innerText = managerDept ? `Manager - ${managerDept}` : 'Manager';
            }

            // 1. Fetch all employees first to identify department members
            const allEmployees = await API.employees.getAll() || [];
            
            // Filter employees by department
            if (managerDept) {
                this.employees = allEmployees.filter(emp => emp.departmentName === managerDept);
            } else {
                this.employees = allEmployees;
            }

            // Create a set of eligible employee IDs for filtering records
            const eligibleEmpIds = new Set(this.employees.map(e => (e.id || e.userId).toString()));

            // 2. Fetch real attendance records
            const rawRecords = await API.attendance.getAll() || [];
            
            // 3. Filter and process records
            this.records = rawRecords.filter(rec => {
                const empId = (rec.employeeID || rec.userId || '').toString();
                return eligibleEmpIds.has(empId) || !managerDept; // If no manager dept, show all
            }).map(rec => {
                const checkInDate = rec.checkInTime ? new Date(rec.checkInTime) : null;
                const checkOutDate = rec.checkOutTime ? new Date(rec.checkOutTime) : null;
                const attendanceDate = rec.attendanceDate ? new Date(rec.attendanceDate) : (checkInDate || new Date());

                return {
                    id: rec.attendanceID || rec.id,
                    name: rec.employeeName || 'Unknown Employee',
                    employeeId: rec.employeeID || 'N/A',
                    initials: this.getInitials({ 
                        firstName: (rec.employeeName || 'Unknown').split(' ')[0], 
                        lastName: (rec.employeeName || '').split(' ')[1] || '' 
                    }),
                    dateText: attendanceDate.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' }),
                    rawDate: attendanceDate,
                    checkIn: checkInDate ? checkInDate.toLocaleTimeString('en-GB') : '-',
                    checkOut: checkOutDate ? checkOutDate.toLocaleTimeString('en-GB') : '-',
                    workHours: this.calculateWorkHours(checkInDate, checkOutDate),
                    status: rec.status || 'Present',
                    notes: rec.notes || '-'
                };
            });

            // Fetch employees for summary calculation (Total count)
            this.employees = await API.employees.getAll();

            this.filteredRecords = [...this.records];
            this.updateSummary();
            this.renderTable();

        } catch (error) {
            console.error('Error fetching data:', error);
            const tbody = document.getElementById('attendanceTableBody');
            if (tbody) {
                tbody.innerHTML = `<tr><td colspan="7" class="px-6 py-8 text-center text-red-500">Error loading data: ${error.message}</td></tr>`;
            }
        }
    }

    calculateWorkHours(checkIn, checkOut) {
        if (!checkIn || !checkOut) return '-';
        const diff = (checkOut - checkIn) / (1000 * 60 * 60); // Hours
        return diff > 0 ? `${diff.toFixed(2)}h` : '-';
    }

    getInitials(user) {
        const name = user.firstName || user.username || 'U';
        const last = user.lastName || '';
        if (name && last) return `${name.charAt(0)}${last.charAt(0)}`.toUpperCase();
        return name.substring(0, 2).toUpperCase();
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

    getStatusBadge(status) {
        if (status === 'Present') {
            return `<span class="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-bold bg-emerald-50 text-emerald-600 border border-emerald-100/60 tracking-wide">
                <i data-lucide="check-circle" class="w-3.5 h-3.5"></i> Present
            </span>`;
        } else if (status === 'Late') {
            return `<span class="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-bold bg-yellow-50 text-amber-600 border border-yellow-200/60 tracking-wide">
                <i data-lucide="alert-circle" class="w-3.5 h-3.5"></i> Late
            </span>`;
        } else if (status === 'Absent') {
            return `<span class="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-bold bg-red-50 text-red-600 border border-red-100/60 tracking-wide">
                <i data-lucide="x-circle" class="w-3.5 h-3.5"></i> Absent
            </span>`;
        }
        return `<span>${status}</span>`;
    }

    handleSearch(query) {
        this.searchQuery = query.toLowerCase().trim();
        this.applyFilters();
    }

    handleFilter(status) {
        this.currentFilter = status;
        this.applyFilters();
    }

    applyFilters() {
        this.filteredRecords = this.records.filter(rec => {
            const matchesSearch = !this.searchQuery || 
                rec.name.toLowerCase().includes(this.searchQuery) ||
                rec.employeeId.toLowerCase().includes(this.searchQuery) ||
                rec.dateText.toLowerCase().includes(this.searchQuery);
            
            const matchesFilter = this.currentFilter === 'all' || rec.status === this.currentFilter;

            return matchesSearch && matchesFilter;
        });
        
        this.renderTable();
    }

    updateSummary() {
        // 1. Calculate Total Employees (Fallback to summary of records if API.employees is empty)
        let total = this.employees && this.employees.length > 0 ? this.employees.length : 0;
        
        // If we have no records, show summary of 0s but keep the Total count
        if (this.records.length === 0) {
            document.getElementById('statTotal').innerText = total;
            document.getElementById('statPresent').innerText = 0;
            document.getElementById('statAbsent').innerText = total;
            document.getElementById('statLate').innerText = 0;
            document.getElementById('statRateText').innerText = '0.0%';
            if (document.getElementById('statRateBar')) document.getElementById('statRateBar').style.width = '0%';
            return;
        }
        
        const newestDate = this.records[0].rawDate.getTime();
        const todaysRecords = this.records.filter(r => r.rawDate.getTime() === newestDate);

        let presentCount = 0;
        let lateCount = 0;
        let absentCount = 0;

        todaysRecords.forEach(r => {
            if (r.status === 'Present') presentCount++;
            else if (r.status === 'Late') lateCount++;
            else if (r.status === 'Absent') absentCount++;
        });

        // Some employees might not have a record yet for "today", they count as absent for summary purposes
        // Calculate dynamic total from records if API didn't provide employees list
        if (total === 0) {
            const uniqueEmployees = new Set(this.records.map(r => r.employeeId));
            total = uniqueEmployees.size;
        }

        absentCount = total - presentCount - lateCount;
        if (absentCount < 0) absentCount = 0;

        const rate = total > 0 ? ((presentCount + lateCount) / total) * 100 : 0;

        document.getElementById('statTotal').innerText = total;
        document.getElementById('statPresent').innerText = presentCount;
        document.getElementById('statAbsent').innerText = absentCount;
        document.getElementById('statLate').innerText = lateCount;
        document.getElementById('statRateText').innerText = `${rate.toFixed(1)}%`;
        
        const bar = document.getElementById('statRateBar');
        if (bar) {
            bar.style.width = `${Math.min(100, Math.max(0, rate))}%`;
            if (rate > 80) {
                bar.className = 'bg-gradient-to-r from-emerald-400 to-emerald-500 h-1.5 rounded-full transition-all duration-500 shadow-sm';
            } else if (rate > 50) {
                bar.className = 'bg-gradient-to-r from-yellow-400 to-amber-500 h-1.5 rounded-full transition-all duration-500 shadow-sm';
            } else {
                bar.className = 'bg-gradient-to-r from-orange-400 to-red-500 h-1.5 rounded-full transition-all duration-500 shadow-sm';
            }
        }
    }

    renderTable() {
        const tbody = document.getElementById('attendanceTableBody');
        const totalCount = document.getElementById('totalRecordsCount');
        const showingText = document.getElementById('showingText');

        if (!tbody) return;

        if (this.filteredRecords.length === 0) {
            tbody.innerHTML = `
                <tr>
                    <td colspan="7" class="px-6 py-12 text-center text-gray-500">
                        <p>No records found matching your criteria.</p>
                    </td>
                </tr>
            `;
            if (window.lucide) lucide.createIcons();
            totalCount.innerText = '0';
            showingText.innerText = `Showing 0 of ${this.records.length} records`;
            return;
        }

        tbody.innerHTML = this.filteredRecords.map(rec => `
            <tr class="hover:bg-gray-50/80 transition border-b border-gray-100 group bg-white">
                <td class="px-6 py-4">
                    <div class="flex items-center space-x-2 text-gray-500">
                        <i data-lucide="calendar" class="w-4 h-4 text-gray-400"></i>
                        <span class="text-[12px] whitespace-nowrap">${rec.dateText}</span>
                    </div>
                </td>
                <td class="px-6 py-4">
                    <div class="flex items-center space-x-3">
                        <div class="w-8 h-8 rounded-full flex items-center justify-center font-bold text-xs ${this.getBgColorClass(rec.initials)}">
                            ${rec.initials}
                        </div>
                        <div>
                            <div class="font-bold text-gray-800 text-sm whitespace-nowrap">${rec.name}</div>
                            <div class="text-[10px] text-gray-500 mt-0.5 tracking-wider font-semibold opacity-70">
                                ${rec.employeeId}
                            </div>
                        </div>
                    </div>
                </td>
                <td class="px-6 py-4 text-center">
                    <div class="flex items-center justify-center space-x-1.5 text-gray-600">
                        ${rec.checkIn !== '-' ? `<i data-lucide="clock" class="w-3.5 h-3.5 ${rec.status === 'Late' ? 'text-amber-500' : 'text-emerald-500'}"></i>` : ''}
                        <span class="text-sm font-medium ${rec.status === 'Late' ? 'text-amber-600' : ''}">${rec.checkIn}</span>
                    </div>
                </td>
                <td class="px-6 py-4 text-center">
                    <div class="flex items-center justify-center space-x-1.5 text-gray-600">
                        ${rec.checkOut !== '-' ? `<i data-lucide="clock" class="w-3.5 h-3.5 text-red-400"></i>` : ''}
                        <span class="text-sm font-medium">${rec.checkOut}</span>
                    </div>
                </td>
                <td class="px-6 py-4 text-center font-bold text-gray-700 text-sm">
                    ${rec.workHours}
                </td>
                <td class="px-6 py-4 text-center">
                    ${this.getStatusBadge(rec.status)}
                </td>
                <td class="px-6 py-4 text-gray-500 text-xs truncate max-w-[120px]">
                    ${rec.notes}
                </td>
            </tr>
        `).join('');

        if (window.lucide) {
            lucide.createIcons();
        }

        totalCount.innerText = this.filteredRecords.length;
        showingText.innerText = `Showing ${this.filteredRecords.length} of ${this.records.length} records`;
    }
}

const attendanceManager = new ManagerAttendanceManager();
document.addEventListener('DOMContentLoaded', () => {
    attendanceManager.init();
});
