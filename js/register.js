/**
 * Registration Logic - Internal Admin Tool
 */

class RegisterManager {
    constructor() {
        this.form = document.getElementById('registerForm');
        this.submitBtn = document.getElementById('submitBtn');
        this.deptSelect = document.getElementById('department');
        this.roleSelect = document.getElementById('role');
        
        // Static fallbacks in case API fails
        this.fallbackDepts = [
            { id: '65e5d312f3e4a2b3c4d5e6f1', departmentName: 'Executive' },
            { id: '65e5d312f3e4a2b3c4d5e6f2', departmentName: 'Operations' },
            { id: '65e5d312f3e4a2b3c4d5e6f3', departmentName: 'Human Resources' },
            { id: '65e5d312f3e4a2b3c4d5e6f4', departmentName: 'IT Department' },
            { id: '65e5d312f3e4a2b3c4d5e6f5', departmentName: 'Engineering' },
            { id: '65e5d312f3e4a2b3c4d5e6f6', departmentName: 'Marketing' },
            { id: '65e5d312f3e4a2b3c4d5e6f7', departmentName: 'Sales' }
        ];
        this.fallbackRoles = [
            { id: '657e222bc916e7a2b3c4d5e6', roleName: 'Employee' },
            { id: '657f4a5f53b1dc3c4d5e6f7a', roleName: 'Manager' },
            { id: '65787172497a38c4d5e6f7b1', roleName: 'HR' }
        ];

        this.init();
    }

    async init() {
        if (!this.form) return;

        // Verify if user is logged in (needed for reference APIs)
        const token = localStorage.getItem('token');
        if (!token) {
            UI.showToast('Please login as Admin/HR first to use this tool.', 'warning');
            // We don't redirect automatically to allow them to see the page,
            // but we warning them.
        }

        this.form.addEventListener('submit', (e) => this.handleSubmit(e));
        if (window.lucide) lucide.createIcons();

        // Populate dropdowns from dynamic references
        await this.loadReferences();
    }

    async loadReferences() {
        try {
            console.log('Register: Fetching references from API...');
            
            const result = await Promise.allSettled([
                API.references.getDepartments(),
                API.references.getRoles()
            ]);

            let depts = [];
            let roles = [];
            let sources = { depts: 'API', roles: 'API' };

            // Handle Departments
            if (result[0].status === 'fulfilled') {
                depts = result[0].value;
                console.log('Register: Departments loaded from API', depts);
            } else {
                console.warn('Register: API Departments failed, using fallback.', result[0].reason);
                depts = this.fallbackDepts;
                sources.depts = 'Fallback (Manual)';
            }

            // Handle Roles (Smart Fallback)
            if (result[1].status === 'fulfilled' && Array.isArray(result[1].value) && result[1].value.length > 0) {
                roles = result[1].value;
                console.log('Register: Roles loaded from API', roles);
            } else {
                console.warn('Register: API Roles failed or empty. Trying discovery from Users list...');
                sources.roles = 'Discovery (Users)';
                
                try {
                    // Discovery: Get roles from existing USERS (UserResponseDto has roleId and roleName)
                    const users = await API.users.getAll();
                    console.log('Register: Discovered users for role scanning:', users.length);
                    
                    const discoveredRoles = new Map();
                    
                    users.forEach(u => {
                        if (u.roleId && u.roleName) {
                            discoveredRoles.set(u.roleId, u.roleName);
                        }
                    });

                    // Still check current user just in case
                    const myId = localStorage.getItem('userId');
                    if (myId) {
                        const me = await API.users.getById(myId);
                        if (me && me.roleId && me.roleName) {
                            discoveredRoles.set(me.roleId, me.roleName);
                        }
                    }

                    if (discoveredRoles.size > 0) {
                        roles = Array.from(discoveredRoles).map(([id, name]) => ({ id, roleName: name }));
                        roles.sort((a, b) => a.roleName.localeCompare(b.roleName));
                        console.log('Register: Roles discovered successfully:', roles);
                    } else {
                        console.warn('Register: Discovery from users found NO roles. Reverting to fallbacks.');
                        roles = this.fallbackRoles;
                        sources.roles = 'Fallback (Manual)';
                    }
                } catch (discErr) {
                    console.error('Register: Role discovery error (Users API failure):', discErr);
                    roles = this.fallbackRoles;
                    sources.roles = 'Fallback (Error)';
                }
            }

            this.renderSelects(depts, roles, sources);
        } catch (error) {
            console.error('Register: Critical failure in loadReferences:', error);
            this.renderSelects(this.fallbackDepts, this.fallbackRoles, { depts: 'Fallback', roles: 'Fallback' });
        }
    }

    renderSelects(depts, roles, sources) {
        if (this.deptSelect) {
            this.deptSelect.innerHTML = `<option value="">Select Department (${sources.depts})</option>` + 
                depts.map(d => `<option value="${d.id}">${d.departmentName}</option>`).join('');
        }

        if (this.roleSelect) {
            this.roleSelect.innerHTML = `<option value="">Select Role (${sources.roles})</option>` + 
                roles.map(r => `<option value="${r.id}">${r.roleName}</option>`).join('');
        }
    }

    async handleSubmit(e) {
        e.preventDefault();
        
        // Unified Registration Data matching RegisterRequest in Swagger
        const registerData = {
            username: document.getElementById('username').value,
            password: document.getElementById('password').value,
            roleId: document.getElementById('role').value,
            firstName: document.getElementById('firstName').value,
            lastName: document.getElementById('lastName').value,
            email: document.getElementById('email').value,
            phone: document.getElementById('phone').value,
            position: document.getElementById('position').value,
            departmentId: document.getElementById('department').value,
            salary: parseFloat(document.getElementById('baseSalary').value) || 0,
            annualLeaveQuota: 6 // Default annual leave (base quota)
        };

        try {
            this.setLoading(true);

            // Check token again before submitting
            if (!localStorage.getItem('token')) {
                throw new Error('You must be logged in as Admin/HR to register new users.');
            }

            // One unified request that handles User and Employee creation
            const response = await API.auth.register(registerData);
            
            // Handle different response formats (Swagger says RegisterResponse has userId, message, username)
            const employeeUserId = response.userId || response.id; 

            if (!employeeUserId) {
                throw new Error(response.message || 'Registration failed: No User ID returned.');
            }

            // Step 2: Initialize Leave Balances
            try {
                // Find employee by userId to get employeeId
                const employee = await API.employees.getByUserId(employeeUserId);
                if (employee && employee.id) {
                    await API.leaveBalances.initialize(employee.id);
                }
            } catch (initErr) {
                console.warn('Profile created but balance initialization skipped:', initErr);
            }

            UI.showToast('Account and Profile created successfully!', 'success');
            this.form.reset();

        } catch (error) {
            console.error('Registration Error:', error);
            UI.showToast('Registration Failed: ' + error.message, 'error');
        } finally {
            this.setLoading(false);
        }
    }

    setLoading(isLoading) {
        if (!this.submitBtn) return;
        
        if (isLoading) {
            this.submitBtn.disabled = true;
            this.submitBtn.innerHTML = `
                <i data-lucide="loader-2" class="w-6 h-6 animate-spin"></i>
                <span>Creating Account...</span>
            `;
        } else {
            this.submitBtn.disabled = false;
            this.submitBtn.innerHTML = `
                <span>Create Account & Profile</span>
                <i data-lucide="user-plus" class="w-6 h-6"></i>
            `;
        }
        
        if (window.lucide) lucide.createIcons();
    }
}

// Initialize
document.addEventListener('DOMContentLoaded', () => {
    new RegisterManager();
});
