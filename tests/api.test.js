/**
 * Unit Tests for api.js - API client structure and configuration
 * Tests the API object structure, endpoint definitions, and base URL configuration
 */

// ============================================
// Mock browser globals
// ============================================
const mockLocalStorage = (() => {
    let store = {};
    return {
        getItem: jest.fn((key) => store[key] || null),
        setItem: jest.fn((key, value) => { store[key] = value; }),
        removeItem: jest.fn((key) => { delete store[key]; }),
        clear: jest.fn(() => { store = {}; }),
    };
})();
Object.defineProperty(global, 'localStorage', { value: mockLocalStorage });

// Mock fetch
global.fetch = jest.fn();

// Load api.js
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const apiRawCode = fs.readFileSync(path.join(__dirname, '..', 'js', 'api.js'), 'utf8');
const apiCode = apiRawCode.replace(/^const /gm, 'var ');

const context = {
    window: { 
        CONFIG: null,
        location: { href: '', reload: jest.fn() },
        alert: jest.fn()
    },
    localStorage: mockLocalStorage,
    fetch: global.fetch,
    console: global.console,
    CONFIG: undefined,
};

vm.runInNewContext(apiCode, context);
const API = context.API;

// ============================================
// API Base URL Configuration
// ============================================
describe('API Base URL', () => {
    test('default baseUrl should be Render backend', () => {
        expect(API.baseUrl).toBe('https://emp-leave-backend.onrender.com');
    });

    test('baseUrl should be a valid URL', () => {
        expect(API.baseUrl).toMatch(/^https?:\/\//);
    });
});

// ============================================
// API Structure - Auth Module
// ============================================
describe('API.auth', () => {
    test('login method should exist', () => {
        expect(typeof API.auth.login).toBe('function');
    });

    test('register method should exist', () => {
        expect(typeof API.auth.register).toBe('function');
    });
});

// ============================================
// API Structure - Users Module
// ============================================
describe('API.users', () => {
    test('getAll method should exist', () => {
        expect(typeof API.users.getAll).toBe('function');
    });

    test('getById method should exist', () => {
        expect(typeof API.users.getById).toBe('function');
    });

    test('create method should exist', () => {
        expect(typeof API.users.create).toBe('function');
    });

    test('update method should exist', () => {
        expect(typeof API.users.update).toBe('function');
    });

    test('delete method should exist', () => {
        expect(typeof API.users.delete).toBe('function');
    });
});

// ============================================
// API Structure - Employees Module
// ============================================
describe('API.employees', () => {
    test('getAll method should exist', () => {
        expect(typeof API.employees.getAll).toBe('function');
    });

    test('getById method should exist', () => {
        expect(typeof API.employees.getById).toBe('function');
    });

    test('getByUserId method should exist', () => {
        expect(typeof API.employees.getByUserId).toBe('function');
    });

    test('create method should exist', () => {
        expect(typeof API.employees.create).toBe('function');
    });

    test('update method should exist', () => {
        expect(typeof API.employees.update).toBe('function');
    });
});

// ============================================
// API Structure - Leave Balances Module
// ============================================
describe('API.leaveBalances', () => {
    test('getAll method should exist', () => {
        expect(typeof API.leaveBalances.getAll).toBe('function');
    });

    test('getByEmployeeId method should exist', () => {
        expect(typeof API.leaveBalances.getByEmployeeId).toBe('function');
    });

    test('getMine method should exist', () => {
        expect(typeof API.leaveBalances.getMine).toBe('function');
    });

    test('create method should exist', () => {
        expect(typeof API.leaveBalances.create).toBe('function');
    });

    test('initialize method should exist', () => {
        expect(typeof API.leaveBalances.initialize).toBe('function');
    });
});

// ============================================
// API Structure - Leaves Module
// ============================================
describe('API.leaves', () => {
    test('getAll method should exist', () => {
        expect(typeof API.leaves.getAll).toBe('function');
    });

    test('create method should exist', () => {
        expect(typeof API.leaves.create).toBe('function');
    });

    test('approve method should exist', () => {
        expect(typeof API.leaves.approve).toBe('function');
    });

    test('reject method should exist', () => {
        expect(typeof API.leaves.reject).toBe('function');
    });

    test('getAttachments method should exist', () => {
        expect(typeof API.leaves.getAttachments).toBe('function');
    });
});

// ============================================
// API Structure - Attendance Module
// ============================================
describe('API.attendance', () => {
    test('checkIn method should exist', () => {
        expect(typeof API.attendance.checkIn).toBe('function');
    });

    test('checkOut method should exist', () => {
        expect(typeof API.attendance.checkOut).toBe('function');
    });

    test('getToday method should exist', () => {
        expect(typeof API.attendance.getToday).toBe('function');
    });

    test('getHistory method should exist', () => {
        expect(typeof API.attendance.getHistory).toBe('function');
    });

    test('getAll method should exist', () => {
        expect(typeof API.attendance.getAll).toBe('function');
    });
});

// ============================================
// API Structure - References Module
// ============================================
describe('API.references', () => {
    test('getLeaveTypes method should exist', () => {
        expect(typeof API.references.getLeaveTypes).toBe('function');
    });

    test('getDepartments method should exist', () => {
        expect(typeof API.references.getDepartments).toBe('function');
    });

    test('getRoles method should exist', () => {
        expect(typeof API.references.getRoles).toBe('function');
    });
});

// ============================================
// API Structure - Health Check
// ============================================
describe('API.healthCheck', () => {
    test('healthCheck method should exist', () => {
        expect(typeof API.healthCheck).toBe('function');
    });
});

// ============================================
// API.request - Error Handling
// ============================================
describe('API.request error handling', () => {
    beforeEach(() => {
        jest.clearAllMocks();
        mockLocalStorage.clear();
    });

    test('should throw on network error', async () => {
        global.fetch.mockRejectedValueOnce(new Error('Network error'));
        await expect(API.request('/api/test')).rejects.toThrow('Network error');
    });

    test('should throw on HTTP error with status message', async () => {
        global.fetch.mockResolvedValueOnce({
            ok: false,
            status: 500,
            statusText: 'Internal Server Error',
            text: jest.fn().mockResolvedValue('Server crashed'),
            headers: new Map(),
        });

        await expect(API.request('/api/test')).rejects.toThrow('HTTP 500');
    });

    test('should return JSON on success', async () => {
        const mockData = { id: 1, name: 'Test' };
        global.fetch.mockResolvedValueOnce({
            ok: true,
            status: 200,
            headers: {
                get: jest.fn(() => 'application/json'),
            },
            json: jest.fn().mockResolvedValue(mockData),
        });

        const result = await API.request('/api/test');
        expect(result).toEqual(mockData);
    });

    test('should include Authorization header when token exists', async () => {
        mockLocalStorage.getItem.mockReturnValueOnce('test-jwt-token');

        global.fetch.mockResolvedValueOnce({
            ok: true,
            status: 200,
            headers: {
                get: jest.fn(() => 'application/json'),
            },
            json: jest.fn().mockResolvedValue({}),
        });

        await API.request('/api/test');

        expect(global.fetch).toHaveBeenCalledWith(
            expect.any(String),
            expect.objectContaining({
                headers: expect.objectContaining({
                    'Authorization': 'Bearer test-jwt-token',
                }),
            })
        );
    });
});
