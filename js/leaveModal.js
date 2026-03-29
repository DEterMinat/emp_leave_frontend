// leaveModal.js
// Injects the Request Leave modal and wires all related behaviors so multiple pages can reuse it.
(function () {
    const modalHtml = `
    <div id="leaveModal" class="fixed inset-0 bg-black/60 hidden z-50 flex items-center justify-center p-4 backdrop-blur-sm" role="dialog" aria-modal="true">
    <div id="leaveModalPanel" class="bg-white rounded-[2.5rem] shadow-2xl w-full overflow-hidden transform transition-all border border-gray-100 flex flex-col" style="max-width:900px; width:100%; max-height:90vh;" role="document" tabindex="-1">
            <div class="p-8 border-b flex justify-between items-center bg-white relative">
                <h3 class="text-2xl font-bold text-gray-800 w-full text-center" data-i18n="modal.title">Request Leave</h3>
                <button id="leaveModalClose" aria-label="Close leave modal" class="absolute right-6 p-2 hover:bg-gray-100 rounded-full transition">
                    <i data-lucide="x" class="w-6 h-6 text-gray-400"></i>
                </button>
            </div>
            
            <form id="leaveForm" class="p-0 sm:p-0 flex-1 flex flex-col" style="box-sizing: border-box;">
                <div id="leaveModalBody" class="overflow-auto p-6 sm:p-8" style="max-height:calc(90vh - 180px);">
                <div class="space-y-4">
                    <div>
                        <label class="block text-sm font-semibold text-gray-700 mb-2" data-i18n="modal.selectType">Leave Type</label>
                        <select id="leaveType" class="w-full border rounded-xl px-4 py-3 bg-white focus:ring-2 focus:ring-blue-200 outline-none text-gray-700 font-medium appearance-none">
                            <option value="" data-i18n="modal.selectType">Select Leave Type</option>
                            <option value="696a6fb10b6849bd411eedbf">Annual Leave (ลาพักผ่อน)</option>
                            <option value="69779726b7473577ad7f0233">Sick Leave (ลาป่วย)</option>
                            <option value="69783ac8111b105aeac97904">Personal Leave (ลากิจส่วนตัว)</option>
                            <option value="7001234567890abcdef12345">Ordination Leave (ลาอุปสมบท)</option>
                            <option value="7002345678901bcdef23456">Unpaid Leave (ลางานไม่รับเงิน)</option>
                        </select>
                    </div>

                    <!-- Rules box (matches provided screenshot) -->
                    <div class="bg-blue-50 border-l-4 border-blue-200 rounded-lg p-4 text-sm text-blue-800">
                        <div class="flex items-start gap-3">
                            <i data-lucide="info" class="w-5 h-5 text-blue-500 mt-1"></i>
                            <div>
                                <p class="font-semibold mb-1" data-i18n="modal.leaveRuleTitle">กฎการลาประเภทนี้:</p>
                                <ul id="leaveRulesList" class="list-disc ml-5 text-sm text-blue-800 space-y-1">
                                    <li data-i18n="modal.selectTypeToSeeRules">โปรดเลือกประเภทการลาเพื่อดูเงื่อนไข</li>
                                </ul>
                            </div>
                        </div>
                    </div>

                    <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                            <label class="block text-sm font-semibold text-gray-700 mb-2" data-i18n="modal.startDate">Start Date</label>
                            <div class="relative">
                                <input type="date" id="startDate" placeholder="วว/ดด/ปปปป" class="w-full border rounded-xl px-4 py-3 bg-white outline-none font-medium focus:ring-2 focus:ring-blue-200">
                            </div>
                        </div>
                        <div>
                            <label class="block text-sm font-semibold text-gray-700 mb-2" data-i18n="modal.endDate">End Date</label>
                            <div class="relative">
                                <input type="date" id="endDate" placeholder="วว/ดด/ปปปป" class="w-full border rounded-xl px-4 py-3 bg-white outline-none font-medium focus:ring-2 focus:ring-blue-200">
                            </div>
                        </div>
                    </div>

                    <div>
                        <label class="block text-sm font-semibold text-gray-700 mb-2" data-i18n="common.reason">Reason</label>
                        <textarea id="description" rows="4" placeholder="Brief description of your leave request..." data-i18n-placeholder="modal.reasonPlaceholder" class="w-full border rounded-xl px-4 py-3 bg-white outline-none font-medium focus:ring-2 focus:ring-blue-200 resize-none"></textarea>
                    </div>

                    <div id="attachmentSection">
                        <label class="block text-sm font-semibold text-gray-700 mb-2" data-i18n="modal.attachment">Attachments (Optional)</label>
                        <div id="attachmentDrop" class="border-2 border-dashed border-gray-200 rounded-xl p-6 text-center hover:bg-gray-50 transition cursor-pointer group relative" style="min-height:120px;">
                            <i data-lucide="upload-cloud" class="mx-auto text-gray-300 mb-2 w-10 h-10 group-hover:text-blue-500 transition"></i>
                            <p class="text-sm font-medium text-gray-600" data-i18n="modal.uploadHint">Click to upload or drag and drop</p>
                            <p class="text-xs text-gray-400 mt-1">PDF, DOC, DOCX, JPG, PNG (max 10MB)</p>
                            <input type="file" class="hidden" id="fileInput" multiple>
                        </div>
                        <div id="file-list" class="mt-4 space-y-2"></div>
                    </div>
                </div>
                </div>

                <div class="flex-none bg-white border-t border-gray-100 px-4 sm:px-6 py-3 sm:py-4" style="box-shadow: 0 -6px 18px rgba(15,23,42,0.04);">
                    <div class="max-w-7xl mx-auto flex items-center gap-4" style="justify-content: flex-end;">
                        <button type="button" id="leaveCancel" class="inline-flex items-center justify-center h-12 px-5 rounded-2xl border border-gray-200 text-gray-600 font-semibold hover:bg-gray-50 transition" style="min-width:120px;" data-i18n="common.cancel">Cancel</button>
                        <button type="submit" id="leaveSubmit" class="inline-flex items-center justify-center h-12 px-6 rounded-2xl bg-blue-600 text-white font-semibold hover:bg-blue-700 transition shadow-md" style="min-width:140px;">
                            <svg xmlns="http://www.w3.org/2000/svg" class="-ml-1 mr-2" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12h14"></path><path d="M12 5l7 7-7 7"></path></svg>
                            <span data-i18n="modal.submitBtn">Submit Request</span>
                        </button>
                    </div>
                </div>
            </form>
        </div>
    </div>
    `;

    // helper to create element and set up after DOM ready
    function injectModal() {
        if (document.getElementById('leaveModal')) return; // already injected
        document.body.insertAdjacentHTML('beforeend', modalHtml);
        if (window.I18N) I18N.scan();
        lucide.createIcons();
        setupBehaviors();
    }

    let uploadedFiles = [];
    let leaveTypeMap = {}; // map leaveTypeId -> key e.g. 'sick','annual'

    function setupBehaviors() {
        const modal = document.getElementById('leaveModal');
        const closeBtn = document.getElementById('leaveModalClose');
        const cancelBtn = document.getElementById('leaveCancel');
        const drop = document.getElementById('attachmentDrop');
        const fileInput = document.getElementById('fileInput');
        const fileList = document.getElementById('file-list');
        const leaveForm = document.getElementById('leaveForm');
        const panel = document.getElementById('leaveModalPanel');

        // Expose LeaveModal namespace to avoid polluting global scope
        window.LeaveModal = {
            toggle: function () { return toggle(); },
            open: function () { return open(); },
            close: function () { return close(); },
            getUploadedFiles: function () { return uploadedFiles; }
        };

        function toggle() {
            if (modal.classList.contains('hidden')) return open();
            return close();
        }

        function open() {
            modal.classList.remove('hidden');
            // prevent body scroll while modal open
            try { window._leaveModal_prevBodyOverflow = document.body.style.overflow; document.body.style.overflow = 'hidden'; } catch (e) {}
            // fill leave types dynamically and rebuild map
            UI.fillLeaveTypes('leaveType').then(() => buildLeaveTypeMap());
            lucide.createIcons();

            // focus trap - set focus to first focusable element inside modal
            try {
                const focusable = panel ? panel.querySelectorAll('button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])') : [];
                if (focusable && focusable.length) focusable[0].focus();
            } catch (e) { }
            // add keydown handler for Escape and Tab
            document.addEventListener('keydown', onKeyDown);
        }

        function close() {
            modal.classList.add('hidden');
            leaveForm.reset();
            fileList.innerHTML = '';
            uploadedFiles = [];
            // restore body overflow
            try { document.body.style.overflow = window._leaveModal_prevBodyOverflow || ''; delete window._leaveModal_prevBodyOverflow; } catch (e) {}
            document.removeEventListener('keydown', onKeyDown);
        }

        function onKeyDown(e) {
            if (!panel) return;
            if (e.key === 'Escape') {
                window.LeaveModal.close();
                return;
            }
            if (e.key === 'Tab') {
                // simple focus trap
                const focusable = Array.from(panel.querySelectorAll('a[href], area[href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), button:not([disabled]), [tabindex]:not([tabindex="-1"])')).filter(el => el.offsetParent !== null);
                if (!focusable.length) return;
                const first = focusable[0];
                const last = focusable[focusable.length - 1];
                if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
                else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
            }
        }

        closeBtn && closeBtn.addEventListener && closeBtn.addEventListener('click', () => window.LeaveModal.close());
    cancelBtn && cancelBtn.addEventListener && cancelBtn.addEventListener('click', () => window.LeaveModal.close());

        // open file picker
        if (drop && fileInput) {
            drop.addEventListener && drop.addEventListener('click', () => fileInput.click());

            // file input change
            fileInput.addEventListener && fileInput.addEventListener('change', (e) => handleFiles(e.target.files));

            // basic drag/drop support
            drop.addEventListener && drop.addEventListener('dragover', (e) => { e.preventDefault(); drop.classList.add('bg-gray-50'); });
            drop.addEventListener && drop.addEventListener('dragleave', (e) => { drop.classList.remove('bg-gray-50'); });
            drop.addEventListener && drop.addEventListener('drop', (e) => { e.preventDefault(); drop.classList.remove('bg-gray-50'); if (e.dataTransfer && e.dataTransfer.files) handleFiles(e.dataTransfer.files); });
        }

        // wire date/type inputs for rules
        const leaveType = document.getElementById('leaveType');
        const startDate = document.getElementById('startDate');
        const endDate = document.getElementById('endDate');

        leaveType.addEventListener('change', () => { checkRules(); });
        startDate.addEventListener('change', () => { calculateDays(); validateDateRange(); });
        endDate.addEventListener('change', () => { calculateDays(); validateDateRange(); });

        function validateDateRange() {
            const s = document.getElementById('startDate').value;
            const e = document.getElementById('endDate').value;
            const endEl = document.getElementById('endDate');
            if (s && e && new Date(e) < new Date(s)) {
                endEl.classList.add('border-red-500', 'ring-1', 'ring-red-400');
                endEl.title = I18N.t('modal.dateError');
            } else {
                endEl.classList.remove('border-red-500', 'ring-1', 'ring-red-400');
                endEl.title = '';
            }
        }


        leaveForm.addEventListener('submit', async (e) => {
            e.preventDefault();

            const rawLeaveType = document.getElementById('leaveType').value;
            const rawStartDate = document.getElementById('startDate').value;
            const rawEndDate = document.getElementById('endDate').value;
            const reason = document.getElementById('description').value;

            if (!rawLeaveType || !rawStartDate || !rawEndDate || !reason) {
                // Highlight missing date fields specifically
                const startEl = document.getElementById('startDate');
                const endEl   = document.getElementById('endDate');
                const highlightClass = ['border-red-500', 'ring-1', 'ring-red-400'];

                if (!rawStartDate) startEl.classList.add(...highlightClass);
                else               startEl.classList.remove(...highlightClass);

                if (!rawEndDate)   endEl.classList.add(...highlightClass);
                else               endEl.classList.remove(...highlightClass);

                if (!rawStartDate || !rawEndDate) {
                    UI.showToast(I18N.t('modal.missingDates'), 'error');
                } else {
                    UI.showToast(I18N.t('modal.missingFields'), 'warning');
                }
                return;
            }

            // Clear any previous date highlights
            ['startDate', 'endDate'].forEach(id => {
                document.getElementById(id).classList.remove('border-red-500', 'ring-1', 'ring-red-400');
            });

            // Validate: End Date must not be before Start Date
            const startDateObj = new Date(rawStartDate);
            const endDateObj   = new Date(rawEndDate);
            if (endDateObj < startDateObj) {
                UI.showToast(I18N.t('modal.dateError'), 'error');
                const endEl = document.getElementById('endDate');
                endEl.classList.add('border-red-500', 'ring-1', 'ring-red-400');
                endEl.focus();
                return;
            }


            try {
                // Fetch employee data to get createdAt for tenure validation
                const userId = localStorage.getItem('userId');
                let employeeProfile = null;
                
                try {
                    employeeProfile = await API.employees.getByUserId(userId);
                } catch (empErr) {
                    console.warn('Cannot fetch employee profile (likely permission/403), trying User endpoint:', empErr);
                    try {
                        employeeProfile = await API.users.getById(userId);
                    } catch (userErr) {
                        console.error('Failed to fetch profile from all endpoints:', userErr);
                    }
                }

                // Fetch all leaves for carry-over logic
                let allLeaves = [];
                try {
                    allLeaves = await API.leaves.getAll(userId);
                } catch (err) {
                    console.warn('Failed to fetch historical leaves for carry-over validation:', err);
                }

                // CENTRALIZED VALIDATION (passing employee and history for carry-over check)
                const typeKey = leaveTypeMap[rawLeaveType] || 'other';
                const validation = LeaveRequest.validate(typeKey, rawStartDate, rawEndDate, employeeProfile, allLeaves);
                
                if (!validation.valid) {
                    UI.showToast(validation.message, 'error');
                    return;
                }

                // Inform user if annual leave carry-over was capped at 12 days
                if (validation.carryOverCapped) {
                    UI.showToast('ℹ️ ยอดทบสะสมต้องไม่เกิน 12 วัน — สิทธิ์ของคุณถูกจำกัดที่ 12 วัน', 'warning');
                }


                // CHECK FOR DATE OVERLAP with existing Pending or Approved leaves
                const newStart = new Date(rawStartDate);
                const newEnd   = new Date(rawEndDate);
                newStart.setHours(0, 0, 0, 0);
                newEnd.setHours(0, 0, 0, 0);

                const overlapping = allLeaves.filter(l => {
                    const s = (l.status || '').toLowerCase();
                    if (s === 'rejected' || s === 'reject' || s === 'cancelled') return false;
                    const existStart = new Date(l.startDate);
                    const existEnd   = new Date(l.endDate);
                    existStart.setHours(0, 0, 0, 0);
                    existEnd.setHours(0, 0, 0, 0);
                    // Overlap condition: newStart <= existEnd AND newEnd >= existStart
                    return newStart <= existEnd && newEnd >= existStart;
                });

                if (overlapping.length > 0) {
                    const conflict = overlapping[0];
                    // Use Gregorian (CE) format to match what the date input shows
                    const fmtCE = d => new Date(d).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
                    const cStart  = fmtCE(conflict.startDate);
                    const cEnd    = fmtCE(conflict.endDate);
                    const cType   = conflict.leaveTypeName || conflict.type || 'การลา';
                    const cStatus = conflict.status || '';
                    UI.showToast(
                        I18N.t('modal.overlapError').replace('{0}', cType).replace('{1}', cStart).replace('{2}', cEnd).replace('{3}', cStatus),
                        'error'
                    );
                    document.getElementById('startDate').classList.add('border-red-500', 'ring-1', 'ring-red-400');
                    document.getElementById('endDate').classList.add('border-red-500', 'ring-1', 'ring-red-400');
                    return;
                }

                // Check if attachment is required but missing
                if (validation.needsAttachment && uploadedFiles.length === 0) {
                    UI.showToast(I18N.t('modal.attachmentRequired'), 'warning');
                    return;
                }


                const leaveData = {
                    employeeId: userId,
                    leaveTypeId: rawLeaveType,
                    startDate: new Date(rawStartDate).toISOString(),
                    endDate: new Date(rawEndDate).toISOString(),
                    reason: reason
                };

                let created = null;

                // If there are attachments, prefer the Swagger endpoint that accepts multipart/form-data
                if (uploadedFiles.length > 0) {
                    try {
                        created = await createLeaveWithAttachment(leaveData, uploadedFiles);
                        UI.showToast('ส่งใบลาพร้อมไฟล์แนบสำเร็จแล้ว!', 'success');
                    } catch (err) {
                        // If server doesn't have that endpoint (404) or it fails, fall back to create-then-upload flow
                        console.warn('createWithAttachment failed, will fallback to create() + uploadFiles():', err);
                        // continue to fallback below
                    }
                }

                // fallback: create leave first then upload attachments
                if (!created) {
                    created = await API.leaves.create(leaveData);
                    UI.showToast('ส่งใบลาสำเร็จแล้ว!', 'success');

                    const leaveId = created && (created.id || created.leaveId || created._id);
                    if (leaveId && uploadedFiles.length > 0) {
                        try {
                            await uploadFiles(leaveId, uploadedFiles);
                            UI.showToast('อัปโหลดไฟล์แนบสำเร็จ', 'success');
                        } catch (uErr) {
                            console.error('Upload files error:', uErr);
                            UI.showToast('อัปโหลดไฟล์แนบล้มเหลว', 'warning');
                        }
                    }
                }

                // reset and close
                leaveForm.reset();
                uploadedFiles = [];
                fileList.innerHTML = '';
                window.LeaveModal.close();

                // notify pages so they can refresh their data
                document.dispatchEvent(new CustomEvent('leaveSubmitted', { detail: { success: true, leave: created } }));
            } catch (error) {
                UI.showToast('ส่งใบลาไม่สำเร็จ: ' + (error && error.message ? error.message : error), 'error');
            }
        });

        // helper: call server endpoint that accepts multipart/form-data in one go
        async function createLeaveWithAttachment(leaveData, files) {
            const token = localStorage.getItem('token');
            const url = `${API.baseUrl}/api/LeaveRequests/with-attachment`;

            const form = new FormData();
            // According to Swagger: File (binary), EmployeeId, LeaveTypeId, StartDate, EndDate, Reason
            // Append each file as 'File' (server may accept single or repeated File fields)
            files.forEach(f => form.append('File', f));
            form.append('EmployeeId', leaveData.employeeId);
            form.append('LeaveTypeId', leaveData.leaveTypeId);
            form.append('StartDate', leaveData.startDate);
            form.append('EndDate', leaveData.endDate);
            form.append('Reason', leaveData.reason);

            const res = await fetch(url, {
                method: 'POST',
                headers: {
                    'Authorization': token ? `Bearer ${token}` : ''
                    // NOTE: do NOT set Content-Type; browser will set multipart boundary
                },
                body: form
            });

            const text = await res.text();
            if (res.ok) {
                try { return JSON.parse(text); } catch (e) { return text; }
            }

            // Throw an error with status for callers to decide fallback
            const err = new Error(`Create with attachment failed ${res.status}: ${text}`);
            err.status = res.status;
            throw err;
        }

        // Known file signatures (magic bytes) for allowed types
        const FILE_SIGNATURES = {
            '.pdf':  { bytes: [0x25, 0x50, 0x44, 0x46], label: 'PDF' },           // %PDF
            '.jpg':  { bytes: [0xFF, 0xD8, 0xFF],        label: 'JPEG' },          // JPEG SOI
            '.jpeg': { bytes: [0xFF, 0xD8, 0xFF],        label: 'JPEG' },
            '.png':  { bytes: [0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A], label: 'PNG' },
            '.doc':  { bytes: [0xD0, 0xCF, 0x11, 0xE0],  label: 'DOC' },           // OLE2 Compound
            '.docx': { bytes: [0x50, 0x4B, 0x03, 0x04],  label: 'DOCX (ZIP)' },   // ZIP (Office Open XML)
        };

        // Read first N bytes of a File and return as Uint8Array
        function readFileHeader(file, numBytes) {
            return new Promise((resolve, reject) => {
                const reader = new FileReader();
                reader.onload = e => resolve(new Uint8Array(e.target.result));
                reader.onerror  = reject;
                reader.readAsArrayBuffer(file.slice(0, numBytes));
            });
        }

        // Compare file header against known magic bytes
        function matchesSignature(header, sig) {
            return sig.every((byte, i) => header[i] === byte);
        }

        // file handlers — async to support magic-bytes check
        async function handleFiles(files) {
            const allowedExtensions = ['.pdf', '.doc', '.docx', '.jpg', '.jpeg', '.png'];
            const maxSizeBytes = 10 * 1024 * 1024; // 10MB

            for (const file of Array.from(files)) {
                const fileName  = file.name.toLowerCase();

                // 0. Double-extension / path traversal guard
                const dotCount = (fileName.match(/\./g) || []).length;
                if (dotCount > 1 || fileName.includes('/') || fileName.includes('\\')) {
                    UI.showToast(`⚠ ไฟล์ "${file.name}" มีชื่อที่น่าสงสัย (double extension หรือ path)`, 'error');
                    continue;
                }

                const fileExtension = fileName.substring(fileName.lastIndexOf('.'));

                // 1. Extension whitelist
                if (!allowedExtensions.includes(fileExtension)) {
                    UI.showToast(`ไม่อนุญาตไฟล์ประเภทนี้ (${fileExtension}) — อนุญาตเฉพาะ PDF, DOC, JPG, PNG`, 'warning');
                    continue;
                }

                // 2. Size limit
                if (file.size > maxSizeBytes) {
                    UI.showToast(`ไฟล์ "${file.name}" ใหญ่เกินไป (ต้องไม่เกิน 10MB)`, 'warning');
                    continue;
                }

                // 3. Magic Bytes (File Signature) — read actual file header
                try {
                    const sigDef = FILE_SIGNATURES[fileExtension];
                    if (sigDef) {
                        const header = await readFileHeader(file, 8);
                        if (!matchesSignature(header, sigDef.bytes)) {
                            UI.showToast(
                                `🚫 ตรวจพบความผิดปกติ: ไฟล์ "${file.name}" มี file signature ไม่ตรงกับนามสกุล .${fileExtension.slice(1).toUpperCase()} — บล็อกการอัปโหลด`,
                                'error'
                            );
                            console.warn(`[Security] File signature mismatch for "${file.name}":`, 
                                Array.from(header.slice(0, 8)).map(b => '0x' + b.toString(16).padStart(2,'0').toUpperCase()).join(' '),
                                'Expected signature for', sigDef.label
                            );
                            continue;
                        }
                    }
                } catch (sigErr) {
                    console.warn('[Security] Could not read file signature for', file.name, sigErr);
                    // Non-fatal: allow file if we can't read bytes (e.g., empty file edge case)
                }

                // 4. Duplicate check
                if (uploadedFiles.some(f => f.name === file.name)) continue;
                uploadedFiles.push(file);

                const fileItem = document.createElement('div');
                fileItem.className = "flex items-center justify-between p-3 bg-gray-50 rounded-xl border border-gray-100 mb-2";
                fileItem.innerHTML = `
                    <div class="flex items-center space-x-3">
                        <i data-lucide="file-text" class="w-5 h-5 text-gray-400"></i>
                        <div>
                            <p class="text-sm font-medium text-gray-700">${file.name}</p>
                            <p class="text-xs text-gray-400">${(file.size / 1024).toFixed(2)} KB</p>
                        </div>
                    </div>
                    <button type="button" class="text-red-500 hover:bg-red-50 p-1 rounded-full transition file-remove-btn">
                        <i data-lucide="trash-2" class="w-4 h-4"></i>
                    </button>
                `;

                fileItem.querySelector('.file-remove-btn').addEventListener('click', () => removeFile(file.name));
                fileList.appendChild(fileItem);
            }
            lucide.createIcons();
        }



        function removeFile(fileName) {
            uploadedFiles = uploadedFiles.filter(f => f.name !== fileName);
            fileList.innerHTML = '';
            const tempFiles = [...uploadedFiles];
            uploadedFiles = [];
            // redraw
            handleFiles(tempFiles);
        }

    // expose handlers (if some code calls them directly)
    window.LeaveModal.handleFiles = handleFiles;
    window.LeaveModal.removeFile = removeFile;

        // rules copied from original implementation (kept as-is for compatibility)
        function checkRules() {
            const selectEl = document.getElementById('leaveType');
            const type = selectEl.value;
            const textContent = selectEl.options[selectEl.selectedIndex]?.text.toLowerCase() || '';
            const attachment = document.getElementById('attachmentSection');
            const rulesList = document.getElementById('leaveRulesList');

            // Find matching rules based on option text
            if (textContent.includes('annual') || textContent.includes('พักผ่อน')) {
                rulesList.innerHTML = I18N.t('modal.annualRules');
            } else if (textContent.includes('sick') || textContent.includes('ป่วย')) {
                rulesList.innerHTML = I18N.t('modal.sickRules');
            } else if (textContent.includes('personal') || textContent.includes('กิจ')) {
                rulesList.innerHTML = I18N.t('modal.personalRules');
            } else if (textContent.includes('ordination') || textContent.includes('บวช')) {
                rulesList.innerHTML = I18N.t('modal.ordinationRules');
            } else if (textContent.includes('unpaid') || textContent.includes('ไม่รับเงิน')) {
                rulesList.innerHTML = I18N.t('modal.unpaidRules');
            } else {
                rulesList.innerHTML = `<li>${I18N.t('modal.selectTypeToSeeRules')}</li>`;
            }

            // Original code referenced string types like 'personal' etc.
            // We keep the logic but note: if leaveType values are IDs, server-side mapping may be required.
            // determine type key from mapping (if available)
            const key = leaveTypeMap[type] || type;
            if (key === 'personal' || key === 'ordination') {
                attachment.classList.remove('hidden');
            } else {
                attachment.classList.remove('hidden'); // default visible
            }
        }

        function calculateDays() {
            const start = new Date(document.getElementById('startDate').value);
            const end = new Date(document.getElementById('endDate').value);
            const type = document.getElementById('leaveType').value;
            const today = new Date();

            if (start && end && end >= start) {
                const diffTime = Math.abs(end - start);
                const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;

                const key = leaveTypeMap[type] || type;
                if (key === 'sick' && diffDays > 3) {
                    document.getElementById('attachmentSection').classList.remove('hidden');
                    UI.showToast(I18N.t('modal.sickAttachmentWarning'), 'warning');
                }

                const leadTime = Math.ceil((start - today) / (1000 * 60 * 60 * 24));
                const leadFmt = (key, days) => I18N.t('modal.leadTimeWarning').replace('{0}', I18N.t('type.' + key)).replace('{1}', days);

                if (key === 'personal' && leadTime < 3) {
                    UI.showToast(leadFmt('personal', 3), 'warning');
                } else if (key === 'annual' && leadTime < 7) {
                    UI.showToast(leadFmt('annual', 7), 'warning');
                } else if (key === 'ordination' && leadTime < 30) {
                    UI.showToast(leadFmt('ordination', 30), 'warning');
                } else if (key === 'unpaid' && leadTime < 7) {
                    UI.showToast(leadFmt('unpaid', 7), 'warning');
                }
            }
        }

        // build mapping from leave type id -> simple key for rules
        function buildLeaveTypeMap() {
            const select = document.getElementById('leaveType');
            leaveTypeMap = {};
            if (!select) return;
            Array.from(select.options).forEach(opt => {
                const id = opt.value;
                const name = (opt.text || '').toLowerCase();
                if (!id) return;
                if (name.includes('sick')) leaveTypeMap[id] = 'sick';
                else if (name.includes('annual')) leaveTypeMap[id] = 'annual';
                else if (name.includes('personal') || name.includes('ลากิจ')) leaveTypeMap[id] = 'personal';
                else if (name.includes('ordination') || name.includes('บวช')) leaveTypeMap[id] = 'ordination';
                else if (name.includes('unpaid') || name.includes('ไม่รับเงิน')) leaveTypeMap[id] = 'unpaid';
                else leaveTypeMap[id] = 'other';
            });
        }

        async function uploadFiles(leaveId, files) {
                const token = localStorage.getItem('token');

                // Build candidate endpoints and form field strategies to try.
                const attempts = [
                    // preferred: leave request scoped endpoint
                    {
                        url: `${API.baseUrl}/api/LeaveRequests/${leaveId}/attachments`,
                        buildForm: (f) => {
                            const form = new FormData(); f.forEach(x => form.append('files', x)); return form;
                        }
                    },
                    // fallback: generic attachments endpoint with leaveRequestId field
                    {
                        url: `${API.baseUrl}/api/Attachments`,
                        buildForm: (f) => {
                            const form = new FormData(); form.append('leaveRequestId', leaveId); f.forEach(x => form.append('files', x)); return form;
                        }
                    },
                    // fallback: singular file field (some APIs expect 'file')
                    {
                        url: `${API.baseUrl}/api/Attachments`,
                        buildForm: (f) => {
                            const form = new FormData(); form.append('leaveRequestId', leaveId); f.forEach(x => form.append('file', x)); return form;
                        }
                    },
                    // other common path
                    {
                        url: `${API.baseUrl}/api/LeaveAttachments`,
                        buildForm: (f) => {
                            const form = new FormData(); form.append('leaveRequestId', leaveId); f.forEach(x => form.append('files', x)); return form;
                        }
                    }
                ];

                let lastError = null;
                for (const attempt of attempts) {
                    try {
                        const form = attempt.buildForm(files);
                        const res = await fetch(attempt.url, {
                            method: 'POST',
                            headers: {
                                'Authorization': token ? `Bearer ${token}` : ''
                            },
                            body: form
                        });

                        if (res.ok) {
                            // try parse json, fallback to text
                            const contentType = res.headers.get('content-type') || '';
                            if (contentType.includes('application/json')) return await res.json();
                            return await res.text();
                        }

                        // if 404, try next candidate; otherwise throw with body
                        const bodyText = await res.text();
                        if (res.status === 404) {
                            console.warn(`Upload attempt to ${attempt.url} returned 404, trying next candidate.`);
                            lastError = new Error(`Upload 404 at ${attempt.url}`);
                            continue;
                        }
                        throw new Error(`Upload failed ${res.status}: ${bodyText}`);
                    } catch (err) {
                        console.error('uploadFiles attempt error:', err);
                        lastError = err;
                        // try next candidate
                    }
                }

                throw lastError || new Error('Upload failed (no attempts succeeded)');
        }
    }

    // inject on DOMContentLoaded so pages don't have to include modal markup
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', injectModal);
    } else {
        injectModal();
    }

})();
