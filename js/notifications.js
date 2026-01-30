/**
 * Employee Leave System - Real-time Notifications (SignalR)
 */

const Notifications = {
    connection: null,

    async init() {
        const token = localStorage.getItem('token');
        const userId = localStorage.getItem('userId');
        const role = localStorage.getItem('userRole');

        if (!token || !userId) return;

        // Initialize SignalR Connection
        this.connection = new signalR.HubConnectionBuilder()
            .withUrl(`${API.baseUrl}/notificationHub`, {
                accessTokenFactory: () => token
            })
            .withAutomaticReconnect()
            .build();

        // Listen for notifications
        this.connection.on("ReceiveNotification", (title, message) => {
            this.showNotificationPopup(title, message);
        });

        try {
            await this.connection.start();
            console.log("✅ SignalR Connected.");

            // Join user-specific group
            await this.connection.invoke("JoinUserGroup", userId);

            // If Manager or HR, join Managers group
            const normalizedRole = role?.toLowerCase();
            if (normalizedRole === 'manager' || normalizedRole === 'hr' || normalizedRole === 'admin') {
                await this.connection.invoke("JoinUserGroup", "Managers");
            }

        } catch (err) {
            console.error("❌ SignalR Connection Error: ", err);
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
    if (typeof signalR !== 'undefined') {
        Notifications.init();
    }
});

window.Notifications = Notifications;
