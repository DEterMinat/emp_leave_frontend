/**
 * Employee Leave System - API Client
 */

const API = {
    // ใช้พอร์ต 5082 ตามที่ Server รันอยู่จริง
    baseUrl: CONFIG?.API_BASE_URL || 'http://localhost:5082',

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
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }
            
            return await response.json();
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
            return API.request('/api/users');
        },

        async getById(id) {
            return API.request(`/api/users/${id}`);
        },

        async create(userData) {
            return API.request('/api/users', {
                method: 'POST',
                body: JSON.stringify(userData)
            });
        },

        async update(id, userData) {
            return API.request(`/api/users/${id}`, {
                method: 'PUT',
                body: JSON.stringify(userData)
            });
        },

        async delete(id) {
            return API.request(`/api/users/${id}`, {
                method: 'DELETE'
            });
        }
    },

    // ============================================
    // Leave Request Endpoints (เติม /api นำหน้า)
    // ============================================
    leaves: {
        async getAll(userId) {
            // เปลี่ยนจาก /api/leaves?userId=... เป็น /api/LeaveRequests/employee/...
            return API.request(`/api/LeaveRequests/employee/${userId}`);
        },

        async create(leaveData) {
            // เปลี่ยนจาก /api/leaves เป็น /api/LeaveRequests
            return API.request('/api/LeaveRequests', {
                method: 'POST',
                body: JSON.stringify(leaveData)
            });
        },

        async approve(id) {
            // Swagger ระบุว่าเป็น PUT และทางเข้าคือ /api/LeaveRequests/{id}/approve
            return API.request(`/api/LeaveRequests/${id}/approve`, {
                method: 'PUT' // เปลี่ยนจาก POST เป็น PUT
            });
        },

        async reject(id, reason) {
            // Swagger ระบุว่าเป็น PUT และทางเข้าคือ /api/LeaveRequests/{id}/reject
            return API.request(`/api/LeaveRequests/${id}/reject`, {
                method: 'PUT', // เปลี่ยนจาก POST เป็น PUT
                body: JSON.stringify({ reason })
            });
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