const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
let recognition;
document.addEventListener('DOMContentLoaded', () => {
    // Elements
    const taskForm = document.getElementById('taskForm');
    const taskInput = document.getElementById('taskInput');
    const prioritySelect = document.getElementById('prioritySelect');
    const subjectSelect = document.getElementById('subjectSelect');
    const taskList = document.getElementById('taskList');
    const graphBtn = document.getElementById('graphBtn');
    const remindersBtn = document.getElementById('remindersBtn');
    const resetAllBtn = document.getElementById('resetAllBtn');
    const showTimerBtn = document.getElementById('showTimerBtn');
    const backBtn = document.getElementById('backBtn');
    const taskSection = document.getElementById('taskSection');
    const graphSection = document.getElementById('graphSection');
    const dataDisplay = document.getElementById('dataDisplay');
    const remindersSection = document.getElementById('remindersSection');
    const backFromRemindersBtn = document.getElementById('backFromRemindersBtn');
    const reminderForm = document.getElementById('reminderForm');
    const reminderInput = document.getElementById('reminderInput');
    const reminderDueDate = document.getElementById('reminderDueDate');
    const remindersList = document.getElementById('remindersList');
    const countdownDisplay = document.getElementById('countdownDisplay');
    
    // Timer elements
    const floatingTimer = document.getElementById('floatingTimer');
    const toggleTimerBtn = document.getElementById('toggleTimerBtn');
    const closeTimerBtn = document.getElementById('closeTimerBtn');
    const hoursInput = document.getElementById('hoursInput');
    const minutesInput = document.getElementById('minutesInput');
    const secondsInput = document.getElementById('secondsInput');
    const timerDisplay = document.getElementById('timerDisplay');
    const startTimerBtn = document.getElementById('startTimerBtn');
    const resetTimerBtn = document.getElementById('resetTimerBtn');
    
    // Voice control elements
    const voiceControl = document.getElementById('voiceControl');
    const voiceStatus = document.getElementById('voiceStatus');
    const voiceWave = document.getElementById('voiceWave');
    const voiceResponse = document.getElementById('voiceResponse');
    const waveBars = document.querySelectorAll('.wave-bar');
    // Add Download Button
    const downloadLgBtn = document.createElement('button');
    downloadLgBtn.id = 'downloadLgBtn';
    downloadLgBtn.className = 'btn download-btn';
    downloadLgBtn.style.color = 'white';
    downloadLgBtn.innerHTML = '<i class="fas fa-download"></i> Download Graph';
    downloadLgBtn.style.background = 'linear-gradient(135deg, #4CAF50 0%, #2E7D32 100%)';
    const lineGraphContainer = document.querySelectorAll('.chart-container')[0];
    lineGraphContainer.appendChild(downloadLgBtn);
    // Add Download Button
    const downloadPgBtn = document.createElement('button');
    downloadPgBtn.id = 'downloadPgBtn';
    downloadPgBtn.className = 'btn download-btn';
    downloadPgBtn.style.color = 'white';
    downloadPgBtn.innerHTML = '<i class="fas fa-download"></i> Download Graph';
    downloadPgBtn.style.background = 'linear-gradient(135deg, #4CAF50 0%, #2E7D32 100%)';
    const pieGraphContainer = document.querySelectorAll('.chart-container')[1];
    pieGraphContainer.appendChild(downloadPgBtn);
    // Data
    let tasks = JSON.parse(localStorage.getItem('tasks')) || [];
    let reminders = JSON.parse(localStorage.getItem('reminders')) || [];
    let efficiencyData = JSON.parse(localStorage.getItem('efficiencyData')) || [];
    let activityTimers = {};
    let lastEfficiencyUpdate = Date.now();
    
    // Timer variables
    let timerInterval;
    let timerRunning = false;
    let totalSeconds = 0;
    let timerVisible = true;

    // Voice control variables
    let isListening = false;
    const speechSynthesis = window.speechSynthesis;
    const triggerPhrase = 'study assistant';
    let triggerActive = false;

    // Initialize Charts
    let efficiencyChart = null;
    let subjectChart = null;
    // Download Graph as Image
    const downloadLineGraph = () => {
        const canvas = document.getElementById('efficiencyChart');
        const image = canvas.toDataURL('image/png', 1.0);
        const link = document.createElement('a');
        link.download = 'productivity-graph-' + new Date().toISOString().slice(0,10) + '.png';
        link.href = image;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };
    const bindTaskEvents = () => {
        // Checkbox events
        document.querySelectorAll('.task-checkbox').forEach(checkbox => {
            checkbox.addEventListener('change', handleComplete);
        });
    
        // Delete buttons
        document.querySelectorAll('.delete-btn').forEach(btn => {
            btn.addEventListener('click', handleDelete);
        });
    
        // Edit buttons
        document.querySelectorAll('.edit-btn').forEach(btn => {
            btn.addEventListener('click', function() {
                const taskId = this.closest('.task-item').dataset.id;
                editTask(taskId);
            });
        });
    };
    const downloadPieGraph = () => {
        const canvas = document.getElementById('subjectChart');
        const image = canvas.toDataURL('image/png', 1.0);
        const link = document.createElement('a');
        link.download = 'subject-graph-' + new Date().toISOString().slice(0,10) + '.png';
        link.href = image;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    const initCharts = () => {
        // Check if Chart.js is loaded
        if (typeof Chart === 'undefined') {
            console.error('Chart.js is not loaded');
            return;
        }
        const efficiencyCanvas = document.getElementById('efficiencyChart');
        const subjectCanvas = document.getElementById('subjectChart');
    
        if (!efficiencyCanvas || !subjectCanvas) {
            console.error('Canvas elements not found');
            return;
        }
        // Efficiency Chart (Line)
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
                    borderWidth: 2,
                    pointRadius: 3,
                    pointHoverRadius: 5
                    
                }]
            },
            options: {
                responsive: true,
                plugins: {
                    title: {
                        display: true,
                        text: 'Efficiency Over Time',
                        font: {
                            size: 14
                        }
                    }
                },
                scales: { y: { min: 0, max: 100 } },
                animation: {
                    duration: 1000
                }
            }
        });
    
        // Subject Chart (Pie)
        if (subjectChart) subjectChart.destroy();
        const subjectCtx = subjectCanvas.getContext('2d');
        const subjectTime = {};
        tasks.forEach(task => {
            if (task.completed) {
                subjectTime[task.subject] = (subjectTime[task.subject] || 0) + task.timeSpent;
            }
        });
    
        const subjects = Object.keys(subjectTime);
        const timeData = subjects.map(subject => subjectTime[subject]);
        const backgroundColors = subjects.map(subject => {
            switch (subject) {
                case 'biology': return '#00b894';
                case 'physics': return '#0984e3';
                case 'chemistry': return '#6c5ce7';
                case 'math': return '#e84393';
                case 'english': return '#fd79a8';
                case 'chinese': return '#e17055';
                case 'spanish': return '#fdcb6e';
                case 'french': return '#a29bfe';
                case 'history': return '#636e72';
                case 'geography': return '#00cec9';
                case 'technology': return '#2d3436';
                case 'music': return '#fab1a0';
                case 'business': return '#000367';
                case 'other': return '#dfe6e9';
                default: return '#dfe6e9'; // Fallback color
            }
        });
    
        subjectChart = new Chart(subjectCtx, {
            type: 'pie',
            data: {
                labels: subjects.map(subject => subject.charAt(0).toUpperCase() + subject.slice(1)),
                datasets: [{
                    data: timeData,
                    backgroundColor: backgroundColors,
                    borderWidth: 1,
                    radius: '100%'
                }]
            },
            options: {
                responsive: true,
                plugins: {
                    legend: {
                        position: 'right',
                    },
                    title: {
                        display: true,
                        text: 'Time Spent by Subject (minutes)',
                        font: {
                            size: 14
                        }
                    }
                },
                animation: {
                    animateScale: true,
                    animateRotate: true
                }
            }
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
            <h4>Recent Efficiency Data</h4>
            <pre>${JSON.stringify(efficiencyData.slice(-5), null, 2)}</pre>
        `;
    };


    // Completion Animation
    const showCompletionAnimation = (taskElement) => {
        taskElement.classList.add('completed-animation');
        setTimeout(() => {
            taskElement.classList.remove('completed-animation');
        }, 2000);
    };

    // Efficiency Calculation
    const updateEfficiency = (triggeredByCompletion = false) => {
        const now = Date.now();
        
        // Update all ongoing task timers
        tasks.forEach(task => {
            if (!task.completed) {
                activityTimers[task.id] = (now - new Date(task.createdAt).getTime()) / 60000;
            }
        });

        // Only record every 5 minutes unless a task was just completed
        if (!triggeredByCompletion && (now - lastEfficiencyUpdate < 5 * 60 * 1000)) {
            return;
        }

        const activeTasks = tasks.filter(t => !t.completed);
        let avgTime = settings.targetCompletionTime; // Default if no active tasks
        
        if (activeTasks.length > 0) {
            const totalTime = activeTasks.reduce((sum, task) => sum + (activityTimers[task.id] || 0), 0);
            avgTime = totalTime / activeTasks.length;
        }

        const efficiency = Math.min(Math.round((settings.targetCompletionTime / Math.max(avgTime, 0.5)) * 100), 100);
        
        efficiencyData.push({
            timestamp: new Date(),
            efficiency,
            activeTasks: activeTasks.length,
            completedTasks: tasks.filter(t => t.completed).length
        });

        // Keep only last 100 data points
        if (efficiencyData.length > 100) {
            efficiencyData = efficiencyData.slice(-100);
        }

        lastEfficiencyUpdate = now;
        saveData();
        initCharts();
    };

    // Reset all data function
    const resetAllData = () => {
        if (confirm('This will delete all tasks and efficiency data. Are you sure?')) {
            tasks = [];
            reminders = [];
            efficiencyData = [];
            activityTimers = {};
            saveData();
            renderTasks();
            renderReminders();
            initCharts();
            updateDataDisplay();
        }
    };

    // Show timer function
    const showTimer = () => {
        floatingTimer.style.display = 'block';
    };

    // Auto-update every 5 minutes
    setInterval(() => updateEfficiency(false), 5 * 60 * 1000);

    const renderTasks = () => {
        // Apply correct mode classes
        document.body.classList.remove('schedule-mode', 'focus-mode');
        document.body.classList.add(`${settings.appMode}-mode`);
        
        // Sort tasks based on mode
        if (settings.appMode === 'schedule') {
            tasks.sort((a, b) => {
                if (!a.timeSlot && !b.timeSlot) return 0;
                if (!a.timeSlot) return 1;
                if (!b.timeSlot) return -1;
                return a.timeSlot.start.localeCompare(b.timeSlot.start);
            });
        } else {
            // Focus Mode - sort by priority
            const priorityOrder = { high: 3, medium: 2, low: 1 };
            tasks.sort((a, b) => (priorityOrder[b.priority] || 0) - (priorityOrder[a.priority] || 0));
        }

        taskList.innerHTML = tasks.map(task => {
            if (settings.appMode === 'schedule') {
                // Schedule Mode Layout
                return `
                    <li class="task-item ${task.completed ? 'task-completed' : ''}" data-id="${task.id}">
                        <input type="checkbox" class="task-checkbox" ${task.completed ? 'checked' : ''}>
                        <div class="task-time-range">
                            ${task.timeSlot?.start || '--:--'}${task.timeSlot?.end ? `-${task.timeSlot.end}` : ''}
                        </div>
                        <div class="task-content">
                            <span class="task-title">${task.title}</span>
                            <span class="task-subject subject-${task.subject}">
                                <i class="fas fa-tag"></i>
                                ${task.subject ? task.subject.charAt(0).toUpperCase() + task.subject.slice(1) : 'Other'}
                            </span>
                        </div>
                        <div class="task-actions">
                            <button class="btn btn-icon btn-secondary edit-btn">
                                <i class="fas fa-edit"></i>
                            </button>
                            <button class="btn btn-icon btn-secondary delete-btn">
                                <i class="fas fa-trash-alt"></i>
                            </button>
                        </div>
                    </li>
                `;
            // In your renderTasks() function, update the Focus Mode template:
            } else {
                // Focus Mode Layout
                return `
                    <li class="task-item ${task.completed ? 'task-completed' : ''}" data-id="${task.id}">
                        <input type="checkbox" class="task-checkbox" ${task.completed ? 'checked' : ''}>
                        <div class="task-content">
                            <span class="task-title">${task.title}</span>
                            <div class="task-meta">
                                <span class="task-priority priority-${task.priority}">
                                    <i class="fas fa-exclamation-circle"></i>
                                    ${task.priority ? task.priority.charAt(0).toUpperCase() + task.priority.slice(1) : 'None'}
                                </span>
                                <span class="task-subject subject-${task.subject}">
                                    <i class="fas fa-tag"></i>
                                    ${task.subject ? task.subject.charAt(0).toUpperCase() + task.subject.slice(1) : 'Other'}
                                </span>
                            </div>
                        </div>
                        <div class="task-actions">
                            <button class="btn btn-icon btn-secondary edit-btn">
                                <i class="fas fa-edit"></i>
                            </button>
                            <button class="btn btn-icon btn-secondary delete-btn">
                                <i class="fas fa-trash-alt"></i>
                            </button>
                        </div>
                    </li>
                `;
            }
        }).join('');

        // Rest of your event listeners...
        document.querySelectorAll('.task-checkbox').forEach(checkbox => {
            checkbox.addEventListener('change', handleComplete);
        });

        document.querySelectorAll('.delete-btn').forEach(btn => {
            btn.addEventListener('click', handleDelete);
        });

        document.querySelectorAll('.edit-btn').forEach(btn => {
            btn.addEventListener('click', function() {
                const taskId = this.closest('.task-item').dataset.id;
                editTask(taskId);
            });
        });
        // Context menu for task actions (complete all, clear completed, sorting options)
        document.querySelector('.task-list-header .btn-icon').addEventListener('click', function(e) {
            // Remove any existing menu first
            const existingMenu = document.querySelector('.task-context-menu');
            if (existingMenu) existingMenu.remove();
    
            // Create menu
            const menu = document.createElement('div');
            menu.className = 'task-context-menu';
            
            // Position menu relative to the button
            const buttonRect = this.getBoundingClientRect();
            menu.style.cssText = `
                position: fixed;
                left: ${buttonRect.left-50}px;
                top: ${buttonRect.bottom}px;
                background: var(--card);
                border-radius: var(--radius-md);
                box-shadow: var(--shadow-lg);
                z-index: 1000;
                min-width: 180px;
                overflow: hidden;
            `;
    
            // Menu items - modified to work with both modes
            const items = [
                {
                    icon: 'fas fa-check-circle',
                    text: 'Complete All',
                    action: () => {
                        tasks.forEach(t => {
                            if (!t.completed) {
                                t.completed = true;
                                t.completedAt = new Date();
                            }
                        });
                        saveData();
                        renderTasks();
                    }
                },
                {
                    icon: 'fas fa-trash-alt',
                    text: 'Clear Completed',
                    action: () => {
                        tasks = tasks.filter(t => !t.completed);
                        saveData();
                        renderTasks();
                    }
                },
                settings.appMode === 'focus' ? {
                    icon: 'fas fa-sort',
                    text: 'Sort by Priority',
                    action: () => {
                        const priorityOrder = { high: 3, medium: 2, low: 1 };
                        tasks.sort((a, b) => {
                            const priorityA = priorityOrder[a.priority] || 0;
                            const priorityB = priorityOrder[b.priority] || 0;
                            return priorityB - priorityA;
                        });
                        saveData();
                        renderTasks();
                    }
                } : {
                    icon: 'fas fa-sort',
                    text: 'Sort by Time',
                    action: () => {
                        tasks.sort((a, b) => {
                            if (!a.timeSlot && !b.timeSlot) return 0;
                            if (!a.timeSlot) return 1;
                            if (!b.timeSlot) return -1;
                            return a.timeSlot.start.localeCompare(b.timeSlot.start);
                        });
                        saveData();
                        renderTasks();
                    }
                },
                {
                    icon: 'fas fa-sort-alpha-down',
                    text: 'Sort by Subject',
                    action: () => {
                        tasks.sort((a, b) => a.subject.localeCompare(b.subject));
                        saveData();
                        renderTasks();
                    }
                },
                {
                    icon: 'fas fa-clock',
                    text: 'Sort by Date',
                    action: () => {
                        tasks.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
                        saveData();
                        renderTasks();
                    }
                }
            ].filter(Boolean); // Remove any null items from conditional menu options
    
            // Add items to menu
            items.forEach(item => {
                const button = document.createElement('button');
                button.className = 'menu-item';
                button.innerHTML = `<i class="${item.icon}"></i> ${item.text}`;
                button.addEventListener('click', () => {
                    item.action();
                    menu.remove();
                });
                menu.appendChild(button);
            });
    
            // Add to DOM
            document.body.appendChild(menu);
            
            // Close menu when clicking outside
            const closeMenu = (e) => {
                if (!menu.contains(e.target) && e.target !== this) {
                    menu.remove();
                    document.removeEventListener('click', closeMenu);
                }
            };
            
            setTimeout(() => {
                document.addEventListener('click', closeMenu);
            }, 0);
        });
    
        // Initialize drag and drop (works in both modes)
        setupDragAndDrop();
    
        // Update task count display
        updateTaskCount();
    };
    
    // Helper function to update the task count display
    function updateTaskCount() {
        const remaining = tasks.filter(t => !t.completed).length;
        const total = tasks.length;
        const countElement = document.getElementById('taskCount');
        
        if (countElement) {
            countElement.textContent = `${remaining} of ${total} tasks remaining`;
            countElement.style.color = remaining === 0 ? 'var(--completed)' : 
                                      remaining/total > 0.5 ? 'var(--high)' : 
                                      'var(--text-light)';
        }
    }
   
    // Drag and Drop Functionality
    const setupDragAndDrop = () => {
        const tasksElements = document.querySelectorAll('.task-item');
        
        tasksElements.forEach(task => {
            task.draggable = true;
            
            task.addEventListener('dragstart', function(e) {
                this.classList.add('dragging');
                e.dataTransfer.setData('text/plain', this.dataset.id);
            });
            
            task.addEventListener('dragend', function() {
                this.classList.remove('dragging');
            });
        });
        
        taskList.addEventListener('dragover', function(e) {
            e.preventDefault();
            const draggingItem = document.querySelector('.dragging');
            if (!draggingItem) return;
            
            const afterElement = getDragAfterElement(taskList, e.clientY);
            
            if (afterElement == null) {
                taskList.appendChild(draggingItem);
            } else {
                taskList.insertBefore(draggingItem, afterElement);
            }
        });
        
        taskList.addEventListener('drop', function(e) {
            e.preventDefault();
            const draggedId = e.dataTransfer.getData('text/plain');
            
            // Get new order
            const newOrder = Array.from(taskList.querySelectorAll('.task-item')).map(el => parseInt(el.dataset.id));
            
            // Update tasks array order
            const newTasks = [];
            newOrder.forEach(id => {
                const task = tasks.find(t => t.id === id);
                if (task) newTasks.push(task);
            });
            
            tasks = newTasks;
            saveData();
        });
    };

    const getDragAfterElement = (container, y) => {
        const draggableElements = [...container.querySelectorAll('.task-item:not(.dragging)')];
        
        return draggableElements.reduce((closest, child) => {
            const box = child.getBoundingClientRect();
            const offset = y - box.top - box.height / 2;
            
            if (offset < 0 && offset > closest.offset) {
                return { offset: offset, element: child };
            } else {
                return closest;
            }
        }, { offset: Number.NEGATIVE_INFINITY }).element;
    };

    const handleComplete = (e) => {
        const taskElement = e.target.closest('.task-item'); // Changed from '.task' to match your HTML
        const taskId = taskElement.dataset.id; // This is a string
        const task = tasks.find(t => t.id.toString() === taskId); // Compare as strings
        
        if (task) {
            task.completed = e.target.checked;
            task.completedAt = task.completed ? new Date() : null;
            
            if (task.completed) {
                // Record completion time
                activityTimers[task.id] = (new Date(task.completedAt) - new Date(task.createdAt)) / 60000;
                task.timeSpent = (new Date(task.completedAt) - new Date(task.createdAt)) / 60000;
                
                // Reset timers for all other tasks
                tasks.forEach(t => {
                    if (!t.completed) {
                        t.createdAt = new Date();
                        activityTimers[t.id] = 0;
                    }
                });
                
                showCompletionAnimation(taskElement);
            }
            
            saveData();
            renderTasks();
            updateEfficiency(true);
            
            // Refresh charts if in graph view
            if (graphSection.style.display === 'block') {
                initCharts();
            }
        }
    };

    const handleDelete = (e) => {
        // Get the task item element
        const taskElement = e.target.closest('.task-item'); // Changed from '.task' to '.task-item'
        
        // Get the ID as a string first
        const taskIdStr = taskElement.dataset.id;
        
        // Find the task - compare as strings or convert both to numbers consistently
        const taskIndex = tasks.findIndex(t => t.id.toString() === taskIdStr);
        
        if (taskIndex !== -1) {
            // Remove from array
            tasks.splice(taskIndex, 1);
            
            // Remove from activity timers if exists
            if (activityTimers[taskIdStr]) {
                delete activityTimers[taskIdStr];
            }
            
            // Save and re-render
            saveData();
            renderTasks();
            updateEfficiency(true);

        }
    };
    const editTask = (taskId) => {
        const task = tasks.find(t => t.id.toString() === taskId.toString());
        if (!task) return;
    
        const taskElement = document.querySelector(`.task-item[data-id="${taskId}"]`);
        if (!taskElement) return;
    
        // Add editing class for visual feedback
        taskElement.classList.add('editing');
    
        const titleElement = taskElement.querySelector('.task-title');
        const currentTitle = titleElement.textContent;
    
        // Create input field
        const input = document.createElement('input');
        input.type = 'text';
        input.value = currentTitle;
        input.className = 'task-edit-input';
        
        // Store original position and size
        const originalRect = titleElement.getBoundingClientRect();
        
        // Set initial styles for smooth transition
        input.style.position = 'absolute';
        input.style.left = `${originalRect.left}px`;
        input.style.top = `${originalRect.top}px`;
        input.style.width = `${originalRect.width}px`;
        input.style.height = `${originalRect.height}px`;
        input.style.opacity = '0';
        
        // Add to DOM
        document.body.appendChild(input);
        
        // Animate to final position
        requestAnimationFrame(() => {
            const finalRect = titleElement.getBoundingClientRect();
            
            input.style.transition = 'all 0.3s ease';
            input.style.left = `${finalRect.left}px`;
            input.style.top = `${finalRect.top}px`;
            input.style.width = `${finalRect.width}px`;
            input.style.height = `${finalRect.height}px`;
            input.style.opacity = '1';
            
            // After animation completes, replace the title
            setTimeout(() => {
                titleElement.style.visibility = 'hidden';
                input.style.position = 'static';
                input.style.transition = 'none';
                titleElement.replaceWith(input);
                input.focus();
            }, 300);
        });
    
        const saveEdit = () => {
            const newTitle = input.value.trim();
            
            // Animate back if cancelling
            if (!newTitle || newTitle === currentTitle) {
                const titleElement = document.createElement('span');
                titleElement.className = 'task-title';
                titleElement.textContent = currentTitle;
                titleElement.style.visibility = 'hidden';
                
                input.replaceWith(titleElement);
                titleElement.style.visibility = 'visible';
                taskElement.classList.remove('editing');
                return;
            }
    
            // Update task
            task.title = newTitle;
            saveData();
            
            // Create new title element with fade-in animation
            const newTitleElement = document.createElement('span');
            newTitleElement.className = 'task-title';
            newTitleElement.textContent = newTitle;
            newTitleElement.style.opacity = '0';
            newTitleElement.style.transition = 'opacity 0.3s ease';
            
            input.replaceWith(newTitleElement);
            
            requestAnimationFrame(() => {
                newTitleElement.style.opacity = '1';
            });
            
            taskElement.classList.remove('editing');
        };
    
        const handleKeyDown = (e) => {
            if (e.key === 'Enter') {
                saveEdit();
            } else if (e.key === 'Escape') {
                const titleElement = document.createElement('span');
                titleElement.className = 'task-title';
                titleElement.textContent = currentTitle;
                input.replaceWith(titleElement);
                taskElement.classList.remove('editing');
            }
        };
    
        input.addEventListener('blur', saveEdit);
        input.addEventListener('keydown', handleKeyDown);
    };

    // Reminder Functions
    const renderReminders = () => {
        if (!remindersList) return;
        remindersList.innerHTML = reminders.map(reminder => `
            <div class="reminder-item" data-id="${reminder.id}">
                <div class="reminder-text">${reminder.text}</div>
                <div class="reminder-due">
                    <i class="fas fa-clock"></i>
                    Due: ${new Date(reminder.dueDate).toLocaleString()}
                </div>
                <button class="delete-btn"><i class="fas fa-trash"></i></button>
            </div>
        `).join('');

        document.querySelectorAll('.reminder-item .delete-btn').forEach(btn => {
            btn.addEventListener('click', handleDeleteReminder);
        });

        updateCountdowns();
    };

    const handleDeleteReminder = (e) => {
        const reminderId = parseInt(e.target.closest('.reminder-item').dataset.id);
        const reminder = reminders.find(r => r.id === reminderId);
        reminders = reminders.filter(r => r.id !== reminderId);
        saveData();
        renderReminders();
    };

    const updateCountdowns = () => {
    const now = new Date();
    countdownDisplay.innerHTML = '<h3>Upcoming Deadlines</h3>';

    // 排序提醒
    const sortedReminders = reminders.sort((a, b) => new Date(a.dueDate) - new Date(b.dueDate));

        sortedReminders.forEach(reminder => {
            const dueDate = new Date(reminder.dueDate);
            const timeLeft = dueDate - now;

            const isOverdue = timeLeft < 0;
            const timeLeftText = isOverdue
                ? `<span style="color: var(--high);">Overdue</span>`
                : `${Math.floor(timeLeft / (1000 * 60 * 60))}h ${Math.floor((timeLeft / (1000 * 60)) % 60)}m`;

            countdownDisplay.innerHTML += `
                <div class="countdown-item ${isOverdue ? 'highlight-red' : ''}">
                    <div class="reminder-title">${reminder.text}</div>
                    <div class="reminder-time">
                        <i class="fas fa-clock"></i> ${isOverdue ? 'Overdue' : 'Due in'}: ${timeLeftText}
                    </div>
                </div>
            `;
        });
        
        // ❌ 删除这一行：autoCancelOverdueReminders();
    };
    const autoCancelOverdueReminders = () => {
        const now = new Date();
        const originalLength = reminders.length;
        reminders = reminders.filter(reminder => new Date(reminder.dueDate) > now);
        
        // 只有当有变化时才保存
        if (reminders.length !== originalLength) {
            saveData();
            // 不要调用 renderReminders()，避免循环
        }
    };

    const checkReminderNotifications = () => {
        const now = new Date();
    
        reminders.forEach(reminder => {
            const dueDate = new Date(reminder.dueDate);
            const timeLeft = dueDate - now;
    
            // Check if we should show a notification (1 day, 1 hour, 10 minutes before)
            const oneDay = 24 * 60 * 60 * 1000;
            const oneHour = 60 * 60 * 1000;
            const tenMinutes = 10 * 60 * 1000;
    
            if (!reminder.notifiedOneDay && timeLeft <= oneDay && timeLeft > oneHour) {
                showNotification(`Reminder: "${reminder.text}" is due in 1 day!`);
                reminder.notifiedOneDay = true;
                saveData();
            }
    
            if (!reminder.notifiedOneHour && timeLeft <= oneHour && timeLeft > tenMinutes) {
                showNotification(`Reminder: "${reminder.text}" is due in 1 hour!`);
                reminder.notifiedOneHour = true;
                saveData();
            }
    
            if (!reminder.notifiedTenMinutes && timeLeft <= tenMinutes && timeLeft > 0) {
                showNotification(`Reminder: "${reminder.text}" is due in 10 minutes!`);
                reminder.notifiedTenMinutes = true;
                saveData();
            }
        });
    };

    // Timer Functions
    const updateTimerDisplay = () => {
        const hours = Math.floor(totalSeconds / 3600);
        const minutes = Math.floor((totalSeconds % 3600) / 60);
        const seconds = totalSeconds % 60;
        
        timerDisplay.textContent = 
            `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
    };
    function playCompletionSound() {
        // Create audio context
        const audioContext = new (window.AudioContext || window.webkitAudioContext)();
        const oscillator = audioContext.createOscillator();
        const gainNode = audioContext.createGain();
        
        // Configure sound
        oscillator.type = 'sine'; // Can be 'sine', 'square', 'sawtooth', 'triangle'
        oscillator.frequency.value = 1000; // Frequency in Hz (A5 note)
        
        // Configure volume envelope (short beep)
        gainNode.gain.setValueAtTime(0, audioContext.currentTime);
        gainNode.gain.linearRampToValueAtTime(0.3, audioContext.currentTime + 0.1);
        gainNode.gain.linearRampToValueAtTime(0, audioContext.currentTime + 0.3);
        
        // Connect nodes
        oscillator.connect(gainNode);
        gainNode.connect(audioContext.destination);
        
        // Play sound
        oscillator.start();
        oscillator.stop(audioContext.currentTime + 0.5); // Stop after 0.5 seconds
    }
    const startTimer = () => {
        if (timerRunning) return;
    
        const hours = parseInt(hoursInput.value) || 0;
        const minutes = parseInt(minutesInput.value) || 0;
        const seconds = parseInt(secondsInput.value) || 0;
    
        totalSeconds = hours * 3600 + minutes * 60 + seconds;
    
        if (totalSeconds <= 0) {
            alert('Please set a valid timer duration.');
            return;
        }
    
        timerRunning = true;
        startTimerBtn.innerHTML = '<i class="fas fa-pause"></i> Pause';
        startTimerBtn.style.background = 'linear-gradient(135deg, #fdcb6e 0%, #e17055 100%)'; // Fix color here
    
        timerInterval = setInterval(() => {
            if (totalSeconds > 0) {
                totalSeconds--;
                updateTimerDisplay();
            } else {
                clearInterval(timerInterval);
                timerRunning = false;
                playCompletionSound();
                createFireworks();
                resetTimer();
            }
        }, 1000);
    };
    function createFireworks() {
        const container = document.querySelector('.container');
        const colors = ['#ff0000', '#ffff00', '#00ff00', '#00ffff', '#0000ff', '#ff00ff'];
        
        for (let i = 0; i < 30; i++) {
            const firework = document.createElement('div');
            firework.classList.add('firework');
            
            const x = Math.random() * 100;
            const y = Math.random() * 100;
            const color = colors[Math.floor(Math.random() * colors.length)];
            
            firework.style.left = `${x}%`;
            firework.style.top = `${y}%`;
            firework.style.background = color;
            firework.style.animationDelay = `${Math.random() * 0.5}s`;
            
            container.appendChild(firework);
            
            firework.addEventListener('animationend', () => {
                firework.remove();
            });
        }
    }
    const pauseTimer = () => {
        clearInterval(timerInterval);
        timerRunning = false;
        startTimerBtn.innerHTML = '<i class="fas fa-play"></i> Resume';
        startTimerBtn.style.background = 'linear-gradient(135deg, #00b894 0%, #00cec9 100%)';
    };

    const resetTimer = () => {
        clearInterval(timerInterval);
        timerRunning = false;
        totalSeconds = 0;
        hoursInput.value = '';
        minutesInput.value = '';
        secondsInput.value = '';
        timerDisplay.textContent = '00:00:00';
        startTimerBtn.innerHTML = '<i class="fas fa-play"></i> Start';
        startTimerBtn.style.background = 'linear-gradient(135deg, #00b894 0%, #00cec9 100%)';
    };

    // Make timer draggable
    let isDragging = false;
    let offsetX, offsetY;

    floatingTimer.addEventListener('mousedown', (e) => {
        if (e.target === floatingTimer || e.target.classList.contains('timer-header')) {
            isDragging = true;
            offsetX = e.clientX - floatingTimer.getBoundingClientRect().left;
            offsetY = e.clientY - floatingTimer.getBoundingClientRect().top;
            floatingTimer.style.cursor = 'grabbing';
        }
    });

    document.addEventListener('mousemove', (e) => {
        if (isDragging) {
            floatingTimer.style.left = `${e.clientX - offsetX}px`;
            floatingTimer.style.top = `${e.clientY - offsetY}px`;
        }
    });

    document.addEventListener('mouseup', () => {
        isDragging = false;
        floatingTimer.style.cursor = 'move';
    });

    // Timer visibility toggle
    toggleTimerBtn.addEventListener('click', () => {
        timerVisible = !timerVisible;
        if (timerVisible) {
            floatingTimer.style.opacity = '1';
            toggleTimerBtn.innerHTML = '<i class="fas fa-eye"></i>';
        } else {
            floatingTimer.style.opacity = '0.5';
            toggleTimerBtn.innerHTML = '<i class="fas fa-eye-slash"></i>';
        }
    });


    const animateWaveBars = () => {
        waveBars.forEach(bar => {
            const height = Math.random() * 20 + 5;
            bar.style.height = `${height}px`;
        });
    };
    // Update time and date in top bar
    const updateTime = () => {
        const now = new Date();
        const timeString = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
        const dateString = now.toLocaleDateString([], { weekday: 'short', month: 'short', day: 'numeric' });
        
        document.getElementById('topBarTime').textContent = timeString;
        document.getElementById('topBarDate').textContent = dateString;
    };

    // Show/hide top bar on mouse movement
    const setupTopBar = () => {
        let lastY = 0;
        const topBar = document.getElementById('topBar');
        
        document.addEventListener('mousemove', (e) => {
            if (e.clientY < 50 && lastY >= 50) {
                topBar.classList.add('visible');
            } else if (e.clientY > 100 && lastY <= 100) {
                topBar.classList.remove('visible');
            }
            lastY = e.clientY;
        });
        
        // Update time immediately and then every minute
        updateTime();
        setInterval(updateTime, 60000);
    };
    // Settings variables
    let settings = {
        darkMode: false,
        targetCompletionTime: 30, // Default to 30 minutes (matches your original TARGET_COMPLETION_TIME)
        appMode: 'focus', // 'focus' or 'schedule'
        bgMusic: 'none',
        themeColor: '#4a6bff'
    };

    const loadSettings = () => {
        const savedSettings = localStorage.getItem('studyAssistantSettings');
        if (savedSettings) {
            try {
                settings = JSON.parse(savedSettings);
                // Ensure appMode is valid
                if (settings.appMode !== 'schedule' && settings.appMode !== 'focus') {
                    settings.appMode = 'focus'; // Force default to Focus Mode
                }
            } catch (e) {
                settings = { appMode: 'focus' }; // Fallback to Focus Mode
            }
        } else {
            settings = { appMode: 'focus' }; // Default to Focus Mode
        }
        
        // Apply the mode classes immediately
        document.body.classList.remove('schedule-mode', 'focus-mode');
        document.body.classList.add(`${settings.appMode}-mode`);
        
        // Safely update form elements only if they exist
        const appModeSelect = document.getElementById('appModeSelect');
        if (appModeSelect) {
            appModeSelect.value = settings.appMode;
        }
        
        // Hide/show priority & time inputs based on mode
        const prioritySelect = document.getElementById('prioritySelect');
        const timeInputs = document.querySelector('.input');
        
        if (prioritySelect) {
            prioritySelect.style.display = settings.appMode === 'focus' ? 'block' : 'none';
        }
        if (timeInputs) {
            timeInputs.style.display = settings.appMode === 'schedule' ? 'flex' : 'none';
        }
    };
    // Save settings to localStorage
    const saveSettings = () => {
        const newMode = document.getElementById('appModeSelect').value;
        const newDarkMode = document.getElementById('darkModeToggle').checked;

        // Only reset data if mode actually changed
        if (newMode !== settings.appMode) {
            if (confirm('Switching modes will reset your tasks. Continue?')) {
                tasks = [];
                reminders = [];
                efficiencyData = [];
                activityTimers = {};
                settings.appMode = newMode;
                saveData();
            } else {
                document.getElementById('appModeSelect').value = settings.appMode;
                return;
            }
        }
        
        // Update settings
        settings.darkMode = newDarkMode;
        settings.targetCompletionTime = parseInt(document.getElementById('targetCompletionTime').value) || 30;
        
        // Save and apply
        localStorage.setItem('studyAssistantSettings', JSON.stringify(settings));
        applySettings();
    };

    const applySettings = () => {
        // Apply theme color first (always set)

        
        // 确保 targetCompletionTime 有值
        const targetTime = settings.targetCompletionTime || 30;
        
        // 安全地设置输入值
        const targetInput = document.getElementById('targetCompletionTime');
        if (targetInput) {
            targetInput.value = targetTime;
        }
    
        // Apply dark mode if enabled
        if (settings.darkMode) {
            document.body.classList.add('dark-mode');
            document.documentElement.style.setProperty('--bg', '#1a1a2e');
            document.documentElement.style.setProperty('--card', '#16213e');
            document.documentElement.style.setProperty('--text', '#ffffff');
            document.documentElement.style.setProperty('--text-light', '#b8b8b8');
            document.documentElement.style.setProperty('--border', '#2d3748');
        } else {
            document.body.classList.remove('dark-mode');
            document.documentElement.style.setProperty('--bg', '#f7fafc');
            document.documentElement.style.setProperty('--card', '#ffffff');
            document.documentElement.style.setProperty('--text', '#2d3748');
            document.documentElement.style.setProperty('--text-light', '#718096');
            document.documentElement.style.setProperty('--border', '#e2e8f0');
        }
    
        // Handle form elements visibility based on mode
        const prioritySelect = document.getElementById('prioritySelect');
        const scheduleInputs = document.querySelector('.input');
        
        if (settings.appMode === 'schedule') {
            if (prioritySelect) prioritySelect.style.display = 'none';
            if (scheduleInputs) scheduleInputs.style.display = 'flex';
        } else {
            if (prioritySelect) prioritySelect.style.display = 'block';
            if (scheduleInputs) scheduleInputs.style.display = 'none';
        }
    
        // Re-render tasks to reflect changes
        renderTasks();
    
        // Update UI elements
        if (document.getElementById('appModeSelect')) {
            document.getElementById('appModeSelect').value = settings.appMode;
        }
        if (document.getElementById('darkModeToggle')) {
            document.getElementById('darkModeToggle').checked = settings.darkMode;
        }
        if (document.getElementById('targetCompletionTime')) {
            document.getElementById('targetCompletionTime').value = settings.targetCompletionTime;
        }
    };

    // Setup settings modal
    const setupSettingsModal = () => {
        const modal = document.getElementById('settingsModal');
        const openBtn = document.getElementById('settingsButton');
        const closeBtn = document.getElementById('settingsClose');
        const saveBtn = document.getElementById('settingsSave');
        
        openBtn.addEventListener('click', () => {
            modal.classList.add('active');
        });
        
        closeBtn.addEventListener('click', () => {
            modal.classList.remove('active');
        });
        
        saveBtn.addEventListener('click', () => {
            // Update settings from modal
            settings.darkMode = document.getElementById('darkModeToggle').checked;
            settings.targetCompletionTime = parseInt(document.getElementById('targetCompletionTime').value) || 30;  
            // Save and apply
            saveSettings();
            applySettings();
            updateEfficiency(true);
            
            // Close modal
            modal.classList.remove('active');
        });
        
        // Close modal when clicking outside
        modal.addEventListener('click', (e) => {
            if (e.target === modal) {
                modal.classList.remove('active');
            }
        });
    };
    const setupVoiceControl = () => {
        if (!SpeechRecognition) {
            voiceStatus.innerHTML = '<i class="fas fa-microphone-slash"></i> Voice control not supported';
            voiceStatus.style.color = '#ff7675';
            return;
        }

        if (!window.isSecureContext && location.protocol !== 'file:') {
            voiceStatus.innerHTML = '<i class="fas fa-microphone-slash"></i> Voice control requires HTTPS / localhost';
            voiceStatus.style.color = '#ff7675';
            return;
        }

        // ✅ 如果已存在识别器，先清理
        if (recognition) {
            recognition.stop();
            recognition = null;
        }

        recognition = new SpeechRecognition();
        recognition.continuous = true;
        recognition.interimResults = true;
        recognition.lang = 'en-US';

        let isActivated = false; // ✅ 统一变量名
        let isProcessingCommand = false;

        recognition.onstart = () => {
            isListening = true;
            voiceStatus.innerHTML = '<i class="fas fa-microphone"></i> Always listening... Say "Study assistant" to activate';
            voiceStatus.style.color = '#00b894';
            voiceWave.style.display = 'flex';
        };

        recognition.onend = () => {
            if (isListening) {
                setTimeout(() => {
                    try {
                        recognition.start();
                    } catch (e) {
                        console.log('Recognition restart failed:', e);
                    }
                }, 1000);
            }
        };

        recognition.onresult = (event) => {
            const transcript = Array.from(event.results)
                .map(result => result[0])
                .map(result => result.transcript)
                .join('')
                .toLowerCase();

            // ✅ 唤醒词检测
            if (!isActivated && transcript.includes(triggerPhrase)) {
                isActivated = true;
                voiceStatus.innerHTML = '<i class="fas fa-microphone"></i> Activated! Listening for commands...';
                voiceStatus.style.color = '#00b894';
                speak("Hi, how can I help you?");
                voiceResponse.textContent = "Hi, how can I help you?";
                return;
            }

            // ✅ 已激活 → 处理命令
            if (isActivated && !isProcessingCommand && event.results[0].isFinal) {
                isProcessingCommand = true;
                processVoiceCommand(transcript);
                
                // ✅ 重置处理标志
                setTimeout(() => {
                    isProcessingCommand = false;
                }, 1500);
            }

            if (isActivated) {
                animateWaveBars();
            }
        };

        recognition.onerror = (event) => {
            console.error('Speech recognition error', event.error);
            
            if (event.error === 'not-allowed') {
                voiceStatus.innerHTML = '<i class="fas fa-microphone-slash"></i> Microphone access denied';
                voiceStatus.style.color = '#ff7675';
                voiceResponse.textContent = 'Please allow microphone access and refresh the page.';
            } else if (event.error === 'network') {
                voiceStatus.innerHTML = '<i class="fas fa-microphone-slash"></i> Network error - retrying...';
                setTimeout(() => {
                    if (isListening) recognition.start();
                }, 3000);
            }
        };

        // ✅ 自动开始监听（需要用户交互）
        const startAutoListening = async () => {
            try {
                await recognition.start();
            } catch (error) {
                console.error('Failed to start auto-listening:', error);
                voiceStatus.innerHTML = '<i class="fas fa-microphone-slash"></i> Click anywhere to enable voice control';
                voiceStatus.style.color = '#ff7675';
                
                document.addEventListener('click', function startOnClick() {
                    recognition.start();
                    document.removeEventListener('click', startOnClick);
                }, { once: true });
            }
        };

        setTimeout(startAutoListening, 1000);
    };
    
    const processVoiceCommand = (command) => {
        let response = "";
        let actionTaken = false;
    
        command = command.replace(triggerPhrase, '').trim();
    
        // ✅ 添加任务（保留你原有的多步对话）
        if (command.includes('add') || command.includes('create')) {
            const taskMatch = command.match(/(?:add|create) (?:task|activity) (.+)/i);
            if (taskMatch && taskMatch[1]) {
                const taskTitle = taskMatch[1].trim();
                response = `Added task: "${taskTitle}". What priority should it have?`;
                speak(response);
                recognition.stop();
    
                const priorityRecognition = new SpeechRecognition();
                priorityRecognition.lang = 'en-US';
                priorityRecognition.onresult = (event) => {
                    const priority = event.results[0][0].transcript.toLowerCase();
                    let selectedPriority = 'medium';
                    if (priority.includes('high')) selectedPriority = 'high';
                    else if (priority.includes('low')) selectedPriority = 'low';
    
                    speak(`Task "${taskTitle}" set as ${selectedPriority} priority. What subject is it for?`);
    
                    const subjectRecognition = new SpeechRecognition();
                    subjectRecognition.lang = 'en-US';
                    subjectRecognition.onresult = (event) => {
                        const subject = event.results[0][0].transcript.toLowerCase();
                        let selectedSubject = 'other';
                        ['biology','physics','chemistry','math','english','chinese','spanish','french','history','geography','technology','music'].forEach(sub => {
                            if (subject.includes(sub)) selectedSubject = sub;
                        });
    
                        tasks.push({
                            id: Date.now(),
                            title: taskTitle,
                            priority: selectedPriority,
                            subject: selectedSubject,
                            completed: false,
                            createdAt: new Date()
                        });
    
                        saveData();
                        renderTasks();
                        updateEfficiency(true);
    
                        response = `Task "${taskTitle}" added with ${selectedPriority} priority for ${selectedSubject}`;
                        speak(response);
                        voiceResponse.textContent = response;
    
                        setTimeout(() => recognition.start(), 500);
                    };
                    subjectRecognition.start();
                };
                priorityRecognition.start();
                actionTaken = true;
            }
        }
    
        // ✅ 删除任务
        else if ((command.includes('delete') || command.includes('cancel') || command.includes('end')) && 
                 (command.includes('task') || command.includes('activity'))) {
            const taskMatch = command.match(/(?:delete|cancel|end) (?:task|activity) (.+)/i);
            if (taskMatch && taskMatch[1]) {
                const taskTitle = taskMatch[1].trim();
                const taskToDelete = tasks.find(t => t.title.toLowerCase().includes(taskTitle.toLowerCase()));
                if (taskToDelete) {
                    tasks = tasks.filter(t => t.id !== taskToDelete.id);
                    delete activityTimers[taskToDelete.id];
                    saveData();
                    renderTasks();
                    updateEfficiency(true);
                    response = `Task "${taskToDelete.title}" has been deleted`;
                } else {
                    response = `I couldn't find a task matching "${taskTitle}"`;
                }
                actionTaken = true;
            }
        }
    
        // ✅ 完成任务
        else if ((command.includes('complete') || command.includes('finish')) && 
                 (command.includes('task') || command.includes('activity'))) {
            const taskMatch = command.match(/(?:complete|finish) (?:task|activity) (.+)/i);
            if (taskMatch && taskMatch[1]) {
                const taskTitle = taskMatch[1].trim();
                const taskToComplete = tasks.find(t => !t.completed && t.title.toLowerCase().includes(taskTitle.toLowerCase()));
                if (taskToComplete) {
                    taskToComplete.completed = true;
                    taskToComplete.completedAt = new Date();
                    activityTimers[taskToComplete.id] = (taskToComplete.completedAt - new Date(taskToComplete.createdAt)) / 60000;
                    saveData();
                    renderTasks();
                    updateEfficiency(true);
                    response = `Task "${taskToComplete.title}" marked as completed`;
                } else {
                    response = `I couldn't find an active task matching "${taskTitle}"`;
                }
                actionTaken = true;
            }
        }
    
        // ✅ 删除所有
        else if (command.includes('delete all') || command.includes('cancel all') || command.includes('reset all')) {
            resetAllData();
            response = "All data has been reset";
            actionTaken = true;
        }
    
        // ✅ 打开页面
        else if (command.includes('open')) {
            if (command.includes('game')) {
                window.location.replace('game.html');
                response = "Opening game section";
            } else if (command.includes('stats') || command.includes('graph')) {
                taskSection.style.display = 'none';
                graphSection.style.display = 'block';
                remindersSection.style.display = 'none';
                initCharts();
                updateDataDisplay();
                response = "Opening statistics";
            } else if (command.includes('reminders')) {
                taskSection.style.display = 'none';
                graphSection.style.display = 'none';
                remindersSection.style.display = 'block';
                renderReminders();
                response = "Opening reminders";
            } else if (command.includes('tasks') || command.includes('home')) {
                taskSection.style.display = 'block';
                graphSection.style.display = 'none';
                remindersSection.style.display = 'none';
                response = "Opening tasks";
            }
            actionTaken = true;
        }
    
        // ✅ 计时器
        else if (command.includes('timer')) {
            if (command.includes('start') || command.includes('begin')) {
                startTimer();
                response = "Timer started";
            } else if (command.includes('reset')) {
                resetTimer();
                response = "Timer reset";
            } else if (command.includes('show') || command.includes('display')) {
                showTimer();
                response = "Showing timer";
            }
            actionTaken = true;
        }
    
        // ✅ 添加提醒
        else if ((command.includes('add') || command.includes('create')) && command.includes('reminder')) {
            const reminderMatch = command.match(/(?:add|create) reminder (.+)/i);
            if (reminderMatch && reminderMatch[1]) {
                const reminderText = reminderMatch[1].trim();
                response = `Added reminder: "${reminderText}". When is it due?`;
                speak(response);
                recognition.stop();
    
                const dateRecognition = new SpeechRecognition();
                dateRecognition.lang = 'en-US';
                dateRecognition.onresult = (event) => {
                    const dateStr = event.results[0][0].transcript.toLowerCase();
                    let dueDate = new Date();
                    dueDate.setDate(dueDate.getDate() + 1); // 默认明天
    
                    reminders.push({
                        id: Date.now(),
                        text: reminderText,
                        dueDate,
                        notifiedOneDay: false,
                        notifiedOneHour: false,
                        notifiedTenMinutes: false
                    });
                    saveData();
                    renderReminders();
                    response = `Reminder set for "${reminderText}"`;
                    speak(response);
                    voiceResponse.textContent = response;
                    setTimeout(() => recognition.start(), 500);
                };
                dateRecognition.start();
                actionTaken = true;
            }
        }
    
        // ✅ 删除提醒
        else if ((command.includes('delete') || command.includes('cancel')) && command.includes('reminder')) {
            const reminderMatch = command.match(/(?:delete|cancel) reminder (.+)/i);
            if (reminderMatch && reminderMatch[1]) {
                const reminderText = reminderMatch[1].trim();
                const reminderToDelete = reminders.find(r => r.text.toLowerCase().includes(reminderText.toLowerCase()));
                if (reminderToDelete) {
                    reminders = reminders.filter(r => r.id !== reminderToDelete.id);
                    saveData();
                    renderReminders();
                    response = `Reminder "${reminderToDelete.text}" deleted`;
                } else {
                    response = `Reminder not found`;
                }
                actionTaken = true;
            }
        }
    
        // ✅ 退出（关键修复）
        else if (command.includes('exit') || command.includes('stop') || command.includes('goodbye')) {
            isActivated = false; // ✅ 只重置状态，不关闭识别
            voiceStatus.innerHTML = '<i class="fas fa-microphone"></i> Listening for "Study assistant"';
            response = "Goodbye! I'm still listening.";
            actionTaken = true;
        }
    
        // ✅ 未知命令
        if (!actionTaken) {
            response = "I didn't understand that command.";
        }
    
        if (actionTaken) {
            voiceResponse.textContent = response;
            speak(response);
        }
    
        // ✅ 移除错误的 stop() 和 triggerActive 重置
    };

    const speak = (text) => {
        if (!speechSynthesis) return;
        speechSynthesis.cancel(); // ✅ 关键
        const utterance = new SpeechSynthesisUtterance(text);
        utterance.lang = 'en-US';
        speechSynthesis.speak(utterance);
    };

    const saveData = () => {
        try {
            // 确保所有日期对象都被转换为字符串
            const safeTasks = tasks.map(task => ({
                ...task,
                createdAt: task.createdAt instanceof Date ? task.createdAt.toISOString() : task.createdAt,
                completedAt: task.completedAt instanceof Date ? task.completedAt.toISOString() : task.completedAt
            }));
            
            const safeReminders = reminders.map(reminder => ({
                ...reminder,
                dueDate: reminder.dueDate instanceof Date ? reminder.dueDate.toISOString() : reminder.dueDate
            }));
            
            localStorage.setItem('tasks', JSON.stringify(safeTasks));
            localStorage.setItem('reminders', JSON.stringify(safeReminders));
            localStorage.setItem('efficiencyData', JSON.stringify(efficiencyData));
        } catch (error) {
            console.error('Error saving data:', error);
        }
    };
    const handleAudio = () => {
        // Get audio element or create it if it doesn't exist
        let bgMusic = document.getElementById('bgMusic');
        
        if (!bgMusic) {
            bgMusic = document.createElement('audio');
            bgMusic.id = 'bgMusic';
            bgMusic.loop = true;
            document.body.appendChild(bgMusic);
        }
    
        // Stop any currently playing audio
        bgMusic.pause();
        bgMusic.currentTime = 0;
    
        // Only proceed if audio isn't set to 'none'
        if (settings.bgMusic && settings.bgMusic !== 'none') {
            // Set the corresponding audio source based on settings
            const audioSources = {
                'rain': 'audio/rain.mp3',
                'forest': 'audio/forest.mp3',
                'cafe': 'audio/cafe.mp3',
                'waves': 'waves.mp3',
                'classical': 'classical.mp3'
            };
    
            if (audioSources[settings.bgMusic]) {
                bgMusic.src = audioSources[settings.bgMusic];
                
                // Attempt to play (may need user interaction first)
                const playPromise = bgMusic.play();
                
                if (playPromise !== undefined) {
                    playPromise.catch(error => {
                        console.log('Audio playback prevented:', error);
                        // Store that we need to play after user interaction
                        localStorage.setItem('pendingAudio', settings.bgMusic);
                    });
                }
            }
        }
    
        // Handle volume based on settings (default to 30% if not set)
        bgMusic.volume = settings.bgVolume ? settings.bgVolume / 100 : 0.3;
    };
    // Event Listeners
    // Replace the taskForm event listener with:
    // Add this to your init() function
    document.addEventListener('click', () => {
        const pendingAudio = localStorage.getItem('pendingAudio');
        if (pendingAudio) {
            settings.bgMusic = pendingAudio;
            handleAudio();
            localStorage.removeItem('pendingAudio');
        }
    }, { once: true });
    taskForm.addEventListener('submit', (e) => {
        e.preventDefault();
        const taskTitle = taskInput.value.trim();
        if (taskTitle) {
            const newTask = {
                id: Date.now(),
                title: taskTitle,
                subject: subjectSelect.value,
                completed: false,
                createdAt: new Date()
            };
    
            // Handle both modes correctly
            if (settings.appMode === 'focus') {
                // For focus mode, priority is required
                const prioritySelectEl = document.getElementById('prioritySelect');
                newTask.priority = (prioritySelectEl && prioritySelectEl.value) 
                    ? prioritySelectEl.value
                    : 'medium';
            } else {
                // For schedule mode, time slot is optional but preferred
                const startInput = document.getElementById('startTimeInput');
                const endInput = document.getElementById('endTimeInput');
                if (startInput && endInput && startInput.value && endInput.value) {
                    newTask.timeSlot = {
                        start: startInput.value,
                        end: endInput.value
                    };
                }
            }
    
            tasks.push(newTask);
            activityTimers[newTask.id] = 0;
            taskInput.value = '';
            saveData();
            renderTasks();
            updateEfficiency(true);
        }
    });

    reminderForm.addEventListener('submit', (e) => {
        e.preventDefault();
        const reminderText = reminderInput.value.trim();
        const dueDate = reminderDueDate.value;
        
        if (reminderText && dueDate) {
            const newReminder = {
                id: Date.now(),
                text: reminderText,
                dueDate: new Date(dueDate),
                notifiedOneDay: false,
                notifiedOneHour: false,
                notifiedTenMinutes: false
            };
            reminders.push(newReminder);
            reminderInput.value = '';
            reminderDueDate.value = '';
            saveData();
            renderReminders();
        }
    });

    resetAllBtn.addEventListener('click', resetAllData);
    showTimerBtn.addEventListener('click', showTimer);

    // Timer Event Listeners
    startTimerBtn.addEventListener('click', () => {
        if (timerRunning) {
            pauseTimer();
        } else {
            startTimer();
        }
    });
    resetTimerBtn.addEventListener('click', resetTimer);
    closeTimerBtn.addEventListener('click', () => {
        floatingTimer.style.display = 'none';
    });

    // Navigation Event Listeners
    graphBtn.addEventListener('click', () => {
        taskSection.style.display = 'none';
        graphSection.style.display = 'block';
        remindersSection.style.display = 'none';
        initCharts();
        updateDataDisplay();
    });

    remindersBtn.addEventListener('click', () => {
        taskSection.style.display = 'none';
        graphSection.style.display = 'none';
        remindersSection.style.display = 'block';
        renderReminders();
    });

    backBtn.addEventListener('click', () => {
        taskSection.style.display = 'block';
        graphSection.style.display = 'none';
        remindersSection.style.display = 'none';
    });

    backFromRemindersBtn.addEventListener('click', () => {
        taskSection.style.display = 'block';
        graphSection.style.display = 'none';
        remindersSection.style.display = 'none';
    });
    downloadPgBtn.addEventListener('click', downloadPieGraph);
    downloadLgBtn.addEventListener('click', downloadLineGraph);
    // Initialize
    const init = () => {
        if (!document.getElementById('efficiencyChart') || !document.getElementById('subjectChart')) {
            setTimeout(init, 100); // Retry if canvases don't exist yet
            return;
        }
        if (typeof Chart === 'undefined') {
            console.log('Waiting for Chart.js to load...');
            setTimeout(init, 10000);
            return;
        }
        // Set default sections
        taskSection.style.display = 'block';
        graphSection.style.display = 'none';
        remindersSection.style.display = 'none';
        floatingTimer.style.display = 'none';
        loadSettings();
        applySettings();
        setupSettingsModal();
        setupTopBar();
        
        // Load data
        renderTasks();
        renderReminders();
        updateDataDisplay();
        setTimeout(() => {
            initCharts();
        }, 100);
        
        // Setup voice control
        setupVoiceControl();
        
        // Set up timer
        updateTimerDisplay();
        if ("Notification" in window && Notification.permission !== "granted") {
            Notification.requestPermission().then(permission => {
                if (permission !== "granted") {
                    console.log("Notification permission denied");
                }
            });
        }
        
        // Start periodic updates
        setInterval(updateCountdowns, 60000); // Update countdowns every minute
    };

    // Run initialization
    init();

    // Service Worker Registration for PWA
    if ('serviceWorker' in navigator) {
        window.addEventListener('load', () => {
            navigator.serviceWorker.register('/sw.js')
                .then(registration => {
                    console.log('ServiceWorker registration successful');
                })
                .catch(err => {
                    console.log('ServiceWorker registration failed: ', err);
                });
        });
    }
});
