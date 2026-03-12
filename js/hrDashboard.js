// hrDashboard.js
// Script extracted from pages/hr/dashboard.html to avoid inline script rendering issues
if (typeof lucide !== 'undefined' && lucide.createIcons) lucide.createIcons();

async function initHRDashboard() {
    // Similar to employee dashboard but fetches global data for HR
    try {
        // For HR dashboard we will show only the HR user's own data (like employee dashboard)
        const userId = localStorage.getItem('userId');
        const [leaves, user] = await Promise.all([
            userId ? API.leaves.getAll(userId) : [],
            userId ? API.users.getById(userId) : null
        ]);
        window.currentUserProfile = user; // Store for quota calculations

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
    await renderAttendance();

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
        { key: 'Sick Leave', idKey: 'sick', total: 30, icon: 'heart', color: 'from-pink-300 to-pink-200 text-white' },
        { key: 'Personal Leave', idKey: 'personal', total: 3, icon: 'user', color: 'from-purple-300 to-purple-200 text-white' }
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
            const want = norm(t.key).replace('leave', '').trim();
            for (const k of Object.keys(usedMap)) {
                try {
                    if (!k) continue;
                    const kn = k.toString().toLowerCase();
                    // Match if want (e.g. 'annual') is found, but avoid generic 'leave' matching
                    if (want && (kn.includes(want) || want.includes(kn))) {
                        used = usedMap[k];
                        matchedKey = k;
                        break;
                    }
                    if (t.idKey && kn.includes(norm(t.idKey))) {
                        used = usedMap[k];
                        matchedKey = k;
                        break;
                    }
                } catch (e) { continue; }
            }
        }

        console.debug && console.debug('leave balance mapping', t.key, { candidates, matchedKey, used });

        // Resolve total from entitlements if provided (try multiple key shapes)
        let total = (function() {
            if (!entitlements) return t.total;
            const tryKeys = [t.idKey, t.key, t.key.toLowerCase(), norm(t.idKey), norm(t.key)];
            for (const k of tryKeys) {
                if (!k) continue;
                if (entitlements[k] !== undefined) return entitlements[k];
                if (entitlements[k.toString()] !== undefined) return entitlements[k.toString()];
            }
            return t.total;
        })();

        // ADJUST ANNUAL QUOTA BASED ON TENURE + CARRY-OVER
        if (t.idKey === 'annual') {
            const profile = window.currentUserProfile; 
            if (profile && (profile.createdAt || profile.joiningDate)) {
                total = LeaveRequest.getAnnualQuotaWithCarryOver(profile.createdAt || profile.joiningDate, leaves);
            }
        }

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

/* Attendance Helper Functions */
function startClock() {
    const nowEl = document.getElementById('current-time');
    const dateEl = document.getElementById('current-date');
    if (!nowEl || !dateEl) return;
    function tick() {
        const d = new Date();
        const hh = String(d.getHours()).padStart(2, '0');
        const mm = String(d.getMinutes()).padStart(2, '0');
        const ss = String(d.getSeconds()).padStart(2, '0');
        nowEl.innerText = `${hh}:${mm}:${ss}`;
        dateEl.innerText = d.toLocaleDateString(undefined, { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
    }
    tick();
    setInterval(tick, 1000);
}

function attendanceStorageKey(userId, dateStr) {
    return `attendance:${userId}:${dateStr}`;
}

function formatTime(ts) {
    if (!ts) return '';
    try { const d = new Date(ts); return d.toLocaleTimeString(); } catch (e) { return ts; }
}

async function performCheckIn(userId) {
    if (typeof API !== 'undefined' && API.attendance && API.attendance.checkIn) {
        try {
            const body = { employeeID: userId };
            const resp = await API.attendance.checkIn(body);
            try {
                const today = new Date().toISOString().slice(0,10);
                const key = attendanceStorageKey(userId, today);
                localStorage.setItem(key, JSON.stringify(resp));
            } catch (e) {}
            try { UI.showToast('Checked in', 'success'); } catch(e){}
            return { ok: true, record: resp };
        } catch (e) {
            return { ok: false, error: e };
        }
    }
    const today = new Date().toISOString().slice(0,10);
    const key = attendanceStorageKey(userId, today);
    const payload = { status: 'checked-in', checkInTime: new Date().toISOString(), employeeID: userId };
    try { localStorage.setItem(key, JSON.stringify(payload)); return { ok: true, record: payload }; } catch (e) { return { ok: false, error: e }; }
}

async function performCheckOut(userId) {
    if (typeof API !== 'undefined' && API.attendance && API.attendance.checkOut) {
        try {
            const body = { employeeID: userId };
            const resp = await API.attendance.checkOut(body);
            try {
                const today = new Date().toISOString().slice(0,10);
                const key = attendanceStorageKey(userId, today);
                localStorage.setItem(key, JSON.stringify(resp));
            } catch (e) {}
            try { UI.showToast('Checked out', 'success'); } catch(e){}
            return { ok: true, record: resp };
        } catch (e) {
            return { ok: false, error: e };
        }
    }
    const today = new Date().toISOString().slice(0,10);
    const key = attendanceStorageKey(userId, today);
    const prev = localStorage.getItem(key);
    const payload = prev ? JSON.parse(prev) : { status: 'checked-in', checkInTime: null, employeeID: userId };
    payload.status = 'checked-out';
    payload.checkOutTime = new Date().toISOString();
    try { localStorage.setItem(key, JSON.stringify(payload)); return { ok: true, record: payload }; } catch (e) { return { ok: false, error: e }; }
}

function readAttendanceLocal(userId) {
    const today = new Date().toISOString().slice(0,10);
    const key = attendanceStorageKey(userId, today);
    const raw = localStorage.getItem(key);
    try { return raw ? JSON.parse(raw) : null; } catch (e) { return null; }
}

async function renderAttendance() {
    startClock();
    const userId = localStorage.getItem('userId');
    const statusBadge = document.getElementById('attendance-status-badge');
    if (!statusBadge) return; // UI doesn't exist
    const checkinEl = document.getElementById('attendance-checkin-time');
    const checkoutEl = document.getElementById('attendance-checkout-time');
    const totalHoursEl = document.getElementById('attendance-total-hours');
    const actionBtn = document.getElementById('attendance-action');
    const actionText = document.getElementById('attendance-action-text');
    const actionIcon = document.getElementById('attendance-action-icon');

    if (!userId) {
        statusBadge.innerText = 'Not signed in';
        if (actionBtn) actionBtn.disabled = true;
        return;
    }

    let record = null;
    if (typeof API !== 'undefined' && API.attendance && API.attendance.getToday) {
        try { record = await API.attendance.getToday(userId); } catch (e) { record = null; }
    }
    if (!record) record = readAttendanceLocal(userId);

    function formatTimeOnly(ts) {
        if (!ts) return '--:--:--';
        try { const d = new Date(ts); return d.toTimeString().split(' ')[0]; } catch (e) { return '--:--:--'; }
    }

    function updateUI(rec) {
        const st = rec ? (rec.status || '').toString().toLowerCase() : '';
        const hasCheckOut = rec && (!!rec.checkOutTime || st.includes('out'));
        const hasCheckIn = rec && (!!rec.checkInTime || st.includes('in') || st === 'present');

        checkinEl.innerHTML = `<span>--:--:--</span>`;
        checkoutEl.innerHTML = `<span>--:--:--</span>`;
        totalHoursEl.innerText = `0.00 hours`;

        if (hasCheckIn) {
            checkinEl.innerHTML = `<i data-lucide="log-in" class="w-4 h-4 text-green-500 mr-1"></i><span class="text-green-600">${formatTimeOnly(rec.checkInTime)}</span>`;
        }
        
        if (hasCheckOut) {
            checkoutEl.innerHTML = `<i data-lucide="log-out" class="w-4 h-4 text-red-500 mr-1"></i><span class="text-red-600">${formatTimeOnly(rec.checkOutTime)}</span>`;
        }

        if (hasCheckIn && hasCheckOut && rec.checkInTime && rec.checkOutTime) {
            const diffMs = new Date(rec.checkOutTime) - new Date(rec.checkInTime);
            const diffHrs = (diffMs / (1000 * 60 * 60)).toFixed(2);
            totalHoursEl.innerText = `${diffHrs} hours`;
        }

        if (!rec || (!hasCheckIn && !hasCheckOut)) {
            statusBadge.innerText = 'Not checked in';
            statusBadge.className = 'text-xs font-semibold px-3 py-1 bg-gray-200 text-gray-700 rounded-full';
            actionText.innerText = 'Check In';
            actionIcon.setAttribute('data-lucide', 'log-in');
            actionBtn.className = 'mt-6 w-full bg-blue-600 hover:bg-blue-700 disabled:bg-gray-100 disabled:text-gray-500 disabled:cursor-not-allowed text-white py-3 rounded-xl text-sm font-medium flex items-center justify-center space-x-2 transition-colors';
            actionBtn.disabled = false;
            actionBtn.onclick = async () => {
                actionBtn.disabled = true;
                const res = await performCheckIn(userId);
                actionBtn.disabled = false;
                if (res.ok) {
                    if (res.record) {
                        try { const today = new Date().toISOString().slice(0,10); localStorage.setItem(attendanceStorageKey(userId,today), JSON.stringify(res.record)); } catch(e){}
                    }
                    renderAttendance();
                } else UI.showToast('ไม่สามารถเช็คอิน: ' + (res.error && res.error.message ? res.error.message : ''), 'error');
            };
        } else if (hasCheckOut) {
            statusBadge.innerText = 'Completed';
            statusBadge.className = 'text-xs font-semibold px-3 py-1 bg-green-100 text-green-700 rounded-full';
            actionText.innerText = 'Attendance Completed';
            actionIcon.setAttribute('data-lucide', 'check-circle');
            actionBtn.className = 'mt-6 w-full bg-gray-100 text-gray-400 py-3 rounded-xl text-sm font-medium flex items-center justify-center space-x-2 cursor-not-allowed transition-colors';
            actionBtn.onclick = () => {};
            actionBtn.disabled = true;
        } else {
            statusBadge.innerText = 'Checked In';
            statusBadge.className = 'text-xs font-semibold px-3 py-1 bg-blue-100 text-blue-700 rounded-full';
            actionText.innerText = 'Check Out';
            actionIcon.setAttribute('data-lucide', 'log-out');
            actionBtn.className = 'mt-6 w-full bg-red-600 hover:bg-red-700 disabled:bg-gray-100 disabled:text-gray-500 disabled:cursor-not-allowed text-white py-3 rounded-xl text-sm font-medium flex items-center justify-center space-x-2 transition-colors';
            actionBtn.disabled = false;
            actionBtn.onclick = async () => {
                actionBtn.disabled = true;
                const res = await performCheckOut(userId);
                actionBtn.disabled = false;
                if (res.ok) {
                    if (res.record) {
                        try { const today = new Date().toISOString().slice(0,10); localStorage.setItem(attendanceStorageKey(userId,today), JSON.stringify(res.record)); } catch(e){}
                    }
                    renderAttendance();
                } else UI.showToast('ไม่สามารถเช็คเอาท์: ' + (res.error && res.error.message ? res.error.message : ''), 'error');
            };
        }
        
        lucide.createIcons();
    }

    updateUI(record);
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
