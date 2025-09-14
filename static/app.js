document.addEventListener('DOMContentLoaded', () => {
    const customerForm = document.getElementById('add-customer-form');
    const customerList = document.getElementById('customer-list');
    const reminderForm = document.getElementById('add-reminder-form');
    const reminderList = document.getElementById('reminder-list');
    const reminderCustomerSelect = document.getElementById('reminder-customer');

    const API_URL = 'http://127.0.0.1:8000';

    // Fetch and display customers
    async function fetchCustomers() {
        try {
            const response = await fetch(`${API_URL}/customers/`);
            if (!response.ok) throw new Error('Failed to fetch customers');
            const customers = await response.json();

            customerList.innerHTML = '';
            reminderCustomerSelect.innerHTML = '<option value="" disabled selected>Select a customer</option>';

            customers.forEach(customer => {
                // Add to customer list
                const li = document.createElement('li');
                li.innerHTML = `
                    <div class="customer-info">
                        <span class="customer-name">${customer.name}</span>
                        <span class="customer-phone">${customer.phone}</span>
                    </div>
                `;
                customerList.appendChild(li);

                // Add to reminder dropdown
                const option = document.createElement('option');
                option.value = customer.id;
                option.textContent = `${customer.name} (${customer.phone})`;
                reminderCustomerSelect.appendChild(option);
            });
        } catch (error) {
            console.error('Error fetching customers:', error);
        }
    }

    // Fetch and display reminders
    async function fetchReminders() {
        try {
            const response = await fetch(`${API_URL}/reminders/`);
            if (!response.ok) throw new Error('Failed to fetch reminders');
            const reminders = await response.json();

            reminderList.innerHTML = '';

            reminders.forEach(reminder => {
                const li = document.createElement('li');
                const sendTime = new Date(reminder.send_time).toLocaleString();
                li.innerHTML = `
                    <div class="reminder-info">
                        <span class="reminder-message">${reminder.message}</span>
                        <span class="reminder-details">For Customer ID: ${reminder.customer_id} at ${sendTime}</span>
                    </div>
                    <span class="reminder-status">${reminder.status}</span>
                `;
                reminderList.appendChild(li);
            });
        } catch (error) {
            console.error('Error fetching reminders:', error);
        }
    }

    // Add a new customer
    customerForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const name = document.getElementById('customer-name').value;
        const phone = document.getElementById('customer-phone').value;

        try {
            const response = await fetch(`${API_URL}/customers/`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ name, phone }),
            });

            if (!response.ok) throw new Error('Failed to add customer');
            customerForm.reset();
            fetchCustomers();
            fetchReminders(); // Refresh reminders in case of updates
        } catch (error) {
            console.error('Error adding customer:', error);
        }
    });

    // Add a new reminder
    reminderForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const customer_id = reminderCustomerSelect.value;
        const message = document.getElementById('reminder-message').value;
        const send_time = document.getElementById('reminder-time').value;

        if (!customer_id) {
            alert('Please select a customer.');
            return;
        }

        try {
            const response = await fetch(`${API_URL}/reminders/`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ customer_id: parseInt(customer_id), message, send_time }),
            });

            if (!response.ok) throw new Error('Failed to schedule reminder');
            reminderForm.reset();
            fetchReminders();
        } catch (error) {
            console.error('Error scheduling reminder:', error);
        }
    });

    // Initial fetch
    fetchCustomers();
    fetchReminders();
});
