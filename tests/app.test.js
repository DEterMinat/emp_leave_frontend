/**
 * Unit Tests for app.js - LeaveRequest & UI utilities
 * Tests business logic functions WITHOUT touching the DOM-heavy parts
 */

// ============================================
// Mock browser globals before loading modules
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
Object.defineProperty(global, 'window', {
    value: { ...global.window, location: { href: '' }, CONFIG: null },
    writable: true,
});

// Load CONFIG & modules by evaluating the source
const fs = require('fs');
const path = require('path');

// Evaluate app.js to get CONFIG, LEAVE_RULES, UI, LeaveRequest
const appRawCode = fs.readFileSync(path.join(__dirname, '..', 'js', 'app.js'), 'utf8');
// Fix: const at top level in VM doesn't attach to context. Convert to var for testing.
const appCode = appRawCode.replace(/^const /gm, 'var ');

// Create a sandboxed context
const context = {
    document: {
        addEventListener: jest.fn(),
        getElementById: jest.fn(() => ({
            classList: { toggle: jest.fn(), add: jest.fn(), remove: jest.fn() },
            addEventListener: jest.fn(),
            appendChild: jest.fn(),
        })),
        querySelector: jest.fn(() => null),
        querySelectorAll: jest.fn(() => []),
        createElement: jest.fn(() => ({
            className: '',
            textContent: '',
            classList: { add: jest.fn() },
            remove: jest.fn(),
        })),
        body: { appendChild: jest.fn() },
    },
    window: global.window,
    localStorage: mockLocalStorage,
    lucide: { createIcons: jest.fn() },
    setTimeout: global.setTimeout,
    setInterval: global.setInterval,
    console: global.console,
    CONFIG: undefined,
    API: { 
        references: { getLeaveTypes: jest.fn() },
        leaves: { getMine: jest.fn() },
        attendance: { getToday: jest.fn() },
    },
    fetch: jest.fn(),
    alert: jest.fn(),
    Date: global.Date,
};

// Execute app.js in our context
const vm = require('vm');
vm.runInNewContext(appCode, context);

const { LeaveRequest, UI, LEAVE_RULES, CONFIG } = context;

// ============================================
// LeaveRequest.calculateDays Tests
// ============================================
describe('LeaveRequest.calculateDays', () => {
    test('same day should return 1', () => {
        expect(LeaveRequest.calculateDays('2026-03-01', '2026-03-01')).toBe(1);
    });

    test('two consecutive days should return 2', () => {
        expect(LeaveRequest.calculateDays('2026-03-01', '2026-03-02')).toBe(2);
    });

    test('one week should return 7', () => {
        expect(LeaveRequest.calculateDays('2026-03-01', '2026-03-07')).toBe(7);
    });

    test('end before start should return 0', () => {
        expect(LeaveRequest.calculateDays('2026-03-10', '2026-03-05')).toBe(0);
    });

    test('cross month boundary', () => {
        expect(LeaveRequest.calculateDays('2026-03-28', '2026-04-02')).toBe(6);
    });
});

// ============================================
// LeaveRequest.calculateTenure Tests
// ============================================
describe('LeaveRequest.calculateTenure', () => {
    test('null createdAt should return 0', () => {
        expect(LeaveRequest.calculateTenure(null)).toBe(0);
    });

    test('undefined createdAt should return 0', () => {
        expect(LeaveRequest.calculateTenure(undefined)).toBe(0);
    });

    test('recent hire (< 1 year) should return 0', () => {
        const sixMonthsAgo = new Date();
        sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);
        expect(LeaveRequest.calculateTenure(sixMonthsAgo.toISOString())).toBe(0);
    });

    test('employee hired 3 years ago should return 3', () => {
        const threeYearsAgo = new Date();
        threeYearsAgo.setFullYear(threeYearsAgo.getFullYear() - 3);
        // Adjust to avoid month boundary issues
        threeYearsAgo.setMonth(0);
        threeYearsAgo.setDate(1);
        const result = LeaveRequest.calculateTenure(threeYearsAgo.toISOString());
        expect(result).toBeGreaterThanOrEqual(3);
    });
});

// ============================================
// LeaveRequest.getAnnualQuota Tests
// ============================================
describe('LeaveRequest.getAnnualQuota', () => {
    test('< 1 year tenure should get 0 days', () => {
        const sixMonthsAgo = new Date();
        sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);
        expect(LeaveRequest.getAnnualQuota(sixMonthsAgo.toISOString())).toBe(0);
    });

    test('1-3 years tenure should get 6 days', () => {
        const twoYearsAgo = new Date();
        twoYearsAgo.setFullYear(twoYearsAgo.getFullYear() - 2);
        twoYearsAgo.setMonth(0);
        twoYearsAgo.setDate(1);
        expect(LeaveRequest.getAnnualQuota(twoYearsAgo.toISOString())).toBe(6);
    });

    test('4-6 years tenure should get 7 days', () => {
        const fiveYearsAgo = new Date();
        fiveYearsAgo.setFullYear(fiveYearsAgo.getFullYear() - 5);
        fiveYearsAgo.setMonth(0);
        fiveYearsAgo.setDate(1);
        expect(LeaveRequest.getAnnualQuota(fiveYearsAgo.toISOString())).toBe(7);
    });

    test('7+ years tenure should get 8 days', () => {
        const tenYearsAgo = new Date();
        tenYearsAgo.setFullYear(tenYearsAgo.getFullYear() - 10);
        tenYearsAgo.setMonth(0);
        tenYearsAgo.setDate(1);
        expect(LeaveRequest.getAnnualQuota(tenYearsAgo.toISOString())).toBe(8);
    });
});

// ============================================
// LeaveRequest.validate Tests
// ============================================
describe('LeaveRequest.validate', () => {
    test('unknown leave type should return valid', () => {
        const result = LeaveRequest.validate('unknown_type', '2026-12-01', '2026-12-02');
        expect(result.valid).toBe(true);
    });

    test('sick leave with advance notice should be valid', () => {
        const tomorrow = new Date();
        tomorrow.setDate(tomorrow.getDate() + 1);
        const dayAfter = new Date(tomorrow);
        dayAfter.setDate(dayAfter.getDate() + 1);

        const result = LeaveRequest.validate(
            'sick',
            tomorrow.toISOString().split('T')[0],
            dayAfter.toISOString().split('T')[0]
        );
        expect(result.valid).toBe(true);
    });

    test('annual leave for new employee (< 1 year) should be invalid', () => {
        const futureStart = new Date();
        futureStart.setDate(futureStart.getDate() + 10);
        const futureEnd = new Date(futureStart);
        futureEnd.setDate(futureEnd.getDate() + 2);

        const newEmployee = {
            createdAt: new Date().toISOString() // Just joined
        };

        const result = LeaveRequest.validate(
            'annual',
            futureStart.toISOString().split('T')[0],
            futureEnd.toISOString().split('T')[0],
            newEmployee
        );
        expect(result.valid).toBe(false);
    });

    test('sick leave > 3 days should need attachment', () => {
        const start = new Date();
        start.setDate(start.getDate() + 1);
        const end = new Date(start);
        end.setDate(end.getDate() + 4); // 5 days total

        const result = LeaveRequest.validate(
            'sick',
            start.toISOString().split('T')[0],
            end.toISOString().split('T')[0]
        );
        expect(result.valid).toBe(true);
        expect(result.needsAttachment).toBe(true);
    });
});

// ============================================
// LeaveRequest.checkAttachmentRequired Tests
// ============================================
describe('LeaveRequest.checkAttachmentRequired', () => {
    test('personal leave always requires attachment', () => {
        expect(LeaveRequest.checkAttachmentRequired('personal', 1)).toBe(true);
    });

    test('sick leave <= 3 days does not require attachment', () => {
        expect(LeaveRequest.checkAttachmentRequired('sick', 2)).toBe(false);
    });

    test('sick leave > 3 days requires attachment', () => {
        expect(LeaveRequest.checkAttachmentRequired('sick', 5)).toBe(true);
    });

    test('annual leave does not require attachment', () => {
        expect(LeaveRequest.checkAttachmentRequired('annual', 3)).toBe(false);
    });

    test('unknown type returns false', () => {
        expect(LeaveRequest.checkAttachmentRequired('nonexistent', 1)).toBe(false);
    });
});

// ============================================
// UI.getStatusBadge Tests
// ============================================
describe('UI.getStatusBadge', () => {
    test('approved status returns green badge', () => {
        const badge = UI.getStatusBadge('Approved');
        expect(badge).toContain('bg-green-100');
        expect(badge).toContain('Approved');
    });

    test('pending status returns yellow badge', () => {
        const badge = UI.getStatusBadge('Pending');
        expect(badge).toContain('bg-yellow-100');
        expect(badge).toContain('Pending');
    });

    test('rejected status returns red badge', () => {
        const badge = UI.getStatusBadge('Rejected');
        expect(badge).toContain('bg-red-100');
        expect(badge).toContain('Rejected');
    });

    test('approve (lowercase variant) returns green badge', () => {
        const badge = UI.getStatusBadge('approve');
        expect(badge).toContain('bg-green-100');
    });

    test('unknown status returns gray badge', () => {
        const badge = UI.getStatusBadge('Cancelled');
        expect(badge).toContain('bg-gray-100');
        expect(badge).toContain('Cancelled');
    });

    test('null status returns gray badge', () => {
        const badge = UI.getStatusBadge(null);
        expect(badge).toContain('bg-gray-100');
    });
});

// ============================================
// LEAVE_RULES configuration Tests
// ============================================
describe('LEAVE_RULES configuration', () => {
    test('annual leave has 7 days advance notice', () => {
        expect(LEAVE_RULES.annual.advanceDays).toBe(7);
    });

    test('sick leave has 0 days advance notice', () => {
        expect(LEAVE_RULES.sick.advanceDays).toBe(0);
    });

    test('personal leave has 3 days advance notice', () => {
        expect(LEAVE_RULES.personal.advanceDays).toBe(3);
    });

    test('sick leave max days is 30', () => {
        expect(LEAVE_RULES.sick.maxDays).toBe(30);
    });

    test('personal leave requires attachment', () => {
        expect(LEAVE_RULES.personal.requireAttachment).toBe(true);
    });

    test('sick leave requires attachment after 3 days', () => {
        expect(LEAVE_RULES.sick.requireAttachmentAfter).toBe(3);
    });
});

// ============================================
// CONFIG Tests
// ============================================
describe('CONFIG', () => {
    test('API_BASE_URL should point to Render', () => {
        expect(CONFIG.API_BASE_URL).toBe('https://emp-leave-backend.onrender.com');
    });

    test('ENABLE_NOTIFICATIONS should be true', () => {
        expect(CONFIG.ENABLE_NOTIFICATIONS).toBe(true);
    });

    test('DATE_FORMAT should be th-TH', () => {
        expect(CONFIG.DATE_FORMAT).toBe('th-TH');
    });
});
