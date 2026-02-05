/**
 * Employee Leave System - Real-time Notifications (SignalR)
 */

const Notifications = {
    connection: null,
    _pollId: null,
    _seen: null,
    pollIntervalMs: 30000,

    async init() {
        const token = localStorage.getItem('token');
        const userId = localStorage.getItem('userId');
        const role = localStorage.getItem('userRole');

        if (!token || !userId) return;

        // If app config explicitly disables notifications, skip initialization.
        const cfg = (typeof CONFIG !== 'undefined' && CONFIG) ? CONFIG : (window.CONFIG || null);
        if (cfg && cfg.ENABLE_NOTIFICATIONS === false) {
            console.info('Notifications disabled by CONFIG.ENABLE_NOTIFICATIONS');
            return;
        }

        // Quick check: if the backend exposes OpenAPI/Swagger JSON, use it to decide
        // whether notifications endpoints or hubs are available. This avoids
        // blindly attempting negotiate/poll calls that 404 and pollute DevTools.
        const swaggerCandidates = [
            '/swagger/v1/swagger.json',
            '/swagger.json',
            '/docs/v1/swagger.json'
        ];

        const base = (typeof API !== 'undefined' && API.baseUrl) ? API.baseUrl.replace(/\/+$/, '') : '';
        // If API.baseUrl is cross-origin relative to this page, avoid fetching Swagger
        // or negotiate endpoints (browser will block or log CORS failures). Allow
        // forcing via CONFIG.FORCE_NOTIFICATIONS if you explicitly want cross-origin attempts.
        try {
            const baseOrigin = new URL(base).origin;
            const pageOrigin = window.location.origin;
            const force = cfg && cfg.FORCE_NOTIFICATIONS === true;
            if (baseOrigin !== pageOrigin && !force) {
                console.info('Notifications: API base is cross-origin and FORCE_NOTIFICATIONS is not set — skipping notification checks to avoid CORS errors');
                return;
            }
        } catch (e) {
            // If URL parsing fails, just skip to avoid accidental cross-origin fetches
            console.debug && console.debug('Notifications: unable to parse API.baseUrl, skipping notification initialization', e && e.message);
            return;
        }
        let swaggerHasNotifications = false;
        try {
            for (const p of swaggerCandidates) {
                try {
                    const res = await fetch(base + p, { method: 'GET' });
                    if (!res || !res.ok) continue;
                    const spec = await res.json();
                    if (!spec || !spec.paths) continue;
                    const paths = Object.keys(spec.paths || {});
                    // Look for any path that suggests a notifications API
                    for (const path of paths) {
                        const lower = path.toLowerCase();
                        if (lower.includes('notification') || lower.includes('notifications') || lower.includes('devicetokens')) {
                            swaggerHasNotifications = true;
                            break;
                        }
                    }
                    if (swaggerHasNotifications) break;
                } catch (e) {
                    // ignore and try next candidate
                    continue;
                }
            }
        } catch (e) {
            // ignore and fall through
        }

        if (!swaggerHasNotifications) {
            // No notifications paths found in Swagger — do not attempt hub or polling
            console.info('Notifications: backend Swagger does not list notification endpoints; skipping initialization');
            return;
        }

        // Try multiple common hub paths in case backend exposes a different route
        const hubCandidates = [
            '/notificationHub',
            '/notificationsHub',
            '/hubs/notificationHub',
            '/hubs/notifications',
            '/hub/notification',
            '/hub/notifications'
        ];

        let connected = false;
        let lastErr = null;

        for (const path of hubCandidates) {
            const base = API.baseUrl.replace(/\/+$/, '');
            const negotiateUrl = `${base}${path}/negotiate?negotiateVersion=1`;
            try {
                // Perform a lightweight negotiate pre-check using fetch so we can
                // skip SignalR's internal negotiation attempts and avoid noisy stack traces
                const negotiateRes = await fetch(negotiateUrl, {
                    method: 'POST',
                    headers: {
                        'Authorization': token ? `Bearer ${token}` : ''
                    }
                });

                if (!negotiateRes.ok) {
                    // not a usable negotiate endpoint, try next candidate
                    continue;
                }

                // negotiate responded OK — build and start a real connection
                const url = `${base}${path}`;
                const conn = new signalR.HubConnectionBuilder()
                    .withUrl(url, { accessTokenFactory: () => token })
                    .withAutomaticReconnect()
                    .build();

                // assign handlers
                conn.on("ReceiveNotification", (title, message) => {
                    this.showNotificationPopup(title, message);
                });

                await conn.start();
                console.log("✅ SignalR Connected to", url);
                this.connection = conn;
                connected = true;
                break;
            } catch (err) {
                // suppress noisy signalr negotiation stack traces here; record last error
                console.debug && console.debug('SignalR candidate failed or negotiate not available for', negotiateUrl, err && err.message);
                lastErr = err;
                // try next candidate
            }
        }

        if (!connected) {
            console.warn('❌ SignalR: all hub connection attempts failed', lastErr);
            // Fallback: start lightweight polling endpoint if available
            try {
                this.startPolling(userId, token);
                return;
            } catch (e) {
                console.error('Notifications polling fallback failed to start', e);
                return;
            }
        }

        // handlers already assigned on the successful connection instance

        try {
            // Stop any polling if we have a live connection
            if (this._pollId) this.stopPolling();

            // Join user-specific group
            await this.connection.invoke("JoinUserGroup", userId);

            // If Manager or HR, join Managers group
            const normalizedRole = role?.toLowerCase();
            if (normalizedRole === 'manager' || normalizedRole === 'hr' || normalizedRole === 'admin') {
                await this.connection.invoke("JoinUserGroup", "Managers");
            }

        } catch (err) {
            console.error("❌ SignalR post-start error: ", err);
        }
    },

    // Polling fallback: query /api/notifications?userId=... and show new items
    async startPolling(userId, token) {
        if (this._pollId) return; // already polling
        this._seen = new Set();
        const base = (typeof API !== 'undefined' && API.baseUrl) ? API.baseUrl.replace(/\/+$/, '') : '';
        if (!base) return;

        const fetchAndShow = async () => {
            try {
                const url = `${base}/api/notifications?userId=${encodeURIComponent(userId)}`;
                const headers = {};
                if (token) headers['Authorization'] = `Bearer ${token}`;
                const res = await fetch(url, { method: 'GET', headers });
                if (!res || !res.ok) return;
                const data = await res.json();
                if (!Array.isArray(data)) return;
                for (const item of data) {
                    const id = item && (item.id || item.notificationId || item._id || item.key);
                    if (!id) continue;
                    if (this._seen.has(id)) continue;
                    this._seen.add(id);
                    const title = item.title || item.subject || 'Notification';
                    const message = item.message || item.body || item.text || '';
                    this.showNotificationPopup(title, message);
                }
            } catch (err) {
                console.debug && console.debug('notifications polling failed', err && err.message);
            }
        };

        // run immediately then schedule
        await fetchAndShow();
        this._pollId = setInterval(fetchAndShow, this.pollIntervalMs);
        console.info('Notifications polling started (fallback)');
    },

    stopPolling() {
        if (this._pollId) {
            clearInterval(this._pollId);
            this._pollId = null;
            this._seen = null;
            console.info('Notifications polling stopped');
        }
    },

    showNotificationPopup(title, message) {
        // Use the existing UI.showToast or create a more prominent one
        if (window.UI) {
            window.UI.showToast(`${title}: ${message}`, 'info');
        }

        // Play sound or show browser notification if permitted
        if ("Notification" in window && Notification.permission === "granted") {
            new Notification(title, { body: message });
        }
    }
};

// Request notification permission on load
if ("Notification" in window && Notification.permission === "default") {
    Notification.requestPermission();
}

// Initialize on page load if token exists
document.addEventListener('DOMContentLoaded', () => {
    const cfg = (typeof CONFIG !== 'undefined' && CONFIG) ? CONFIG : (window.CONFIG || null);
    if (cfg && cfg.ENABLE_NOTIFICATIONS === false) {
        // Notifications are disabled via config, do nothing
        return;
    }
    if (typeof signalR !== 'undefined') {
        Notifications.init();
    }
});

window.Notifications = Notifications;
