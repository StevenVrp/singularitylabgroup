const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
let recognition;

document.addEventListener('DOMContentLoaded', () => {
    // Nav Buttons
    const homeBtn = document.getElementById('homeBtn');
    const graphBtn = document.getElementById('graphBtn');
    const elementsBtn = document.getElementById('elementsBtn');
    const showTimerBtn = document.getElementById('showTimerBtn');
    const resetAllBtn = document.getElementById('resetAllBtn');
    const settingsButton = document.getElementById('settingsButton');
    const backBtn = document.getElementById('backBtn');
    const backFromRemindersBtn = document.getElementById('backFromRemindersBtn');

    // Sections
    const taskSection = document.getElementById('taskSection');
    const graphSection = document.getElementById('graphSection');
    const remindersSection = document.getElementById('remindersSection');
    const elementsSection = document.getElementById('elementsSection');
    const elementSearchContainer = document.getElementById('elementSearchContainer');

    // Task Elements
    const taskForm = document.getElementById('taskForm');
    const taskInput = document.getElementById('taskInput');
    const prioritySelect = document.getElementById('prioritySelect');
    const subjectSelect = document.getElementById('subjectSelect');
    const taskList = document.getElementById('taskList');
    const dataDisplay = document.getElementById('dataDisplay');

    // Reminders Elements
    const reminderForm = document.getElementById('reminderForm');
    const reminderInput = document.getElementById('reminderInput');
    const reminderDueDate = document.getElementById('reminderDueDate');
    const remindersList = document.getElementById('remindersList');
    const countdownDisplay = document.getElementById('countdownDisplay');

    // Timer Elements
    const floatingTimer = document.getElementById('floatingTimer');
    const toggleTimerBtn = document.getElementById('toggleTimerBtn');
    const closeTimerBtn = document.getElementById('closeTimerBtn');
    const hoursInput = document.getElementById('hoursInput');
    const minutesInput = document.getElementById('minutesInput');
    const secondsInput = document.getElementById('secondsInput');
    const timerDisplay = document.getElementById('timerDisplay');
    const startTimerBtn = document.getElementById('startTimerBtn');
    const resetTimerBtn = document.getElementById('resetTimerBtn');

    // Voice Control Elements
    const voiceStatus = document.getElementById('voiceStatus');
    const voiceWave = document.getElementById('voiceWave');
    const voiceResponse = document.getElementById('voiceResponse');
    const waveBars = document.querySelectorAll('.wave-bar');

    // Chart Download Buttons
    const downloadLgBtn = document.createElement('button');
    downloadLgBtn.id = 'downloadLgBtn';
    downloadLgBtn.className = 'btn download-btn';
    downloadLgBtn.style.color = 'white';
    downloadLgBtn.innerHTML = '<i class="fas fa-download"></i> Download Graph';
    downloadLgBtn.style.background = 'linear-gradient(135deg, #4CAF50 0%, #2E7D32 100%)';
    const lineGraphContainer = document.querySelectorAll('.chart-container')[0];
    if (lineGraphContainer) lineGraphContainer.appendChild(downloadLgBtn);

    const downloadPgBtn = document.createElement('button');
    downloadPgBtn.id = 'downloadPgBtn';
    downloadPgBtn.className = 'btn download-btn';
    downloadPgBtn.style.color = 'white';
    downloadPgBtn.innerHTML = '<i class="fas fa-download"></i> Download Graph';
    downloadPgBtn.style.background = 'linear-gradient(135deg, #4CAF50 0%, #2E7D32 100%)';
    const pieGraphContainer = document.querySelectorAll('.chart-container')[1];
    if (pieGraphContainer) pieGraphContainer.appendChild(downloadPgBtn);

    // Persistent Data State
    let tasks = JSON.parse(localStorage.getItem('tasks')) || [];
    let reminders = JSON.parse(localStorage.getItem('reminders')) || [];
    let efficiencyData = JSON.parse(localStorage.getItem('efficiencyData')) || [];
    let activityTimers = {};
    let lastEfficiencyUpdate = Date.now();

    // Timer Variables
    let timerInterval;
    let timerRunning = false;
    let totalSeconds = 0;
    let timerVisible = true;

    // Settings
    let settings = {
        darkMode: false,
        targetCompletionTime: 30,
        appMode: 'focus'
    };

    let efficiencyChart = null;
    let subjectChart = null;

    // View Navigation Logic
    const showSection = (sectionName) => {
        taskSection.style.display = 'none';
        graphSection.style.display = 'none';
        remindersSection.style.display = 'none';
        elementsSection.style.display = 'none';
        elementSearchContainer.style.display = 'none';

        if (sectionName === 'home') {
            taskSection.style.display = 'block';
        } else if (sectionName === 'stats') {
            graphSection.style.display = 'block';
            initCharts();
            updateDataDisplay();
        } else if (sectionName === 'reminders') {
            remindersSection.style.display = 'block';
            renderReminders();
        } else if (sectionName === 'elements') {
            elementsSection.style.display = 'block';
            elementSearchContainer.style.display = 'block';
        }
    };

    homeBtn.addEventListener('click', () => showSection('home'));
    graphBtn.addEventListener('click', () => showSection('stats'));
    elementsBtn.addEventListener('click', () => showSection('elements'));
    if (backBtn) backBtn.addEventListener('click', () => showSection('home'));
    if (backFromRemindersBtn) backFromRemindersBtn.addEventListener('click', () => showSection('home'));

    // Charts Implementation
    const downloadLineGraph = () => {
        const canvas = document.getElementById('efficiencyChart');
        const image = canvas.toDataURL('image/png', 1.0);
        const link = document.createElement('a');
        link.download = 'productivity-graph-' + new Date().toISOString().slice(0, 10) + '.png';
        link.href = image;
        link.click();
    };

    const downloadPieGraph = () => {
        const canvas = document.getElementById('subjectChart');
        const image = canvas.toDataURL('image/png', 1.0);
        const link = document.createElement('a');
        link.download = 'subject-graph-' + new Date().toISOString().slice(0, 10) + '.png';
        link.href = image;
        link.click();
    };

    downloadLgBtn.addEventListener('click', downloadLineGraph);
    downloadPgBtn.addEventListener('click', downloadPieGraph);

    const initCharts = () => {
        if (typeof Chart === 'undefined') return;
        const efficiencyCanvas = document.getElementById('efficiencyChart');
        const subjectCanvas = document.getElementById('subjectChart');
        if (!efficiencyCanvas || !subjectCanvas) return;

        if (efficiencyChart) efficiencyChart.destroy();
        const efficiencyCtx = efficiencyCanvas.getContext('2d');
        efficiencyChart = new Chart(efficiencyCtx, {
            type: 'line',
            data: {
                labels: efficiencyData.map(d => new Date(d.timestamp).toLocaleTimeString()),
                datasets: [{
                    label: 'Progress %',
                    data: efficiencyData.map(d => d.efficiency),
                    borderColor: '#6c5ce7',
                    backgroundColor: 'rgba(108, 92, 231, 0.1)',
                    tension: 0.3,
                    borderWidth: 2
                }]
            },
            options: {
                responsive: true,
                scales: { y: { min: 0, max: 100 } }
            }
        });

        if (subjectChart) subjectChart.destroy();
        const subjectCtx = subjectCanvas.getContext('2d');
        const subjectTime = {};
        tasks.forEach(task => {
            if (task.completed) {
                subjectTime[task.subject] = (subjectTime[task.subject] || 0) + (task.timeSpent || 10);
            }
        });

        const subjects = Object.keys(subjectTime);
        const timeData = subjects.map(s => subjectTime[s]);
        
        subjectChart = new Chart(subjectCtx, {
            type: 'pie',
            data: {
                labels: subjects.map(s => s.charAt(0).toUpperCase() + s.slice(1)),
                datasets: [{
                    data: timeData,
                    backgroundColor: ['#00b894','#0984e3','#6c5ce7','#e84393','#fd79a8','#e17055','#fdcb6e','#a29bfe','#636e72','#00cec9']
                }]
            },
            options: { responsive: true }
        });
    };

    const updateDataDisplay = () => {
        const completedTasks = tasks.filter(t => t.completed);
        const pendingTasks = tasks.filter(t => !t.completed);
        
        dataDisplay.innerHTML = `
            <h3>Progress (Updated: ${new Date().toLocaleTimeString()})</h3>
            <p>Total Activities: ${tasks.length}</p>
            <p>Completed: ${completedTasks.length} (${tasks.length ? Math.round((completedTasks.length / tasks.length) * 100) : 0}%)</p>
            <p>Pending: ${pendingTasks.length} (${tasks.length ? Math.round((pendingTasks.length / tasks.length) * 100) : 0}%)</p>
        `;
    };

    // Task Logic
    const renderTasks = () => {
        document.body.classList.remove('schedule-mode', 'focus-mode');
        document.body.classList.add(`${settings.appMode}-mode`);
        
        if (settings.appMode === 'schedule') {
            tasks.sort((a, b) => (a.timeSlot?.start || '').localeCompare(b.timeSlot?.start || ''));
        } else {
            const priorityOrder = { high: 3, medium: 2, low: 1 };
            tasks.sort((a, b) => (priorityOrder[b.priority] || 0) - (priorityOrder[a.priority] || 0));
        }

        taskList.innerHTML = tasks.map(task => `
            <li class="task-item ${task.completed ? 'task-completed' : ''}" data-id="${task.id}">
                <input type="checkbox" class="task-checkbox" ${task.completed ? 'checked' : ''}>
                <div class="task-content">
                    <span class="task-title">${task.title}</span>
                    <div class="task-meta">
                        <span class="task-priority priority-${task.priority || 'medium'}">
                            <i class="fas fa-exclamation-circle"></i> ${task.priority || 'Medium'}
                        </span>
                        <span class="task-subject">
                            <i class="fas fa-tag"></i> ${task.subject ? task.subject.toUpperCase() : 'OTHER'}
                        </span>
                    </div>
                </div>
                <div class="task-actions">
                    <button class="btn btn-icon btn-secondary delete-btn"><i class="fas fa-trash-alt"></i></button>
                </div>
            </li>
        `).join('');

        document.querySelectorAll('.task-checkbox').forEach(cb => {
            cb.addEventListener('change', handleComplete);
        });
        document.querySelectorAll('.delete-btn').forEach(btn => {
            btn.addEventListener('click', handleDelete);
        });

        const countEl = document.getElementById('taskCount');
        if (countEl) {
            const remaining = tasks.filter(t => !t.completed).length;
            countEl.textContent = `${remaining} remaining`;
        }
    };

    const handleComplete = (e) => {
        const taskId = e.target.closest('.task-item').dataset.id;
        const task = tasks.find(t => t.id.toString() === taskId);
        if (task) {
            task.completed = e.target.checked;
            task.completedAt = task.completed ? new Date() : null;
            saveData();
            renderTasks();
            updateEfficiency(true);
        }
    };

    const handleDelete = (e) => {
        const taskId = e.target.closest('.task-item').dataset.id;
        tasks = tasks.filter(t => t.id.toString() !== taskId);
        saveData();
        renderTasks();
        updateEfficiency(true);
    };

    taskForm.addEventListener('submit', (e) => {
        e.preventDefault();
        const title = taskInput.value.trim();
        if (title) {
            tasks.push({
                id: Date.now(),
                title,
                subject: subjectSelect.value,
                priority: prioritySelect.value,
                completed: false,
                createdAt: new Date()
            });
            taskInput.value = '';
            saveData();
            renderTasks();
            updateEfficiency(true);
        }
    });

    const updateEfficiency = (triggeredByCompletion = false) => {
        const now = Date.now();
        const activeTasks = tasks.filter(t => !t.completed);
        const efficiency = Math.min(Math.round((settings.targetCompletionTime / 30) * 100), 100);

        efficiencyData.push({ timestamp: new Date(), efficiency, activeTasks: activeTasks.length });
        if (efficiencyData.length > 100) efficiencyData = efficiencyData.slice(-100);

        saveData();
        if (graphSection.style.display === 'block') initCharts();
    };

    // Reminders Logic
    const renderReminders = () => {
        if (!remindersList) return;
        remindersList.innerHTML = reminders.map(r => `
            <div class="reminder-item" style="padding: 0.75rem; border-left: 4px solid var(--primary); margin-bottom: 0.5rem; background: var(--card);">
                <div><strong>${r.text}</strong></div>
                <small style="color: var(--text-light);">Due: ${new Date(r.dueDate).toLocaleString()}</small>
            </div>
        `).join('');
    };

    reminderForm.addEventListener('submit', (e) => {
        e.preventDefault();
        if (reminderInput.value && reminderDueDate.value) {
            reminders.push({ id: Date.now(), text: reminderInput.value, dueDate: reminderDueDate.value });
            reminderInput.value = '';
            reminderDueDate.value = '';
            saveData();
            renderReminders();
        }
    });

    // Timer Implementation
    const updateTimerDisplay = () => {
        const h = Math.floor(totalSeconds / 3600);
        const m = Math.floor((totalSeconds % 3600) / 60);
        const s = totalSeconds % 60;
        timerDisplay.textContent = `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
    };

    const startTimer = () => {
        if (timerRunning) return;
        const h = parseInt(hoursInput.value) || 0;
        const m = parseInt(minutesInput.value) || 0;
        const s = parseInt(secondsInput.value) || 0;
        totalSeconds = h * 3600 + m * 60 + s;
        if (totalSeconds <= 0) return;

        timerRunning = true;
        startTimerBtn.innerHTML = '<i class="fas fa-pause"></i> Pause';
        timerInterval = setInterval(() => {
            if (totalSeconds > 0) {
                totalSeconds--;
                updateTimerDisplay();
            } else {
                clearInterval(timerInterval);
                timerRunning = false;
                startTimerBtn.innerHTML = '<i class="fas fa-play"></i> Start';
            }
        }, 1000);
    };

    startTimerBtn.addEventListener('click', () => {
        if (timerRunning) {
            clearInterval(timerInterval);
            timerRunning = false;
            startTimerBtn.innerHTML = '<i class="fas fa-play"></i> Start';
        } else {
            startTimer();
        }
    });

    resetTimerBtn.addEventListener('click', () => {
        clearInterval(timerInterval);
        timerRunning = false;
        totalSeconds = 0;
        updateTimerDisplay();
        startTimerBtn.innerHTML = '<i class="fas fa-play"></i> Start';
    });

    showTimerBtn.addEventListener('click', () => floatingTimer.style.display = 'block');
    closeTimerBtn.addEventListener('click', () => floatingTimer.style.display = 'none');

    // Settings Modal & Dark Mode Synchronization
    const settingsModal = document.getElementById('settingsModal');
    const settingsClose = document.getElementById('settingsClose');
    const settingsSave = document.getElementById('settingsSave');
    const darkModeToggle = document.getElementById('darkModeToggle');

    settingsButton.addEventListener('click', () => settingsModal.classList.add('active'));
    settingsClose.addEventListener('click', () => settingsModal.classList.remove('active'));

    const applySettings = () => {
        if (settings.darkMode) {
            document.body.classList.add('dark-mode');
        } else {
            document.body.classList.remove('dark-mode');
        }
        darkModeToggle.checked = settings.darkMode;
    };

    settingsSave.addEventListener('click', () => {
        settings.darkMode = darkModeToggle.checked;
        settings.appMode = document.getElementById('appModeSelect').value;
        settings.targetCompletionTime = parseInt(document.getElementById('targetCompletionTime').value) || 30;
        
        localStorage.setItem('studyAssistantSettings', JSON.stringify(settings));
        applySettings();
        renderTasks();
        settingsModal.classList.remove('active');
    });

    const resetAllData = () => {
        if (confirm('Delete all tasks, reminders, and efficiency data?')) {
            tasks = [];
            reminders = [];
            efficiencyData = [];
            saveData();
            renderTasks();
            renderReminders();
            if (graphSection.style.display === 'block') initCharts();
        }
    };
    resetAllBtn.addEventListener('click', resetAllData);

    const saveData = () => {
        localStorage.setItem('tasks', JSON.stringify(tasks));
        localStorage.setItem('reminders', JSON.stringify(reminders));
        localStorage.setItem('efficiencyData', JSON.stringify(efficiencyData));
    };

    // ==========================================
    // ===== Periodic Table Logic (File 3) ======
    // ==========================================
    const ELEMENTS = [{"z": 1, "sym": "H", "name": "Hydrogen", "cat": "nonmetal", "group": 1, "period": 1, "mass": "1.008", "x": 1, "y": 1, "config": "1s¹", "valence": "1", "charge": "+1", "radius": 31, "en": 2.2, "ion": 1312}, {"z": 2, "sym": "He", "name": "Helium", "cat": "noble", "group": 18, "period": 1, "mass": "4.0026", "x": 18, "y": 1, "config": "1s²", "valence": "2", "charge": "0", "radius": 28, "en": null, "ion": 2372}, {"z": 3, "sym": "Li", "name": "Lithium", "cat": "alkali", "group": 1, "period": 2, "mass": "6.94", "x": 1, "y": 2, "config": "1s² 2s¹", "valence": "1", "charge": "+1", "radius": 128, "en": 0.98, "ion": 520}, {"z": 4, "sym": "Be", "name": "Beryllium", "cat": "alkaline", "group": 2, "period": 2, "mass": "9.0122", "x": 2, "y": 2, "config": "1s² 2s²", "valence": "2", "charge": "+2", "radius": 96, "en": 1.57, "ion": 899}, {"z": 5, "sym": "B", "name": "Boron", "cat": "metalloid", "group": 13, "period": 2, "mass": "10.81", "x": 13, "y": 2, "config": "1s² 2s² 2p¹", "valence": "3", "charge": "+3", "radius": 84, "en": 2.04, "ion": 801}, {"z": 6, "sym": "C", "name": "Carbon", "cat": "nonmetal", "group": 14, "period": 2, "mass": "12.011", "x": 14, "y": 2, "config": "1s² 2s² 2p²", "valence": "4", "charge": "+4", "radius": 76, "en": 2.55, "ion": 1086}, {"z": 7, "sym": "N", "name": "Nitrogen", "cat": "nonmetal", "group": 15, "period": 2, "mass": "14.007", "x": 15, "y": 2, "config": "1s² 2s² 2p³", "valence": "5", "charge": "-3", "radius": 71, "en": 3.04, "ion": 1402}, {"z": 8, "sym": "O", "name": "Oxygen", "cat": "nonmetal", "group": 16, "period": 2, "mass": "15.999", "x": 16, "y": 2, "config": "1s² 2s² 2p⁴", "valence": "6", "charge": "-2", "radius": 66, "en": 3.44, "ion": 1314}, {"z": 9, "sym": "F", "name": "Fluorine", "cat": "halogen", "group": 17, "period": 2, "mass": "18.998", "x": 17, "y": 2, "config": "1s² 2s² 2p⁵", "valence": "7", "charge": "-1", "radius": 57, "en": 3.98, "ion": 1681}, {"z": 10, "sym": "Ne", "name": "Neon", "cat": "noble", "group": 18, "period": 2, "mass": "20.180", "x": 18, "y": 2, "config": "1s² 2s² 2p⁶", "valence": "8", "charge": "0", "radius": 58, "en": null, "ion": 2081}, {"z": 11, "sym": "Na", "name": "Sodium", "cat": "alkali", "group": 1, "period": 3, "mass": "22.990", "x": 1, "y": 3, "config": "1s² 2s² 2p⁶ 3s¹", "valence": "1", "charge": "+1", "radius": 166, "en": 0.93, "ion": 496}, {"z": 12, "sym": "Mg", "name": "Magnesium", "cat": "alkaline", "group": 2, "period": 3, "mass": "24.305", "x": 2, "y": 3, "config": "1s² 2s² 2p⁶ 3s²", "valence": "2", "charge": "+2", "radius": 141, "en": 1.31, "ion": 738}, {"z": 13, "sym": "Al", "name": "Aluminium", "cat": "posttransition", "group": 13, "period": 3, "mass": "26.982", "x": 13, "y": 3, "config": "1s² 2s² 2p⁶ 3s² 3p¹", "valence": "3", "charge": "+3", "radius": 121, "en": 1.61, "ion": 578}, {"z": 14, "sym": "Si", "name": "Silicon", "cat": "metalloid", "group": 14, "period": 3, "mass": "28.085", "x": 14, "y": 3, "config": "1s² 2s² 2p⁶ 3s² 3p²", "valence": "4", "charge": "+4", "radius": 111, "en": 1.9, "ion": 787}, {"z": 15, "sym": "P", "name": "Phosphorus", "cat": "nonmetal", "group": 15, "period": 3, "mass": "30.974", "x": 15, "y": 3, "config": "1s² 2s² 2p⁶ 3s² 3p³", "valence": "5", "charge": "-3", "radius": 107, "en": 2.19, "ion": 1012}, {"z": 16, "sym": "S", "name": "Sulfur", "cat": "nonmetal", "group": 16, "period": 3, "mass": "32.06", "x": 16, "y": 3, "config": "1s² 2s² 2p⁶ 3s² 3p⁴", "valence": "6", "charge": "-2", "radius": 105, "en": 2.58, "ion": 1000}, {"z": 17, "sym": "Cl", "name": "Chlorine", "cat": "halogen", "group": 17, "period": 3, "mass": "35.45", "x": 17, "y": 3, "config": "1s² 2s² 2p⁶ 3s² 3p⁵", "valence": "7", "charge": "-1", "radius": 102, "en": 3.16, "ion": 1251}, {"z": 18, "sym": "Ar", "name": "Argon", "cat": "noble", "group": 18, "period": 3, "mass": "39.948", "x": 18, "y": 3, "config": "1s² 2s² 2p⁶ 3s² 3p⁶", "valence": "8", "charge": "0", "radius": 106, "en": null, "ion": 1521}];

    const COLORS = {"alkali": "#F7C1C1", "alkaline": "#FAC775", "transition": "#B5D4F4", "posttransition": "#CECBF6", "metalloid": "#9FE1CB", "nonmetal": "#C7EEDD", "halogen": "#F4C0D1", "noble": "#C0DD97", "lanthanide": "#AFA9EC", "actinide": "#ED93B1"};
    const LABELS = {"alkali": "Alkali metal", "alkaline": "Alkaline earth", "transition": "Transition metal", "posttransition": "Post-transition", "metalloid": "Metalloid", "nonmetal": "Nonmetal", "halogen": "Halogen", "noble": "Noble gas"};

    const periodicTable = document.getElementById('periodicTable');
    const elementDetail = document.getElementById('elementDetail');
    const elementLegend = document.getElementById('elementLegend');
    const elementSearch = document.getElementById('elementSearch');
    const tip = document.getElementById('tooltip');
    const elementCells = [];

    const initPeriodicTable = () => {
        if (!periodicTable) return;
        periodicTable.innerHTML = '';
        elementCells.length = 0;

        ELEMENTS.forEach(el => {
            const d = document.createElement('div');
            d.className = 'cell';
            d.style.gridColumn = el.x;
            d.style.gridRow = el.y;
            d.style.background = COLORS[el.cat] || '#eee';
            d.innerHTML = `<div class="z">${el.z}</div><div class="s">${el.sym}</div><div class="v"></div>`;
            d.onclick = () => showElementDetail(el);
            d.onmouseenter = () => showElementTip(el, d);
            d.onmouseleave = () => { tip.style.display = 'none'; };
            d._el = el;
            elementCells.push(d);
            periodicTable.appendChild(d);
        });

        // Legend
        elementLegend.innerHTML = '';
        Object.keys(LABELS).forEach(k => {
            const item = document.createElement('div');
            item.innerHTML = `<span class="sw" style="background:${COLORS[k]}"></span>${LABELS[k]}`;
            elementLegend.appendChild(item);
        });
    };

    const showElementDetail = (el) => {
        elementDetail.innerHTML = `
            <h2>${el.name} (${el.sym})</h2>
            <div class="meta">Atomic Number ${el.z} · ${LABELS[el.cat] || el.cat}</div>
            <div class="row"><span>Atomic Mass</span><span>${el.mass}</span></div>
            <div class="row"><span>Group</span><span>${el.group}</span></div>
            <div class="row"><span>Period</span><span>${el.period}</span></div>
            <div class="row"><span>Valence e⁻</span><span class="big">${el.valence}</span></div>
            <div class="row"><span>Charge</span><span class="big">${el.charge}</span></div>
            <div class="config-section">
                <div class="cfg-label">Ground State Config</div>
                <div class="cfg-ground">${el.config}</div>
            </div>
        `;
    };

    const showElementTip = (el, cell) => {
        tip.innerHTML = `
            <div class="tname">${el.name} (${el.sym})</div>
            <div class="tmeta">#${el.z} · ${LABELS[el.cat] || el.cat}</div>
            Valence: <b>${el.valence}</b> | Charge: <b>${el.charge}</b>
        `;
        tip.style.display = 'block';
        const r = cell.getBoundingClientRect();
        tip.style.left = `${Math.max(8, r.left + r.width / 2 - 50)}px`;
        tip.style.top = `${r.top - 50}px`;
    };

    elementSearch.addEventListener('input', () => {
        const q = elementSearch.value.trim().toLowerCase();
        elementCells.forEach(c => {
            c.classList.remove('highlight', 'dim');
            const e = c._el;
            const hit = q && (e.sym.toLowerCase() === q || e.name.toLowerCase().includes(q) || String(e.z) === q);
            if (hit) {
                c.classList.add('highlight');
            } else if (q) {
                c.classList.add('dim');
            }
        });
    });

    // Initialize Application
    const init = () => {
        const savedSettings = localStorage.getItem('studyAssistantSettings');
        if (savedSettings) {
            try { settings = JSON.parse(savedSettings); } catch (e) {}
        }
        applySettings();
        renderTasks();
        renderReminders();
        initPeriodicTable();
        updateTimerDisplay();
    };

    init();
});