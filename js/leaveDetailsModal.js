/**
 * LeaveDetailsModal.js
 * Injects and manages the "Leave Request Details" modal.
 * Triggered by clicking table rows in history pages.
 */
(function () {
    const modalHtml = `
    <div id="leaveDetailsModal" class="fixed inset-0 bg-black/60 hidden z-[60] flex items-center justify-center p-4 backdrop-blur-sm" role="dialog" aria-modal="true">
        <div id="leaveDetailsPanel" class="bg-white rounded-[2.5rem] shadow-2xl w-full max-w-lg overflow-hidden transform transition-all border border-gray-100 flex flex-col" style="max-height: 90vh;">
            <!-- Header with Status Icon -->
            <div id="detailsStatusHeader" class="p-4 flex items-center justify-center space-x-2 font-bold text-sm tracking-wide border-b">
                <i id="detailsStatusIcon" class="w-5 h-5"></i>
                <span id="detailsStatusLabel">Status</span>
            </div>

            <!-- Header Content -->
            <div class="px-8 pt-8 pb-4 flex justify-between items-start relative bg-white">
                <div class="flex items-center space-x-4">
                    <div id="detailsAvatar" class="w-14 h-14 rounded-full bg-blue-600 flex items-center justify-center text-white font-bold text-xl ring-4 ring-blue-50 shadow-lg">
                        JD
                    </div>
                    <div>
                        <h3 id="detailsEmployeeName" class="text-xl font-bold text-gray-800">John Doe</h3>
                        <p id="detailsEmployeeId" class="text-xs text-gray-400 font-medium">Employee ID: EMP001</p>
                    </div>
                </div>
                <button id="leaveDetailsClose" aria-label="Close details modal" class="p-2 hover:bg-gray-100 rounded-full transition">
                    <i data-lucide="x" class="w-6 h-6 text-gray-400"></i>
                </button>
            </div>

            <div class="overflow-y-auto px-8 pb-8 space-y-6">
                <!-- Info Grid: Leave Type and Duration -->
                <div class="grid grid-cols-2 gap-4">
                    <div class="bg-blue-50/50 p-4 rounded-2xl border border-blue-100">
                        <div class="flex items-center space-x-2 text-blue-600 mb-1">
                            <i data-lucide="file-text" class="w-4 h-4"></i>
                            <span class="text-[10px] font-bold uppercase tracking-wider">Leave Type</span>
                        </div>
                        <p id="detailsLeaveType" class="text-base font-bold text-gray-800">Annual Leave</p>
                    </div>
                    <div class="bg-purple-50/50 p-4 rounded-2xl border border-purple-100">
                        <div class="flex items-center space-x-2 text-purple-600 mb-1">
                            <i data-lucide="clock" class="w-4 h-4"></i>
                            <span class="text-[10px] font-bold uppercase tracking-wider">Duration</span>
                        </div>
                        <p id="detailsDuration" class="text-base font-bold text-gray-800">5 Days</p>
                    </div>
                </div>

                <!-- Leave Period Section -->
                <div class="border border-gray-100 rounded-2xl p-5 shadow-sm">
                    <div class="flex items-center space-x-2 text-gray-400 mb-4">
                        <i data-lucide="calendar" class="w-4 h-4"></i>
                        <span class="text-[10px] font-bold uppercase tracking-wider">Leave Period</span>
                    </div>
                    <div class="grid grid-cols-2 gap-6 relative">
                        <div class="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-8 h-8 flex items-center justify-center text-gray-200">
                            <i data-lucide="arrow-right" class="w-4 h-4"></i>
                        </div>
                        <div>
                            <p class="text-[10px] text-gray-400 font-bold mb-1">Start Date</p>
                            <p id="detailsStartDate" class="text-sm font-bold text-gray-800 text-ellipsis overflow-hidden">Wednesday, Jan 15, 2025</p>
                        </div>
                        <div class="text-right">
                            <p class="text-[10px] text-gray-400 font-bold mb-1">End Date</p>
                            <p id="detailsEndDate" class="text-sm font-bold text-gray-800 text-ellipsis overflow-hidden">Sunday, Jan 19, 2025</p>
                        </div>
                    </div>
                </div>

                <!-- Reason Section -->
                <div class="border border-gray-100 rounded-2xl p-5 shadow-sm">
                    <div class="flex items-center space-x-2 text-gray-400 mb-2">
                        <i data-lucide="message-square" class="w-4 h-4"></i>
                        <span class="text-[10px] font-bold uppercase tracking-wider">Reason</span>
                    </div>
                    <p id="detailsReason" class="text-sm text-gray-600 leading-relaxed">Family vacation planned for the new year</p>
                </div>

                <!-- Submission Details -->
                <div class="bg-gray-50/50 p-4 rounded-2xl flex items-center space-x-3">
                    <div class="w-8 h-8 rounded-full bg-white flex items-center justify-center shadow-sm text-gray-400">
                        <i data-lucide="info" class="w-4 h-4"></i>
                    </div>
                    <div>
                        <p class="text-[10px] text-gray-400 font-bold">Submitted On</p>
                        <p id="detailsSubmittedOn" class="text-[11px] font-bold text-gray-700">Friday, Dec 20, 2024 - 07:00 AM</p>
                    </div>
                </div>
            </div>

            <!-- Footer -->
            <div class="p-6 border-t border-gray-100 flex justify-end bg-white">
                <button id="leaveDetailsCloseBtn" class="px-8 py-3 bg-gray-100 hover:bg-gray-200 text-gray-700 font-bold rounded-2xl transition-all shadow-sm active:scale-[0.98]">
                    Close
                </button>
            </div>
        </div>
    </div>
    `;

    function injectModal() {
        if (document.getElementById('leaveDetailsModal')) return;
        document.body.insertAdjacentHTML('beforeend', modalHtml);
        lucide.createIcons();
        setupBehaviors();
    }

    function setupBehaviors() {
        const modal = document.getElementById('leaveDetailsModal');
        const closeBtn = document.getElementById('leaveDetailsClose');
        const closeBtn2 = document.getElementById('leaveDetailsCloseBtn');

        window.LeaveDetailsModal = {
            view: function (id) {
                // Try to find the request in global state if available
                let req = null;
                if (typeof allLeaves !== 'undefined') {
                    req = allLeaves.find(l => (l.id === id || l.leaveId === id || l._id === id));
                }
                
                if (req) {
                    this.populate(req);
                    this.open();
                } else if (typeof API !== 'undefined') {
                    // Fetch from API if not in cache
                    API.request(`/api/LeaveRequests/${id}`).then(data => {
                        this.populate(data);
                        this.open();
                    }).catch(err => {
                        console.error('Failed to fetch leave request details', err);
                        if (typeof UI !== 'undefined') UI.showToast('ไม่สามารถดึงข้อมูลรายละเอียดการลาได้', 'error');
                    });
                }
            },
            open: function () {
                modal.classList.remove('hidden');
                document.body.style.overflow = 'hidden';
            },
            close: function () {
                modal.classList.add('hidden');
                document.body.style.overflow = '';
            },
            populate: function (req) {
                const status = (req.status || 'Pending').toLowerCase();
                const header = document.getElementById('detailsStatusHeader');
                const label = document.getElementById('detailsStatusLabel');
                const icon = document.getElementById('detailsStatusIcon');
                
                // Header Styling by Status
                if (status === 'approved' || status === 'approve') {
                    header.className = "p-4 flex items-center justify-center space-x-2 font-bold text-sm tracking-wide border-b bg-green-50 text-green-700 border-green-100";
                    label.innerText = 'Approved';
                    icon.className = "w-5 h-5 text-green-500";
                    icon.setAttribute('data-lucide', 'check-circle');
                } else if (status === 'rejected' || status === 'reject') {
                    header.className = "p-4 flex items-center justify-center space-x-2 font-bold text-sm tracking-wide border-b bg-red-50 text-red-700 border-red-100";
                    label.innerText = 'Rejected';
                    icon.className = "w-5 h-5 text-red-500";
                    icon.setAttribute('data-lucide', 'x-circle');
                } else {
                    header.className = "p-4 flex items-center justify-center space-x-2 font-bold text-sm tracking-wide border-b bg-yellow-50 text-yellow-700 border-yellow-100";
                    label.innerText = 'Pending';
                    icon.className = "w-5 h-5 text-yellow-500";
                    icon.setAttribute('data-lucide', 'clock');
                }
                
                // Employee Info
                const employeeName = req.employeeName || req.employeeUsername || (typeof currentUser !== 'undefined' && currentUser ? currentUser.username : 'Employee');
                document.getElementById('detailsEmployeeName').innerText = employeeName;
                document.getElementById('detailsEmployeeId').innerText = `Employee ID: ${req.employeeId || 'N/A'}`;
                
                const avatar = document.getElementById('detailsAvatar');
                if (typeof getInitials === 'function') {
                    avatar.innerText = getInitials(employeeName);
                } else {
                    avatar.innerText = employeeName.substring(0, 2).toUpperCase();
                }

                // Leave Info
                document.getElementById('detailsLeaveType').innerText = req.leaveTypeName || req.type || 'Leave Request';
                const days = req.totalDays || (typeof LeaveRequest !== 'undefined' ? LeaveRequest.calculateDays(req.startDate, req.endDate) : 0);
                document.getElementById('detailsDuration').innerText = `${days} ${days > 1 ? 'Days' : 'Day'}`;

                // Dates
                const fmt = (d) => new Date(d).toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
                document.getElementById('detailsStartDate').innerText = fmt(req.startDate);
                document.getElementById('detailsEndDate').innerText = fmt(req.endDate);

                // Reason
                document.getElementById('detailsReason').innerText = req.reason || '(No reason provided)';

                // Submitted At
                const submittedAt = req.createdAt || req.startDate;
                document.getElementById('detailsSubmittedOn').innerText = new Date(submittedAt).toLocaleString('en-US', { 
                    weekday: 'long', 
                    year: 'numeric', 
                    month: 'long', 
                    day: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit'
                });

                if (window.lucide) {
                    lucide.createIcons();
                }
            }
        };

        if (closeBtn) closeBtn.onclick = () => window.LeaveDetailsModal.close();
        if (closeBtn2) closeBtn2.onclick = () => window.LeaveDetailsModal.close();
        
        // Close on outside click
        modal.onclick = (e) => {
            if (e.target === modal) window.LeaveDetailsModal.close();
        };
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', injectModal);
    } else {
        injectModal();
    }
})();
