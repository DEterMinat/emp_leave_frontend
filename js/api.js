/**
 * Employee Leave System - API Client
 */

const API = {
    baseUrl: CONFIG?.API_BASE_URL || 'http://localhost:5082',

    /**
     * Make HTTP request
     */
    async request(endpoint, options = {}) {
        const url = `${this.baseUrl}${endpoint}`;
        const config = {
            headers: {
                'Content-Type': 'application/json',
                ...options.headers
            },
            ...options
        };

        try {
            const response = await fetch(url, config);
            
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
    // User Endpoints
    // ============================================
    users: {
        async getAll() {
            return API.request('/users/');
        },

        async getById(id) {
            return API.request(`/users/${id}`);
        },

        async create(userData) {
            return API.request('/users/', {
                method: 'POST',
                body: JSON.stringify(userData)
            });
        },

        async update(id, userData) {
            return API.request(`/users/${id}`, {
                method: 'PUT',
                body: JSON.stringify(userData)
            });
        },

        async delete(id) {
            return API.request(`/users/${id}`, {
                method: 'DELETE'
            });
        }
    },

    // ============================================
    // Leave Request Endpoints (placeholder)
    // ============================================
    leaves: {
        async getAll(userId) {
            return API.request(`/leaves/?user_id=${userId}`);
        },

        async create(leaveData) {
            return API.request('/leaves/', {
                method: 'POST',
                body: JSON.stringify(leaveData)
            });
        },

        async approve(id) {
            return API.request(`/leaves/${id}/approve`, {
                method: 'POST'
            });
        },

        async reject(id, reason) {
            return API.request(`/leaves/${id}/reject`, {
                method: 'POST',
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

// Export for use in HTML
window.API = API;
