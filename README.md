# Employee Leave System - Frontend

[![HTML5](https://img.shields.io/badge/HTML5-E34F26?logo=html5&logoColor=white)](https://developer.mozilla.org/en-US/docs/Web/HTML)
[![CSS3](https://img.shields.io/badge/CSS3-1572B6?logo=css3)](https://developer.mozilla.org/en-US/docs/Web/CSS)
[![JavaScript](https://img.shields.io/badge/JavaScript-F7DF1E?logo=javascript&logoColor=black)](https://developer.mozilla.org/en-US/docs/Web/JavaScript)
[![Docker](https://img.shields.io/badge/Docker-Ready-2496ED?logo=docker)](https://www.docker.com/)

Modern web frontend for Employee Leave Management System with real-time notifications.

## ✨ Features

- 🎨 **Modern UI** - Clean, responsive design with gradient themes
- 🔐 **Role-Based Access** - Employee, Manager, HR dashboards
- 🔔 **Real-time Notifications** - SignalR integration for instant updates
- 📊 **Statistics Dashboard** - Visual charts and analytics
- 🐳 **Docker Ready** - Nginx serving with load balancing support

## 📁 Project Structure

```
emp_leave_frontend/
├── index.html                    # Login page
├── css/
│   └── style.css                 # Global styles
├── js/
│   ├── app.js                    # Main application logic
│   ├── api.js                    # Backend API client
│   └── notifications.js          # SignalR client
├── pages/
│   ├── employee/                 # Employee portal
│   │   ├── dashboard.html
│   │   └── my-request.html
│   ├── manager/                  # Manager portal
│   │   ├── dashboard.html
│   │   ├── teams.html
│   │   └── statistics.html
│   └── hr/                       # HR portal
│       ├── dashboard.html
│       ├── manage-info.html
│       └── manage-request.html
├── Dockerfile                    # Nginx-based container
└── docker-compose.yml            # Full stack orchestration
```

## 🚀 Quick Start

### Local Development

1. **Using Live Server (Recommended)**

   ```bash
   # Install Live Server extension in VS Code
   # Right-click index.html → "Open with Live Server"
   ```

2. **Using Python**
   ```bash
   python -m http.server 3000
   # Open http://localhost:3000
   ```

### Docker Deployment

```bash
# Create .env file
echo "MONGODB_URL=mongodb+srv://..." > .env
echo "DB_NAME=emp-leave" >> .env

# Start all services
docker-compose up --build

# Access at http://localhost:8080
```

## 🔗 API Connection

| Environment | Backend URL                      |
| ----------- | -------------------------------- |
| Development | `http://localhost:5000`          |
| Docker      | `http://backend:8080` (internal) |
| Production  | Configure in `js/api.js`         |

## 📱 Role-Based Dashboards

| Role         | Dashboard                        | Features                               |
| ------------ | -------------------------------- | -------------------------------------- |
| **Employee** | `/pages/employee/dashboard.html` | View balance, request leave, history   |
| **Manager**  | `/pages/manager/dashboard.html`  | Approve/reject, team overview          |
| **HR**       | `/pages/hr/dashboard.html`       | User management, reports, all requests |

## 🔔 Real-time Notifications

SignalR integration provides instant updates:

- ✅ Leave request approved/rejected
- 📩 New leave request submitted (for managers)
- 📊 Balance updates

```javascript
// Notifications are handled automatically via notifications.js
// Toast messages appear in the top-right corner
```

## 🐳 Docker Architecture

```
┌─────────────────────────────────────┐
│              Nginx :80              │
│         (Static file server)        │
└─────────────────────────────────────┘
                  │
                  ▼
┌─────────────────────────────────────┐
│          Backend API :8080          │
│        (Proxied via Nginx LB)       │
└─────────────────────────────────────┘
```

## ⚙️ Configuration

Update API base URL in `js/api.js`:

```javascript
const API_BASE_URL = "http://localhost:5000/api";
```

## 📄 License

MIT License
