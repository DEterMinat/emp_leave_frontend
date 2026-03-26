const TRANSLATIONS = {
    th: {
        // Common
        "common.dashboard": "แดชบอร์ด",
        "common.leaveHistory": "ประวัติการลา",
        "common.newRequest": "ยื่นใบลา",
        "common.status": "สถานะ",
        "common.reason": "เหตุผล",
        "common.cancel": "ยกเลิก",
        "common.submit": "ยืนยัน",
        "common.save": "บันทึก",
        "common.edit": "แก้ไข",
        "common.delete": "ลบ",
        "common.approve": "อนุมัติ",
        "common.reject": "ปฏิเสธ",
        "common.action": "การจัดการ",
        "common.search": "ค้นหา...",
        
        // Navigation / Roles
        "nav.employee": "พนักงาน",
        "nav.manager": "หัวหน้างาน",
        "nav.hr": "ฝ่ายบุคคล",
        "nav.teams": "ทีมของฉัน",
        "nav.teamSalary": "เงินเดือนทีม",
        "nav.statistics": "สถิติ",
        "nav.manageRequest": "จัดการคำร้อง",
        "nav.leaveQuota": "โควต้าการลา",
        "nav.logout": "ออกจากระบบ",
        
        // Login
        "login.title": "Employee Leave System",
        "login.subtitle": "ระบบจัดการลางานพนักงาน",
        "login.empId": "รหัสพนักงาน",
        "login.empIdPlaceholder": "รหัสพนักงาน",
        "login.password": "รหัสผ่าน",
        "login.passwordPlaceholder": "รหัสผ่าน",
        "login.remember": "จดจำฉัน",
        "login.forgot": "ลืมรหัสผ่าน?",
        "login.signin": "เข้าสู่ระบบ",
        
        // Dashboard
        "dash.attendance": "ลงเวลาทำงาน",
        "dash.todayAttendance": "การลงเวลาวันนี้",
        "dash.notCheckedIn": "ยังไม่ลงเวลา",
        "dash.checkedIn": "ลงเวลาเข้าแล้ว",
        "dash.completed": "ลงเวลาครบแล้ว",
        "dash.checkIn": "ลงเวลาเข้า (Check In)",
        "dash.checkOut": "ลงเวลาออก (Check Out)",
        "dash.totalHours": "ชั่วโมงรวม",
        "dash.totalRequest": "คำร้องทั้งหมด",
        "dash.pendingApproval": "รออนุมัติ",
        "dash.totalDayOff": "วันลาอนุมัติแล้ว",
        "dash.leaveBalance": "สิทธิการลาคงเหลือ",
        "dash.recentRequest": "คำร้องขอลางานล่าสุด",
        "dash.ofDays": "จาก {0} วัน",
        "dash.attendanceCompleted": "ลงเวลาเสร็จสิ้น",

        // Leave Types
        "leave.annual": "ลาพักผ่อน",
        "leave.sick": "ลาป่วย",
        "leave.personal": "ลากิจ",
        "leave.ordination": "ลาบวช",
        "leave.unpaid": "ลางานไม่รับเงิน",

        // My Request
        "req.myLeaves": "ประวัติการลาของฉัน",
        "req.date": "วันที่",
        "req.type": "ประเภท",
        "req.duration": "ระยะเวลา",
        "req.days": "วัน",
        
        // Leave Modal
        "modal.title": "ยื่นคำร้องขอลางาน",
        "modal.selectType": "เลือกประเภทการลา",
        "modal.startDate": "วันที่เริ่มลา",
        "modal.endDate": "วันที่พ้นกำหนดลา",
        "modal.reasonPlaceholder": "ระบุเหตุผลการลา...",
        "modal.attachment": "แนบไฟล์ (ถ้ามี)",
        "modal.attachmentCondition": "(ลาป่วย 3 วันขึ้นไป ต้องแนบใบรับรองแพทย์)",
        "modal.calculating": "กำลังคำนวณ...",
        "modal.submitBtn": "ส่งคำร้องขอลางาน",
        
        // HR / Manager
        "mgr.teamRequests": "คำร้องของทีม",
        "mgr.employee": "พนักงาน",
        "mgr.approveConfirm": "ยืนยันการอนุมัติ?",
        "mgr.rejectConfirm": "ยืนยันการปฏิเสธ?",
        "mgr.noPending": "ไม่มีคำร้องรออนุมัติ"
    },
    zh: {
        // Common
        "common.dashboard": "仪表板",
        "common.leaveHistory": "请假记录",
        "common.newRequest": "申请请假",
        "common.status": "状态",
        "common.reason": "原因",
        "common.cancel": "取消",
        "common.submit": "提交",
        "common.save": "保存",
        "common.edit": "编辑",
        "common.delete": "删除",
        "common.approve": "批准",
        "common.reject": "拒绝",
        "common.action": "操作",
        "common.search": "搜索...",
        
        // Navigation / Roles
        "nav.employee": "员工",
        "nav.manager": "经理",
        "nav.hr": "人力资源",
        "nav.teams": "我的团队",
        "nav.teamSalary": "团队薪资",
        "nav.statistics": "统计",
        "nav.manageRequest": "管理请求",
        "nav.leaveQuota": "请假额度",
        "nav.logout": "登出",
        
        // Login
        "login.title": "员工请假系统",
        "login.subtitle": "员工请假管理系统",
        "login.empId": "员工编号",
        "login.empIdPlaceholder": "员工编号",
        "login.password": "密码",
        "login.passwordPlaceholder": "密码",
        "login.remember": "记住我",
        "login.forgot": "忘记密码？",
        "login.signin": "登录",
        
        // Dashboard
        "dash.attendance": "考勤",
        "dash.todayAttendance": "今日考勤",
        "dash.notCheckedIn": "未签到",
        "dash.checkedIn": "已签到",
        "dash.completed": "已完成考勤",
        "dash.checkIn": "签到 (Check In)",
        "dash.checkOut": "签退 (Check Out)",
        "dash.totalHours": "总时长",
        "dash.totalRequest": "总请求",
        "dash.pendingApproval": "待批准",
        "dash.totalDayOff": "已批假天数",
        "dash.leaveBalance": "请假余额",
        "dash.recentRequest": "最近请求",
        "dash.ofDays": "共 {0} 天",
        "dash.attendanceCompleted": "考勤完成",

        // Leave Types
        "leave.annual": "年假",
        "leave.sick": "病假",
        "leave.personal": "事假",
        "leave.ordination": "出家假",
        "leave.unpaid": "无薪假",

        // My Request
        "req.myLeaves": "我的请假记录",
        "req.date": "日期",
        "req.type": "类型",
        "req.duration": "期间",
        "req.days": "天",
        
        // Leave Modal
        "modal.title": "申请请假",
        "modal.selectType": "选择请假类型",
        "modal.startDate": "开始日期",
        "modal.endDate": "结束日期",
        "modal.reasonPlaceholder": "请输入请假原因...",
        "modal.attachment": "相关附件",
        "modal.attachmentCondition": "(病假3天以上必须附上医疗证明)",
        "modal.calculating": "计算中...",
        "modal.submitBtn": "提交申请",
        
        // HR / Manager
        "mgr.teamRequests": "团队请求",
        "mgr.employee": "员工",
        "mgr.approveConfirm": "确认批准？",
        "mgr.rejectConfirm": "确认拒绝？",
        "mgr.noPending": "没有待处理的请求"
    }
};

window.TRANSLATIONS = TRANSLATIONS;
