/**
 * Employee Leave System - API Client
 */

// Defensive read of CONFIG to avoid ReferenceError when scripts load out-of-order
const _cfg = (typeof CONFIG !== 'undefined' && CONFIG) ? CONFIG : (window.CONFIG || null);
const API = {
    // ใช้พอร์ต 5082 ตามที่ Server รันอยู่จริง
    baseUrl: (_cfg && _cfg.API_BASE_URL) ? _cfg.API_BASE_URL : 'http://localhost:5082',

    /**
     * Make HTTP request
     */
    async request(endpoint, options = {}) {
        const url = `${this.baseUrl}${endpoint}`;
        
        // ดึง Token ที่เก็บไว้ตอน Login มาใช้งาน 
        const token = localStorage.getItem('token');
        
        const config = {
            headers: {
                'Content-Type': 'application/json',
                // แนบกุญแจ (Token) ไปใน Header 
                'Authorization': token ? `Bearer ${token}` : '',
                ...options.headers
            },
            ...options
        };

        try {
            const response = await fetch(url, config);
            
            // หาก Server ตอบกลับมาว่า 401 ให้เด้งกลับไปหน้า Login 
            if (response.status === 401) {
                localStorage.clear();
                window.location.href = '../../index.html';
                return;
            }
            
            if (!response.ok) {
                // Read response body (if any) to provide better error messages when status is 4xx/5xx
                let bodyText = '';
                try {
                    bodyText = await response.text();
                } catch (e) {
                    bodyText = response.statusText || '';
                }
                const message = `HTTP ${response.status}: ${response.statusText}${bodyText ? ' - ' + bodyText : ''}`;
                throw new Error(message);
            }

            // Try to return JSON if possible, otherwise return text
            const contentType = response.headers.get('content-type') || '';
            if (contentType.includes('application/json')) {
                return await response.json();
            }
            return await response.text();
        } catch (error) {
            console.error('API Error:', error);
            throw error;
        }
    },

    // ============================================
    // User Endpoints (เติม /api นำหน้าตามโครงสร้าง Backend)
    // ============================================
    users: {
        async getAll() {
            return API.request('/api/Users');
        },

        async getById(id) {
            return API.request(`/api/Users/${id}`);
        },

        async create(userData) {
            return API.request('/api/Users', {
                method: 'POST',
                body: JSON.stringify(userData)
            });
        },

        async update(id, userData) {
            return API.request(`/api/Users/${id}`, {
                method: 'PUT',
                body: JSON.stringify(userData)
            });
        },

        async delete(id) {
            return API.request(`/api/Users/${id}`, {
                method: 'DELETE'
            });
        }
    },

    // ============================================
    // Leave Request Endpoints (เติม /api นำหน้า)
    // ============================================
    leaves: {
        async getAll(userId = null) {
            // หากมี userId (หน้าพนักงาน) ให้ดึงเฉพาะคนนั้น
            // หากไม่มี userId (หน้า HR/Manager) ให้ดึงทั้งหมดตาม Swagger
            const endpoint = userId 
                ? `/api/LeaveRequests/employee/${userId}` 
                : '/api/LeaveRequests'; 
            return API.request(endpoint);
        },

        async create(leaveData) {
            // เปลี่ยนจาก /api/leaves เป็น /api/LeaveRequests
            return API.request('/api/LeaveRequests', {
                method: 'POST',
                body: JSON.stringify(leaveData)
            });
        },

        approve(id, data) {
            return API.request(`/api/LeaveRequests/${id}/approve`, {
                method: 'PUT',
                body: JSON.stringify(data) // เพิ่มการส่ง Body
            });
        },
        reject(id, data) {
            return API.request(`/api/LeaveRequests/${id}/reject`, {
                method: 'PUT',
                body: JSON.stringify(data) // เพิ่มการส่ง Body
            });
        }
    },

    references: {
        async getLeaveTypes() {
            return API.request('/api/LeaveTypes'); 
        }
    },

    // ============================================
    // Health Check
    // ============================================
    async healthCheck() {
        return this.request('/health');
    }
};

// Export สำหรับเรียกใช้งานใน HTML
window.API = API;