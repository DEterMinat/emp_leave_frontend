# Employee Leave System - Frontend

ระบบจัดการลางานพนักงาน (Frontend)

## 📁 โครงสร้าง

```
emp_leave_frontend/
├── assets/
│   ├── images/           # รูปภาพ, logos
│   └── fonts/            # Custom fonts
├── css/
│   └── style.css         # Global styles
├── js/
│   ├── app.js            # Main application logic
│   └── api.js            # API client
├── data/
│   └── mock-data.js      # Mock data for testing
├── pages/
│   ├── employee/         # หน้าสำหรับพนักงาน
│   │   ├── dashboard.html
│   │   └── my-request.html
│   ├── manager/          # หน้าสำหรับผู้จัดการ
│   │   ├── dashboard.html
│   │   ├── teams.html
│   │   └── statistics.html
│   └── hr/               # หน้าสำหรับ HR
│       ├── dashboard.html
│       ├── manage-info.html
│       └── manage-request.html
├── index.html            # Login page
└── README.md
```

## 🚀 การใช้งาน

1. **ด้วย Live Server (แนะนำ)**

   - ติดตั้ง Live Server extension ใน VS Code
   - คลิกขวาที่ `index.html` → "Open with Live Server"

2. **เปิดตรง**
   - เปิดไฟล์ `index.html` ใน browser

## 🔗 Backend API

Frontend นี้ใช้งานร่วมกับ Backend ที่รันบน:

- **URL:** `http://localhost:8000`
- **Docs:** `http://localhost:8000/docs`

## 📂 การจัดการไฟล์

| Role     | Dashboard                       | Pages                       |
| -------- | ------------------------------- | --------------------------- |
| Employee | `pages/employee/dashboard.html` | my-request                  |
| Manager  | `pages/manager/dashboard.html`  | teams, statistics           |
| HR       | `pages/hr/dashboard.html`       | manage-info, manage-request |
