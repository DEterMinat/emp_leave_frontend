// leaveModal.js
// Injects the Request Leave modal and wires all related behaviors so multiple pages can reuse it.
(function () {
    const modalHtml = `
    <div id="leaveModal" class="fixed inset-0 bg-black/60 hidden z-50 flex items-center justify-center p-4 backdrop-blur-sm">
        <div class="bg-white rounded-[2.5rem] shadow-2xl w-full max-w-lg overflow-hidden transform transition-all border border-gray-100">
            <div class="p-8 border-b flex justify-between items-center bg-white relative">
                <h3 class="text-2xl font-bold text-gray-800 w-full text-center">Request Leave</h3>
                <button id="leaveModalClose" class="absolute right-6 p-2 hover:bg-gray-100 rounded-full transition">
                    <i data-lucide="x" class="w-6 h-6 text-gray-400"></i>
                </button>
            </div>
            
            <form id="leaveForm" class="p-8 space-y-5">
                <div>
                    <label class="block text-xs font-bold text-gray-400 uppercase tracking-widest mb-2 ml-1">Leave Type</label>
                    <select id="leaveType" class="w-full border-0 rounded-2xl px-5 py-4 bg-gray-50 focus:ring-2 focus:ring-blue-500 outline-none text-gray-700 font-medium appearance-none">
                        <option value="">Select Leave Type</option>
                        <option value="696a6fb10b6849bd411eedbf">Annual Leave (ลาพักผ่อน)</option>
                        <option value="69779726b7473577ad7f0233">Sick Leave (ลาป่วย)</option>
                        <option value="69783ac8111b105aeac97904">Personal Leave (ลากิจส่วนตัว)</option>
                        <option value="69783baa111b105aeac97905">Ordination Leave (ลาบวช)</option>
                        <option value="69783bc5111b105aeac97906">Unpaid Leave (ลางานไม่รับเงิน)</option>
                    </select>
                </div>

                <div class="grid grid-cols-2 gap-5">
                    <div>
                        <label class="block text-xs font-bold text-gray-400 uppercase tracking-widest mb-2 ml-1">Start Date</label>
                        <input type="date" id="startDate" class="w-full border-0 rounded-2xl px-5 py-4 bg-gray-50 outline-none font-medium focus:ring-2 focus:ring-blue-500">
                    </div>
                    <div>
                        <label class="block text-xs font-bold text-gray-400 uppercase tracking-widest mb-2 ml-1">End Date</label>
                        <input type="date" id="endDate" class="w-full border-0 rounded-2xl px-5 py-4 bg-gray-50 outline-none font-medium focus:ring-2 focus:ring-blue-500">
                    </div>
                </div>

                <div>
                    <label class="block text-xs font-bold text-gray-400 uppercase tracking-widest mb-2 ml-1">Description</label>
                    <textarea id="description" rows="3" placeholder="Description" class="w-full border-0 rounded-2xl px-5 py-4 bg-gray-50 outline-none font-medium focus:ring-2 focus:ring-blue-500 resize-none"></textarea>
                </div>

                <div id="attachmentSection">
                    <label class="block text-xs font-bold text-gray-400 uppercase tracking-widest mb-2 ml-1">Attachments</label>
                    <div id="attachmentDrop" class="border-2 border-dashed border-gray-100 rounded-[2rem] p-10 text-center hover:bg-gray-50 transition cursor-pointer group relative">
                        <i data-lucide="upload-cloud" class="mx-auto text-gray-300 mb-2 w-12 h-12 group-hover:text-blue-400 transition"></i>
                        <p class="text-sm font-medium text-gray-400">Click to upload or drag and drop</p>
                        <p class="text-[10px] text-gray-300 mt-1 uppercase">PDF, DOC, JPG, PNG MAX(10MB)</p>
                        <input type="file" class="hidden" id="fileInput" multiple>
                    </div>
                    <div id="file-list" class="mt-4 space-y-2"></div>
                </div>

                <div class="grid grid-cols-2 gap-4 pt-4">
                    <button type="button" id="leaveCancel" class="py-4 border border-gray-100 rounded-2xl text-gray-500 font-bold hover:bg-gray-50 transition">Cancel</button>
                    <button type="submit" id="leaveSubmit" class="py-4 bg-blue-600 text-white rounded-2xl font-bold hover:bg-blue-700 transition shadow-lg shadow-blue-200">Submit Request</button>
                </div>
            </form>
        </div>
    </div>
    `;

    // helper to create element and set up after DOM ready
    function injectModal() {
        if (document.getElementById('leaveModal')) return; // already injected
        document.body.insertAdjacentHTML('beforeend', modalHtml);
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
            // fill leave types dynamically and rebuild map
            UI.fillLeaveTypes('leaveType').then(() => buildLeaveTypeMap());
            lucide.createIcons();
        }

        function close() {
            modal.classList.add('hidden');
            leaveForm.reset();
            fileList.innerHTML = '';
            uploadedFiles = [];
        }

    closeBtn.addEventListener('click', () => window.LeaveModal.close());
    cancelBtn.addEventListener('click', () => window.LeaveModal.close());

        // open file picker
        drop.addEventListener('click', () => fileInput.click());

        // file input change
        fileInput.addEventListener('change', (e) => handleFiles(e.target.files));

        // basic drag/drop support
        drop.addEventListener('dragover', (e) => { e.preventDefault(); drop.classList.add('bg-gray-50'); });
        drop.addEventListener('dragleave', (e) => { drop.classList.remove('bg-gray-50'); });
        drop.addEventListener('drop', (e) => { e.preventDefault(); drop.classList.remove('bg-gray-50'); if (e.dataTransfer && e.dataTransfer.files) handleFiles(e.dataTransfer.files); });

        // wire date/type inputs for rules
        const leaveType = document.getElementById('leaveType');
        const startDate = document.getElementById('startDate');
        const endDate = document.getElementById('endDate');

        leaveType.addEventListener('change', () => { checkRules(); });
        startDate.addEventListener('change', () => { calculateDays(); });
        endDate.addEventListener('change', () => { calculateDays(); });

        leaveForm.addEventListener('submit', async (e) => {
            e.preventDefault();

            const leaveData = {
                employeeId: localStorage.getItem('userId'),
                leaveTypeId: document.getElementById('leaveType').value,
                startDate: new Date(document.getElementById('startDate').value).toISOString(),
                endDate: new Date(document.getElementById('endDate').value).toISOString(),
                reason: document.getElementById('description').value
            };

            if (!leaveData.leaveTypeId || !leaveData.startDate || !leaveData.endDate || !leaveData.reason) {
                UI.showToast('กรุณากรอกข้อมูลให้ครบถ้วน', 'warning');
                return;
            }

            try {
                const created = await API.leaves.create(leaveData);
                UI.showToast('ส่งใบลาสำเร็จแล้ว!', 'success');

                // if server returned an id and we have uploaded files, try to upload them
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

                // reset and close
                leaveForm.reset();
                uploadedFiles = [];
                fileList.innerHTML = '';
                window.LeaveModal.close();

                // notify pages so they can refresh their data
                document.dispatchEvent(new CustomEvent('leaveSubmitted', { detail: { success: true, leave: created } }));
            } catch (error) {
                UI.showToast('ส่งใบลาไม่สำเร็จ: ' + error.message, 'error');
            }
        });

        // file handlers
        function handleFiles(files) {
            Array.from(files).forEach(file => {
                if (uploadedFiles.some(f => f.name === file.name)) return;
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

                // attach remove handler
                fileItem.querySelector('.file-remove-btn').addEventListener('click', () => removeFile(file.name));

                fileList.appendChild(fileItem);
            });
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
            const type = document.getElementById('leaveType').value;
            const attachment = document.getElementById('attachmentSection');

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
                    alert("ลาป่วยเกิน 3 วัน กรุณาแนบใบรับรองแพทย์ ");
                }

                const leadTime = Math.ceil((start - today) / (1000 * 60 * 60 * 24));
                if (key === 'personal' && leadTime < 3) {
                    alert("ลากิจส่วนตัวต้องแจ้งล่วงหน้าอย่างน้อย 3 วัน ");
                } else if (key === 'annual' && leadTime < 7) {
                    alert("ลาพักผ่อนต้องแจ้งล่วงหน้าอย่างน้อย 7 วัน ");
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
                else if (name.includes('ordination') || name.includes('ลาบวช')) leaveTypeMap[id] = 'ordination';
                else leaveTypeMap[id] = 'other';
            });
        }

        async function uploadFiles(leaveId, files) {
            // Try a conventional endpoint for attachments
            const url = `${API.baseUrl}/api/LeaveRequests/${leaveId}/attachments`;
            const token = localStorage.getItem('token');
            const form = new FormData();
            files.forEach(f => form.append('files', f));

            const res = await fetch(url, {
                method: 'POST',
                headers: {
                    'Authorization': token ? `Bearer ${token}` : ''
                },
                body: form
            });

            if (!res.ok) {
                throw new Error(`Upload failed: ${res.status}`);
            }
            return res.json();
        }
    }

    // inject on DOMContentLoaded so pages don't have to include modal markup
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', injectModal);
    } else {
        injectModal();
    }

})();
