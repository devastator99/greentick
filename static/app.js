document.addEventListener('DOMContentLoaded', () => {
    // API URL
    const API_URL = 'http://127.0.0.1:8000';
    
    // Authentication state
    let authToken = localStorage.getItem('authToken');
    let currentUser = JSON.parse(localStorage.getItem('currentUser'));
    
    // DOM Elements - Navigation
    const sidebar = document.getElementById('sidebar');
    const menuToggle = document.getElementById('menu-toggle');
    const closeSidebar = document.getElementById('close-sidebar');
    const sidebarMenuItems = document.querySelectorAll('.sidebar-menu li');
    const contentSections = document.querySelectorAll('.content-section');
    const viewAllLinks = document.querySelectorAll('.view-all');
    
    // DOM Elements - Auth
    const loginModal = document.getElementById('login-modal');
    const signupModal = document.getElementById('signup-modal');
    const loginForm = document.getElementById('login-form');
    const signupForm = document.getElementById('signup-form');
    const showSignupBtn = document.getElementById('show-signup');
    const showLoginBtn = document.getElementById('show-login');
    const logoutBtn = document.getElementById('logout-btn');
    const userNameDisplay = document.getElementById('user-name');
    
    // DOM Elements - Customers
    const addCustomerBtn = document.getElementById('add-customer-btn');
    const addCustomerModal = document.getElementById('add-customer-modal');
    const addCustomerForm = document.getElementById('add-customer-form');
    const importCustomersBtn = document.getElementById('import-customers-btn');
    const importCustomersModal = document.getElementById('import-customers-modal');
    const importCustomersForm = document.getElementById('import-customers-form');
    const customersTable = document.getElementById('customers-body');
    
    // DOM Elements - Reminders
    const addReminderBtn = document.getElementById('add-reminder-btn');
    const addReminderModal = document.getElementById('add-reminder-modal');
    const addReminderForm = document.getElementById('add-reminder-form');
    const reminderCustomerSelect = document.getElementById('reminder-customer');
    const reminderTemplateSelect = document.getElementById('reminder-template');
    const templateVariablesContainer = document.getElementById('template-variables-container');
    const reminderFrequencySelect = document.getElementById('reminder-frequency');
    const recurringEndDateContainer = document.getElementById('recurring-end-date-container');
    const remindersTable = document.getElementById('reminders-body');
    
    // DOM Elements - Payments
    const addPaymentBtn = document.getElementById('add-payment-btn');
    const addPaymentModal = document.getElementById('add-payment-modal');
    const addPaymentForm = document.getElementById('add-payment-form');
    const paymentCustomerSelect = document.getElementById('payment-customer');
    const paymentsTable = document.getElementById('payments-body');
    
    // DOM Elements - Dashboard
    const totalCustomersEl = document.getElementById('total-customers');
    const activeRemindersEl = document.getElementById('active-reminders');
    const totalRevenueEl = document.getElementById('total-revenue');
    const deliveryRateEl = document.getElementById('delivery-rate');
    const recentRemindersBody = document.getElementById('recent-reminders-body');
    const recentPaymentsBody = document.getElementById('recent-payments-body');
    
    // DOM Elements - Profile
    const businessProfileForm = document.getElementById('business-profile-form');
    const businessNameInput = document.getElementById('business-name');
    const businessWhatsappInput = document.getElementById('business-whatsapp');
    const userEmailInput = document.getElementById('user-email');
    const userPhoneInput = document.getElementById('user-phone');
    const businessLogoPreview = document.getElementById('business-logo-preview');
    const businessLogoUpload = document.getElementById('business-logo-upload');
    const profileBusinessName = document.getElementById('profile-business-name');
    
    // Close buttons for all modals
    const closeButtons = document.querySelectorAll('.close, .cancel-btn');

    
    // Helper Functions
    function showToast(message, type = 'info') {
        const toastContainer = document.getElementById('toast-container');
        const toast = document.createElement('div');
        toast.className = `toast ${type}`;
        
        let icon = '';
        switch(type) {
            case 'success': icon = '<i class="fas fa-check-circle"></i>'; break;
            case 'error': icon = '<i class="fas fa-exclamation-circle"></i>'; break;
            case 'warning': icon = '<i class="fas fa-exclamation-triangle"></i>'; break;
            default: icon = '<i class="fas fa-info-circle"></i>';
        }
        
        toast.innerHTML = `${icon} ${message}`;
        toastContainer.appendChild(toast);
        
        setTimeout(() => {
            toast.style.opacity = '0';
            setTimeout(() => toast.remove(), 300);
        }, 3000);
    }
    
    function formatDate(dateString) {
        const date = new Date(dateString);
        return date.toLocaleString();
    }
    
    function truncateText(text, maxLength = 30) {
        return text.length > maxLength ? text.substring(0, maxLength) + '...' : text;
    }
    
    function formatCurrency(amount) {
        return '₹' + parseFloat(amount).toFixed(2);
    }
    
    // Authentication Functions
    async function login(email, password) {
        try {
            const response = await fetch(`${API_URL}/auth/token`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
                body: `username=${encodeURIComponent(email)}&password=${encodeURIComponent(password)}`
            });
            
            if (!response.ok) throw new Error('Login failed');
            
            const data = await response.json();
            authToken = data.access_token;
            currentUser = data.user;
            
            localStorage.setItem('authToken', authToken);
            localStorage.setItem('currentUser', JSON.stringify(currentUser));
            
            return true;
        } catch (error) {
            console.error('Login error:', error);
            return false;
        }
    }
    
    async function signup(email, password, phone, businessName) {
        try {
            const response = await fetch(`${API_URL}/auth/signup`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    email,
                    password,
                    phone,
                    business_name: businessName
                })
            });
            
            if (!response.ok) throw new Error('Signup failed');
            
            const data = await response.json();
            authToken = data.access_token;
            currentUser = data.user;
            
            localStorage.setItem('authToken', authToken);
            localStorage.setItem('currentUser', JSON.stringify(currentUser));
            
            return true;
        } catch (error) {
            console.error('Signup error:', error);
            return false;
        }
    }
    
    function logout() {
        authToken = null;
        currentUser = null;
        localStorage.removeItem('authToken');
        localStorage.removeItem('currentUser');
        checkAuth();
    }
    
    // API Request Helper
    async function apiRequest(endpoint, method = 'GET', body = null) {
        try {
            const headers = {
                'Content-Type': 'application/json'
            };
            
            if (authToken) {
                headers['Authorization'] = `Bearer ${authToken}`;
            }
            
            const options = {
                method,
                headers
            };
            
            if (body && (method === 'POST' || method === 'PUT')) {
                options.body = JSON.stringify(body);
            }
            
            const response = await fetch(`${API_URL}${endpoint}`, options);
            
            if (response.status === 401) {
                // Token expired or invalid
                logout();
                showToast('Session expired. Please login again.', 'warning');
                return null;
            }
            
            if (!response.ok) {
                throw new Error(`API request failed: ${response.statusText}`);
            }
            
            // For DELETE requests that return no content
            if (response.status === 204) {
                return { success: true };
            }
            
            return await response.json();
        } catch (error) {
            console.error('API request error:', error);
            showToast(error.message, 'error');
            return null;
        }
    }
    
    // Navigation Functions
    function showSection(sectionId) {
        // Hide all sections
        contentSections.forEach(section => section.classList.remove('active'));
        
        // Show selected section
        document.getElementById(`${sectionId}-section`).classList.add('active');
        
        // Update sidebar active item
        sidebarMenuItems.forEach(item => {
            if (item.dataset.section === sectionId) {
                item.classList.add('active');
            } else {
                item.classList.remove('active');
            }
        });
        
        // On mobile, close sidebar after selection
        if (window.innerWidth <= 768) {
            sidebar.classList.remove('active');
        }
    }
    
    // Modal Functions
    function showModal(modal) {
        modal.style.display = 'block';
    }
    
    function hideModal(modal) {
        modal.style.display = 'none';
    }
    
    function hideAllModals() {
        const modals = document.querySelectorAll('.modal');
        modals.forEach(modal => hideModal(modal));
    }
    
    // Data Fetching Functions
    async function fetchDashboardData() {
        // Fetch customers count
        const customers = await apiRequest('/customers/');
        if (customers) {
            totalCustomersEl.textContent = customers.length;
        }
        
        // Fetch active reminders
        const reminders = await apiRequest('/reminders/?status=pending');
        if (reminders) {
            activeRemindersEl.textContent = reminders.length;
        }
        
        // Fetch payment stats
        const paymentStats = await apiRequest('/payments/stats/summary');
        if (paymentStats) {
            totalRevenueEl.textContent = formatCurrency(paymentStats.total_amount);
            deliveryRateEl.textContent = `${paymentStats.completion_rate}%`;
        }
        
        // Fetch recent reminders
        const recentReminders = await apiRequest('/reminders/?limit=5');
        if (recentReminders) {
            recentRemindersBody.innerHTML = '';
            
            if (recentReminders.length === 0) {
                recentRemindersBody.innerHTML = '<tr><td colspan="4">No reminders found</td></tr>';
            } else {
                recentReminders.forEach(reminder => {
                    const tr = document.createElement('tr');
                    tr.innerHTML = `
                        <td>Customer ${reminder.customer_id}</td>
                        <td>${truncateText(reminder.message)}</td>
                        <td><span class="status-badge ${reminder.status}">${reminder.status}</span></td>
                        <td>${formatDate(reminder.send_time)}</td>
                    `;
                    recentRemindersBody.appendChild(tr);
                });
            }
        }
        
        // Fetch recent payments
        const recentPayments = await apiRequest('/payments/?limit=5');
        if (recentPayments) {
            recentPaymentsBody.innerHTML = '';
            
            if (recentPayments.length === 0) {
                recentPaymentsBody.innerHTML = '<tr><td colspan="4">No payments found</td></tr>';
            } else {
                recentPayments.forEach(payment => {
                    const tr = document.createElement('tr');
                    tr.innerHTML = `
                        <td>Customer ${payment.customer_id}</td>
                        <td>${formatCurrency(payment.amount)}</td>
                        <td><span class="status-badge ${payment.status}">${payment.status}</span></td>
                        <td>${formatDate(payment.created_at)}</td>
                    `;
                    recentPaymentsBody.appendChild(tr);
                });
            }
        }
    }
    
    async function fetchCustomers() {
        const customers = await apiRequest('/customers/');
        if (customers) {
            customersTable.innerHTML = '';
            
            if (customers.length === 0) {
                customersTable.innerHTML = '<tr><td colspan="4">No customers found</td></tr>';
            } else {
                customers.forEach(customer => {
                    const tr = document.createElement('tr');
                    tr.innerHTML = `
                        <td>${customer.name}</td>
                        <td>${customer.phone}</td>
                        <td>${customer.notes || '-'}</td>
                        <td>
                            <button class="btn-icon edit-customer" data-id="${customer.id}"><i class="fas fa-edit"></i></button>
                            <button class="btn-icon delete-customer" data-id="${customer.id}"><i class="fas fa-trash"></i></button>
                        </td>
                    `;
                    customersTable.appendChild(tr);
                });
            }
            
            // Also update customer dropdowns
            updateCustomerDropdowns(customers);
        }
    }
    
    function updateCustomerDropdowns(customers) {
        const dropdowns = [reminderCustomerSelect, paymentCustomerSelect];
        
        dropdowns.forEach(dropdown => {
            if (dropdown) {
                dropdown.innerHTML = '<option value="" disabled selected>Select a customer</option>';
                
                customers.forEach(customer => {
                    const option = document.createElement('option');
                    option.value = customer.id;
                    option.textContent = `${customer.name} (${customer.phone})`;
                    dropdown.appendChild(option);
                });
            }
        });
    }
    
    async function fetchReminders() {
        const reminders = await apiRequest('/reminders/');
        if (reminders) {
            remindersTable.innerHTML = '';
            
            if (reminders.length === 0) {
                remindersTable.innerHTML = '<tr><td colspan="6">No reminders found</td></tr>';
            } else {
                reminders.forEach(reminder => {
                    const tr = document.createElement('tr');
                    tr.innerHTML = `
                        <td>Customer ${reminder.customer_id}</td>
                        <td>${truncateText(reminder.message)}</td>
                        <td>${formatDate(reminder.send_time)}</td>
                        <td><span class="status-badge ${reminder.status}">${reminder.status}</span></td>
                        <td>${reminder.frequency}</td>
                        <td>
                            <button class="btn-icon edit-reminder" data-id="${reminder.id}"><i class="fas fa-edit"></i></button>
                            <button class="btn-icon delete-reminder" data-id="${reminder.id}"><i class="fas fa-trash"></i></button>
                            ${reminder.status === 'pending' ? `<button class="btn-icon send-reminder" data-id="${reminder.id}"><i class="fas fa-paper-plane"></i></button>` : ''}
                        </td>
                    `;
                    remindersTable.appendChild(tr);
                });
            }
        }
    }
    
    async function fetchPayments() {
        const payments = await apiRequest('/payments/');
        if (payments) {
            paymentsTable.innerHTML = '';
            
            if (payments.length === 0) {
                paymentsTable.innerHTML = '<tr><td colspan="6">No payments found</td></tr>';
            } else {
                payments.forEach(payment => {
                    const tr = document.createElement('tr');
                    tr.innerHTML = `
                        <td>Customer ${payment.customer_id}</td>
                        <td>${formatCurrency(payment.amount)}</td>
                        <td>${truncateText(payment.description)}</td>
                        <td><span class="status-badge ${payment.status}">${payment.status}</span></td>
                        <td>${formatDate(payment.created_at)}</td>
                        <td>
                            <button class="btn-icon view-payment" data-id="${payment.id}"><i class="fas fa-eye"></i></button>
                            <button class="btn-icon delete-payment" data-id="${payment.id}"><i class="fas fa-trash"></i></button>
                            ${payment.status === 'pending' ? `<button class="btn-icon send-payment" data-id="${payment.id}"><i class="fas fa-paper-plane"></i></button>` : ''}
                            <button class="btn-icon invoice-payment" data-id="${payment.id}"><i class="fas fa-file-invoice"></i></button>
                        </td>
                    `;
                    paymentsTable.appendChild(tr);
                });
            }
        }
    }
    
    // Check Authentication and Initialize App
    function checkAuth() {
        if (authToken && currentUser) {
            // User is logged in
            document.body.classList.add('authenticated');
            document.body.classList.remove('unauthenticated');
            
            // Update user info
            if (userNameDisplay) {
                userNameDisplay.textContent = `Welcome, ${currentUser.business_name || currentUser.email}`;
            }
            
            // Load data
            fetchDashboardData();
            fetchCustomers();
            fetchReminders();
            fetchPayments();
            
            // Load profile data
            if (businessNameInput) businessNameInput.value = currentUser.business_name || '';
            if (businessWhatsappInput) businessWhatsappInput.value = currentUser.business_whatsapp || '';
            if (userEmailInput) userEmailInput.value = currentUser.email || '';
            if (userPhoneInput) userPhoneInput.value = currentUser.phone || '';
            if (profileBusinessName) profileBusinessName.textContent = currentUser.business_name || 'Your Business';
            
            // Hide auth modals
            hideModal(loginModal);
            hideModal(signupModal);
        } else {
            // User is not logged in
            document.body.classList.add('unauthenticated');
            document.body.classList.remove('authenticated');
            
            // Show login modal
            showModal(loginModal);
        }
    }
    
    // Event Listeners
    
    // Navigation
    if (menuToggle) {
        menuToggle.addEventListener('click', () => {
            sidebar.classList.add('active');
        });
    }
    
    if (closeSidebar) {
        closeSidebar.addEventListener('click', () => {
            sidebar.classList.remove('active');
        });
    }
    
    // Sidebar menu navigation
    sidebarMenuItems.forEach(item => {
        item.addEventListener('click', () => {
            const section = item.dataset.section;
            showSection(section);
        });
    });
    
    // View all links
    viewAllLinks.forEach(link => {
        link.addEventListener('click', (e) => {
            e.preventDefault();
            const section = link.dataset.section;
            showSection(section);
        });
    });
    
    // Modal close buttons
    closeButtons.forEach(button => {
        button.addEventListener('click', () => {
            const modal = button.closest('.modal');
            if (modal) {
                hideModal(modal);
            }
        });
    });
    
    // Auth modals
    if (showSignupBtn) {
        showSignupBtn.addEventListener('click', () => {
            hideModal(loginModal);
            showModal(signupModal);
        });
    }
    
    if (showLoginBtn) {
        showLoginBtn.addEventListener('click', () => {
            hideModal(signupModal);
            showModal(loginModal);
        });
    }
    
    // Login form
    if (loginForm) {
        loginForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const email = document.getElementById('login-email').value;
            const password = document.getElementById('login-password').value;
            
            const success = await login(email, password);
            if (success) {
                showToast('Login successful!', 'success');
                checkAuth();
            } else {
                showToast('Login failed. Please check your credentials.', 'error');
            }
        });
    }
    
    // Signup form
    if (signupForm) {
        signupForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const email = document.getElementById('signup-email').value;
            const password = document.getElementById('signup-password').value;
            const phone = document.getElementById('signup-phone').value;
            const businessName = document.getElementById('signup-business').value;
            
            const success = await signup(email, password, phone, businessName);
            if (success) {
                showToast('Account created successfully!', 'success');
                checkAuth();
            } else {
                showToast('Signup failed. Please try again.', 'error');
            }
        });
    }
    
    // Logout button
    if (logoutBtn) {
        logoutBtn.addEventListener('click', () => {
            logout();
            showToast('Logged out successfully', 'info');
        });
    }
    
    // Customer management
    if (addCustomerBtn) {
        addCustomerBtn.addEventListener('click', () => {
            showModal(addCustomerModal);
        });
    }
    
    if (addCustomerForm) {
        addCustomerForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const name = document.getElementById('customer-name').value;
            const phone = document.getElementById('customer-phone').value;
            const notes = document.getElementById('customer-notes').value;
            
            const result = await apiRequest('/customers/', 'POST', { name, phone, notes });
            if (result) {
                hideModal(addCustomerModal);
                addCustomerForm.reset();
                fetchCustomers();
                showToast('Customer added successfully!', 'success');
            }
        });
    }
    
    if (importCustomersBtn) {
        importCustomersBtn.addEventListener('click', () => {
            showModal(importCustomersModal);
        });
    }
    
    // Reminder management
    if (addReminderBtn) {
        addReminderBtn.addEventListener('click', () => {
            showModal(addReminderModal);
        });
    }
    
    if (reminderFrequencySelect) {
        reminderFrequencySelect.addEventListener('change', () => {
            if (reminderFrequencySelect.value !== 'one_time') {
                recurringEndDateContainer.style.display = 'block';
            } else {
                recurringEndDateContainer.style.display = 'none';
            }
        });
    }
    
    if (reminderTemplateSelect) {
        reminderTemplateSelect.addEventListener('change', async () => {
            const templateId = reminderTemplateSelect.value;
            
            if (templateId) {
                // Fetch template details
                const templates = await apiRequest('/reminders/templates');
                const selectedTemplate = templates.find(t => t.id === templateId);
                
                if (selectedTemplate) {
                    // Show template variables form
                    templateVariablesContainer.style.display = 'block';
                    templateVariablesContainer.innerHTML = '';
                    
                    selectedTemplate.variables.forEach(variable => {
                        const div = document.createElement('div');
                        div.className = 'form-group';
                        div.innerHTML = `
                            <label for="var-${variable}">${variable}</label>
                            <input type="text" id="var-${variable}" class="template-variable" data-var="${variable}" required>
                        `;
                        templateVariablesContainer.appendChild(div);
                    });
                    
                    // Add preview button
                    const previewBtn = document.createElement('button');
                    previewBtn.type = 'button';
                    previewBtn.className = 'btn-secondary';
                    previewBtn.textContent = 'Preview Message';
                    previewBtn.addEventListener('click', async () => {
                        // Collect variables
                        const variables = {};
                        document.querySelectorAll('.template-variable').forEach(input => {
                            variables[input.dataset.var] = input.value;
                        });
                        
                        // Preview template
                        const formData = new FormData();
                        formData.append('template_id', templateId);
                        formData.append('variables', JSON.stringify(variables));
                        
                        const response = await fetch(`${API_URL}/reminders/preview-template`, {
                            method: 'POST',
                            body: formData
                        });
                        
                        if (response.ok) {
                            const data = await response.json();
                            document.getElementById('reminder-message').value = data.preview;
                        }
                    });
                    
                    templateVariablesContainer.appendChild(previewBtn);
                }
            } else {
                // Hide template variables form
                templateVariablesContainer.style.display = 'none';
                document.getElementById('reminder-message').value = '';
            }
        });
    }
    
    if (addReminderForm) {
        addReminderForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            
            const customer_id = document.getElementById('reminder-customer').value;
            const message = document.getElementById('reminder-message').value;
            const send_time = document.getElementById('reminder-time').value;
            const frequency = document.getElementById('reminder-frequency').value;
            
            let recurring_end_date = null;
            if (frequency !== 'one_time') {
                recurring_end_date = document.getElementById('recurring-end-date').value;
            }
            
            // Collect template data if using a template
            const template_id = document.getElementById('reminder-template').value || null;
            let template_variables = null;
            
            if (template_id) {
                template_variables = {};
                document.querySelectorAll('.template-variable').forEach(input => {
                    template_variables[input.dataset.var] = input.value;
                });
            }
            
            const result = await apiRequest('/reminders/', 'POST', {
                customer_id: parseInt(customer_id),
                message,
                send_time,
                frequency,
                recurring_end_date,
                template_id,
                template_variables
            });
            
            if (result) {
                hideModal(addReminderModal);
                addReminderForm.reset();
                fetchReminders();
                showToast('Reminder scheduled successfully!', 'success');
            }
        });
    }
    
    // Payment management
    if (addPaymentBtn) {
        addPaymentBtn.addEventListener('click', () => {
            showModal(addPaymentModal);
        });
    }
    
    if (addPaymentForm) {
        addPaymentForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            
            const customer_id = document.getElementById('payment-customer').value;
            const amount = document.getElementById('payment-amount').value;
            const description = document.getElementById('payment-description').value;
            const send_payment_link = document.getElementById('send-payment-link').checked;
            
            const result = await apiRequest('/payments/', 'POST', {
                customer_id: parseInt(customer_id),
                amount: parseFloat(amount),
                description,
                send_payment_link
            });
            
            if (result) {
                hideModal(addPaymentModal);
                addPaymentForm.reset();
                fetchPayments();
                showToast('Payment created successfully!', 'success');
            }
        });
    }
    
    // Business profile form
    if (businessProfileForm) {
        businessProfileForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            
            const business_name = businessNameInput.value;
            const business_whatsapp = businessWhatsappInput.value;
            
            const result = await apiRequest('/auth/business-profile', 'PUT', {
                business_name,
                business_whatsapp
            });
            
            if (result) {
                // Update current user data
                currentUser = result;
                localStorage.setItem('currentUser', JSON.stringify(currentUser));
                
                // Update UI
                profileBusinessName.textContent = business_name || 'Your Business';
                userNameDisplay.textContent = `Welcome, ${business_name || currentUser.email}`;
                
                showToast('Business profile updated successfully!', 'success');
            }
        });
    }
    
    // Logo upload
    if (businessLogoUpload) {
        businessLogoUpload.addEventListener('change', (e) => {
            const file = e.target.files[0];
            if (file) {
                const reader = new FileReader();
                reader.onload = function(e) {
                    businessLogoPreview.src = e.target.result;
                };
                reader.readAsDataURL(file);
                
                // In a real app, you would upload this to the server
                // For now, we'll just show a toast
                showToast('Logo updated! (Note: In this demo, the logo is not actually uploaded)', 'info');
            }
        });
    }
    
    // Event delegation for dynamic elements
    document.addEventListener('click', async (e) => {
        // Delete customer
        if (e.target.closest('.delete-customer')) {
            const button = e.target.closest('.delete-customer');
            const customerId = button.dataset.id;
            
            if (confirm('Are you sure you want to delete this customer?')) {
                const result = await apiRequest(`/customers/${customerId}`, 'DELETE');
                if (result) {
                    fetchCustomers();
                    showToast('Customer deleted successfully', 'success');
                }
            }
        }
        
        // Delete reminder
        if (e.target.closest('.delete-reminder')) {
            const button = e.target.closest('.delete-reminder');
            const reminderId = button.dataset.id;
            
            if (confirm('Are you sure you want to delete this reminder?')) {
                const result = await apiRequest(`/reminders/${reminderId}`, 'DELETE');
                if (result) {
                    fetchReminders();
                    showToast('Reminder deleted successfully', 'success');
                }
            }
        }
        
        // Send reminder now
        if (e.target.closest('.send-reminder')) {
            const button = e.target.closest('.send-reminder');
            const reminderId = button.dataset.id;
            
            const result = await apiRequest(`/reminders/${reminderId}/send`, 'POST');
            if (result) {
                fetchReminders();
                showToast('Reminder sent successfully', 'success');
            }
        }
        
        // Delete payment
        if (e.target.closest('.delete-payment')) {
            const button = e.target.closest('.delete-payment');
            const paymentId = button.dataset.id;
            
            if (confirm('Are you sure you want to delete this payment?')) {
                const result = await apiRequest(`/payments/${paymentId}`, 'DELETE');
                if (result) {
                    fetchPayments();
                    showToast('Payment deleted successfully', 'success');
                }
            }
        }
        
        // Send payment link
        if (e.target.closest('.send-payment')) {
            const button = e.target.closest('.send-payment');
            const paymentId = button.dataset.id;
            
            const result = await apiRequest(`/payments/${paymentId}/send-link`, 'POST');
            if (result) {
                showToast('Payment link sent successfully', 'success');
            }
        }
        
        // Download invoice
        if (e.target.closest('.invoice-payment')) {
            const button = e.target.closest('.invoice-payment');
            const paymentId = button.dataset.id;
            
            window.open(`${API_URL}/payments/${paymentId}/invoice`, '_blank');
        }
    });
    
    // Initialize the app
    checkAuth();
});
