// hrDashboard.js
// Script extracted from pages/hr/dashboard.html to avoid inline script rendering issues
if (typeof lucide !== 'undefined' && lucide.createIcons) lucide.createIcons();

async function initHRDashboard() {
    // Similar to employee dashboard but fetches global data for HR
    try {
        // For HR dashboard we will show only the HR user's own data (like employee dashboard)
        const userId = localStorage.getItem('userId');
        const leaves = userId ? await API.leaves.getAll(userId) : [];

        // update stats from the user's own leaves
        const total = (leaves || []).length;
        const pending = (leaves || []).filter(l => (l.status || '').toLowerCase() === 'pending').length;
        const approved = (leaves || []).filter(l => (l.status || '').toLowerCase() === 'approved').length;

        document.getElementById('total-req').innerText = total;
        document.getElementById('pending-req').innerText = pending;
        document.getElementById('total-approved').innerText = approved;

        // Do not probe multiple entitlement endpoints (caused noisy console errors).
        // We'll compute used days from the user's own leave requests and fall back to defaults.
        renderLeaveBalances(leaves, null);
        renderRecentRequests(leaves);

        lucide.createIcons();
    } catch (e) {
        console.error('initHRDashboard error', e);
        if (typeof UI !== 'undefined' && UI.showToast) UI.showToast('ไม่สามารถโหลดข้อมูล HR Dashboard', 'error');
    }
}

// Try a few plausible endpoints to get leave entitlements / balances for the user.
async function getLeaveEntitlements(userId) {
    const candidates = [
        `/api/LeaveBalances/${userId}`,
        `/api/LeaveBalances/employee/${userId}`,
        `/api/Users/${userId}/leaveBalances`,
        `/api/Employees/${userId}/leaveBalances`,
        `/api/Users/${userId}`
    ];
    // Use direct fetch (quiet) instead of API.request to avoid noisy logged errors
    for (const ep of candidates) {
        try {
            const url = (typeof API !== 'undefined' && API.baseUrl) ? API.baseUrl + ep : ep;
            const res = await fetch(url, { method: 'GET' });
            if (!res || !res.ok) {
                // silently skip non-2xx responses (404/405 etc.)
                console.debug && console.debug('entitlement endpoint not available or returned', res && res.status, ep);
                continue;
            }

            const data = await res.json();
            if (!data) continue;
            if (data.leaveBalances) return data.leaveBalances;
            if (data.annual || data.sick || data.personal) return data;
            if (Array.isArray(data)) {
                const map = {};
                data.forEach(item => {
                    if (item.type && item.total) map[item.type] = item.total;
                });
                if (Object.keys(map).length) return map;
            }
        } catch (err) {
            // network or parse error — keep quiet (debug only)
            console.debug && console.debug('entitlement fetch error', ep, err && err.message);
            continue;
        }
    }
    return null;
}

// Render leave balance cards: compute used days per leave type and show progress
function renderLeaveBalances(leaves, entitlements = null) {
    const container = document.getElementById('leave-balance');
    const types = [
        { key: 'Annual Leave', idKey: 'annual', total: 6, icon: 'sun', color: 'from-blue-400 to-blue-300 text-white' },
        { key: 'Sick Leave', idKey: 'sick', total: 3, icon: 'heart', color: 'from-pink-300 to-pink-200 text-white' },
        { key: 'Personal Leave', idKey: 'personal', total: 3, icon: 'user', color: 'from-purple-300 to-purple-200 text-white' },
        { key: 'Ordination Leave', idKey: 'ordination', total: 15, icon: 'crown', color: 'from-teal-300 to-teal-200 text-white' },
        { key: 'Unpaid Leave', idKey: 'unpaid', total: 365, icon: 'dollar-sign', color: 'from-green-300 to-green-200 text-white' }
    ];

    const usedMap = {};
    leaves.forEach(l => {
        const name = (l.leaveTypeName || l.leaveType || '').toString();
        const status = (l.status || '').toString().toLowerCase();
        if (status !== 'approved') return;
        const days = LeaveRequest.calculateDays(l.startDate, l.endDate) || 0;
        usedMap[name] = (usedMap[name] || 0) + days;
    });

    container.innerHTML = types.map(t => {
        const used = usedMap[t.key] || usedMap[t.key.toLowerCase()] || 0;
        const total = (entitlements && (entitlements[t.idKey] || entitlements[t.key] || entitlements[t.key.toLowerCase()])) || t.total;
        const percent = total > 0 ? Math.min(100, Math.round((used / total) * 100)) : 0;
        return `
            <div class="bg-white p-4 rounded-2xl shadow-sm border hover:shadow-md transition">
                <div class="flex justify-between items-start mb-4">
                    <div class="p-3 rounded-xl bg-gradient-to-tr ${t.color} flex items-center justify-center">
                        <i data-lucide="${t.icon}" class="w-5 h-5"></i>
                    </div>
                    <div class="text-right">
                        <span class="text-2xl font-bold">${used}</span>
                        <div class="text-gray-400 text-sm italic">of ${total} days</div>
                    </div>
                </div>
                <p class="font-semibold text-gray-700 mb-3">${t.key}</p>
                <div class="w-full bg-gray-100 rounded-full h-2 overflow-hidden">
                    <div class="h-2 rounded-full bg-gradient-to-r ${t.color}" style="width: ${percent}%"></div>
                </div>
            </div>
        `;
    }).join('');

    lucide.createIcons();
}

function renderRecentRequests(leaves) {
    const container = document.getElementById('recent-requests');
    container.innerHTML = (leaves || []).slice(0, 6).map(req => `
        <div class="bg-white p-5 rounded-2xl shadow-sm border">
            <div class="flex justify-between mb-3">
                <h4 class="font-bold">${req.leaveTypeName || req.type || 'Leave Request'}</h4>
                ${UI.getStatusBadge(req.status)}
            </div>
            <p class="text-sm text-gray-500 flex items-center space-x-2">
                <i data-lucide="calendar" class="w-4 h-4"></i>
                <span>${UI.formatDate(req.startDate)} - ${UI.formatDate(req.endDate)}</span>
            </p>
            <p class="text-sm text-gray-700 mt-1 italic leading-relaxed">Reason: ${req.reason}</p>
        </div>
    `).join('');
    lucide.createIcons();
}

// Wait for dependencies (API and UI) to be available before initializing.
async function waitForDepsAndInit(timeoutMs = 3000) {
    const start = Date.now();
    while (Date.now() - start < timeoutMs) {
        if (typeof API !== 'undefined' && typeof UI !== 'undefined' && typeof LeaveRequest !== 'undefined') {
            try { initHRDashboard(); } catch (e) { console.error(e); }
            return;
        }
        await new Promise(r => setTimeout(r, 100));
    }
    console.error('hrDashboard: dependencies API/UI not available after timeout');
}

window.addEventListener('load', () => waitForDepsAndInit(3000));
