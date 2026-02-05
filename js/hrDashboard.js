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

    // Try to fetch authoritative entitlements / leave balances for this user.
    // If available, use them as the 'total' values; otherwise fallback to defaults computed below.
    const entitlements = await getLeaveEntitlements(userId);
    console.debug && console.debug('HR entitlements for user', userId, entitlements);
    renderLeaveBalances(leaves, entitlements);
        renderRecentRequests(leaves);

        lucide.createIcons();
    } catch (e) {
        console.error('initHRDashboard error', e);
        if (typeof UI !== 'undefined' && UI.showToast) UI.showToast('ไม่สามารถโหลดข้อมูล HR Dashboard', 'error');
    }
}

// Try a few plausible endpoints to get leave entitlements / balances for the user.
async function getLeaveEntitlements(userId) {
    // Prefer documented endpoints (try in this order):
    // 1) GET /api/LeaveBalances/employee/{employeeId}
    // 2) GET /api/LeaveBalances/mine (requires auth)
    // 3) GET /api/LeaveBalances (returns all - try to find matching employee)
    // Use API.request so Authorization header is sent when available.
    const endpoints = [
        `/api/LeaveBalances/employee/${userId}`,
        `/api/LeaveBalances/mine`,
        `/api/LeaveBalances`
    ];

    for (const ep of endpoints) {
        try {
            console.debug && console.debug('Trying entitlement endpoint', ep);
            const data = await API.request(ep);
            if (!data) {
                console.debug && console.debug('No data from entitlement endpoint', ep);
                continue;
            }

            // If endpoint returned wrapper { leaveBalances: ... }
            if (data.leaveBalances) {
                return data.leaveBalances;
            }

            // If endpoint returned an object with known fields
            if (data.annual || data.sick || data.personal || data.unpaid) {
                return data;
            }

            // If endpoint returned an array of balances, try to convert
            if (Array.isArray(data)) {
                const map = {};
                data.forEach(item => {
                    // common shapes: { type: 'Annual Leave', total: 6 } or { key: 'annual', value: 6 }
                    if (item.type && (item.total !== undefined)) map[item.type] = item.total;
                    else if (item.key && (item.value !== undefined)) map[item.key] = item.value;
                    else if (item.leaveType && (item.amount !== undefined)) map[item.leaveType] = item.amount;
                });
                if (Object.keys(map).length) return map;
            }

            // If GET /api/LeaveBalances returned a single object with employee-specific keys
            if (typeof data === 'object') return data;

        } catch (err) {
            // API.request will throw for non-2xx; inspect status from message when available
            console.debug && console.debug('Entitlement endpoint error for', ep, err && err.message);
            // If 401 Unauthorized, stop trying endpoints that require auth and fallback
            if (err && /401|Unauthorized/i.test(err.message)) {
                console.debug && console.debug('Entitlement endpoints require auth - aborting further attempts');
                break;
            }
            // continue to next candidate for 404/405 or network errors
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

    // Build a normalized map of used days keyed by multiple plausible identifiers
    const usedMap = {};
    const norm = s => (s || '').toString().trim().toLowerCase();

    leaves.forEach(l => {
        const status = (l.status || '').toString().toLowerCase();
        if (status !== 'approved') return;
        const days = LeaveRequest.calculateDays(l.startDate, l.endDate) || 0;

        // collect plausible keys for this leave entry
        const keys = new Set();
        const name = l.leaveTypeName || l.leaveType || l.type || '';
        if (name) keys.add(norm(name));
        if (l.leaveTypeId) keys.add(String(l.leaveTypeId));
        if (l.leaveTypeCode) keys.add(norm(l.leaveTypeCode));
        if (l.type) keys.add(norm(l.type));

        // add days to all candidate keys
        keys.forEach(k => {
            if (!k) return;
            usedMap[k] = (usedMap[k] || 0) + days;
        });
    });

    // debug: show what usedMap we calculated and entitlements we received
    console.debug && console.debug('renderLeaveBalances entitlements:', entitlements, 'usedMap preview (first 10):', Object.entries(usedMap).slice(0,10));

    container.innerHTML = types.map(t => {
        // try multiple normalized candidates to find used days
        const candidates = [norm(t.key), norm(t.idKey), String(t.idKey), norm(t.key.replace(/\s+/g, ' '))].filter(Boolean);
        let used = 0;
        let matchedKey = null;
        for (const c of candidates) {
            if (usedMap[c]) { used = usedMap[c]; matchedKey = c; break; }
        }

        // Fallback: if no direct key matched, try substring or contains match on usedMap keys
        if (!used) {
            const want = norm(t.key);
            for (const k of Object.keys(usedMap)) {
                try {
                    if (!k) continue;
                    const kn = k.toString().toLowerCase();
                    if (kn.includes(want) || want.includes(kn) || kn.includes(norm(t.idKey))) {
                        used = usedMap[k];
                        matchedKey = k;
                        break;
                    }
                } catch (e) { continue; }
            }
        }

        console.debug && console.debug('leave balance mapping', t.key, { candidates, matchedKey, used });

        // Resolve total from entitlements if provided (try multiple key shapes)
        const total = (function() {
            if (!entitlements) return t.total;
            const tryKeys = [t.idKey, t.key, t.key.toLowerCase(), norm(t.idKey), norm(t.key)];
            for (const k of tryKeys) {
                if (!k) continue;
                if (entitlements[k] !== undefined) return entitlements[k];
                if (entitlements[k.toString()] !== undefined) return entitlements[k.toString()];
            }
            return t.total;
        })();

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
