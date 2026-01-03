// Task Manager Application
class TaskManager {
    constructor() {
        this.tasks = [];
        this.currentTaskId = null;
        this.taskModal = null;
        this.deleteModal = null;
        this.toast = null;
        this.init();
    }

    init() {
        // Initialize Bootstrap modals and toast
        this.taskModal = new bootstrap.Modal(document.getElementById('taskModal'));
        this.deleteModal = new bootstrap.Modal(document.getElementById('deleteModal'));
        this.toast = new bootstrap.Toast(document.getElementById('toast'));

        // Load tasks from localStorage
        this.loadTasks();

        // Setup event listeners
        this.setupEventListeners();

        // Initial render
        this.renderTasks();
        this.updateStatistics();
    }

    setupEventListeners() {
        // Add task buttons
        document.getElementById('addTaskBtn').addEventListener('click', () => this.openTaskModal());
        document.getElementById('getStartedBtn').addEventListener('click', () => this.openTaskModal());
        document.getElementById('emptyStateBtn').addEventListener('click', () => this.openTaskModal());

        // Save task button
        document.getElementById('saveTaskBtn').addEventListener('click', () => this.saveTask());

        // Delete confirmation
        document.getElementById('confirmDeleteBtn').addEventListener('click', () => this.deleteTask());

        // Filter and sort
        document.getElementById('filterStatus').addEventListener('change', () => this.renderTasks());
        document.getElementById('sortBy').addEventListener('change', () => this.renderTasks());

        // Form submission
        document.getElementById('taskForm').addEventListener('submit', (e) => {
            e.preventDefault();
            this.saveTask();
        });

        // Modal reset on close
        document.getElementById('taskModal').addEventListener('hidden.bs.modal', () => {
            this.resetForm();
        });
    }

    openTaskModal(taskId = null) {
        this.currentTaskId = taskId;
        
        if (taskId) {
            // Edit mode
            const task = this.tasks.find(t => t.id === taskId);
            if (task) {
                document.getElementById('modalTitle').textContent = 'Edit Task';
                document.getElementById('taskId').value = task.id;
                document.getElementById('taskTitle').value = task.title;
                document.getElementById('taskDescription').value = task.description || '';
                document.getElementById('taskStatus').value = task.status;
                document.getElementById('taskPriority').value = task.priority;
                document.getElementById('taskDueDate').value = task.dueDate || '';
            }
        } else {
            // Create mode
            document.getElementById('modalTitle').textContent = 'Add New Task';
            this.resetForm();
        }

        this.taskModal.show();
    }

    resetForm() {
        document.getElementById('taskForm').reset();
        document.getElementById('taskId').value = '';
        this.currentTaskId = null;
    }

    saveTask() {
        const form = document.getElementById('taskForm');
        
        if (!form.checkValidity()) {
            form.reportValidity();
            return;
        }

        const taskData = {
            id: this.currentTaskId || this.generateId(),
            title: document.getElementById('taskTitle').value.trim(),
            description: document.getElementById('taskDescription').value.trim(),
            status: document.getElementById('taskStatus').value,
            priority: document.getElementById('taskPriority').value,
            dueDate: document.getElementById('taskDueDate').value,
            createdAt: this.currentTaskId ? 
                this.tasks.find(t => t.id === this.currentTaskId).createdAt : 
                new Date().toISOString(),
            updatedAt: new Date().toISOString()
        };

        if (this.currentTaskId) {
            // Update existing task
            const index = this.tasks.findIndex(t => t.id === this.currentTaskId);
            this.tasks[index] = taskData;
            this.showToast('Task updated successfully!', 'success');
        } else {
            // Create new task
            this.tasks.push(taskData);
            this.showToast('Task created successfully!', 'success');
        }

        this.saveTasks();
        this.renderTasks();
        this.updateStatistics();
        this.taskModal.hide();
    }

    confirmDelete(taskId) {
        this.currentTaskId = taskId;
        this.deleteModal.show();
    }

    deleteTask() {
        if (this.currentTaskId) {
            this.tasks = this.tasks.filter(t => t.id !== this.currentTaskId);
            this.saveTasks();
            this.renderTasks();
            this.updateStatistics();
            this.deleteModal.hide();
            this.showToast('Task deleted successfully!', 'danger');
            this.currentTaskId = null;
        }
    }

    renderTasks() {
        const taskList = document.getElementById('taskList');
        const emptyState = document.getElementById('emptyState');
        const filterStatus = document.getElementById('filterStatus').value;
        const sortBy = document.getElementById('sortBy').value;

        // Filter tasks
        let filteredTasks = this.tasks;
        if (filterStatus !== 'all') {
            filteredTasks = this.tasks.filter(t => t.status === filterStatus);
        }

        // Sort tasks
        filteredTasks = this.sortTasks(filteredTasks, sortBy);

        // Show/hide empty state
        if (this.tasks.length === 0) {
            emptyState.classList.add('show');
            taskList.style.display = 'none';
        } else {
            emptyState.classList.remove('show');
            taskList.style.display = 'grid';
        }

        // Render task cards
        if (filteredTasks.length === 0 && this.tasks.length > 0) {
            taskList.innerHTML = '<div class="col-12"><p class="text-center text-muted">No tasks match the selected filter.</p></div>';
        } else {
            taskList.innerHTML = filteredTasks.map(task => this.createTaskCard(task)).join('');
        }

        // Attach event listeners to task cards
        this.attachTaskCardListeners();
    }

    createTaskCard(task) {
        const statusClass = `status-${task.status}`;
        const priorityClass = `priority-${task.priority}`;
        const dueDate = task.dueDate ? new Date(task.dueDate).toLocaleDateString() : 'No due date';
        const isOverdue = task.dueDate && new Date(task.dueDate) < new Date() && task.status !== 'completed';

        return `
            <div class="task-card ${priorityClass}" data-task-id="${task.id}">
                <div class="task-header">
                    <h3 class="task-title">${this.escapeHtml(task.title)}</h3>
                    <div class="task-actions">
                        <button class="btn btn-sm btn-success edit-task" data-task-id="${task.id}" title="Edit">
                            <i class="bi bi-pencil"></i>
                        </button>
                        <button class="btn btn-sm btn-danger delete-task" data-task-id="${task.id}" title="Delete">
                            <i class="bi bi-trash"></i>
                        </button>
                    </div>
                </div>
                ${task.description ? `<p class="task-description">${this.escapeHtml(task.description)}</p>` : ''}
                <div class="task-meta">
                    <span class="task-badge ${statusClass}">
                        <i class="bi bi-circle-fill"></i>
                        ${this.formatStatus(task.status)}
                    </span>
                    <span class="task-badge ${priorityClass}">
                        <i class="bi bi-flag-fill"></i>
                        ${this.formatPriority(task.priority)}
                    </span>
                </div>
                <div class="task-date ${isOverdue ? 'text-danger' : ''}">
                    <i class="bi bi-calendar-event"></i>
                    <span>${dueDate}</span>
                    ${isOverdue ? '<i class="bi bi-exclamation-circle ms-1" title="Overdue"></i>' : ''}
                </div>
            </div>
        `;
    }

    attachTaskCardListeners() {
        // Edit buttons
        document.querySelectorAll('.edit-task').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.stopPropagation();
                const taskId = btn.dataset.taskId;
                this.openTaskModal(taskId);
            });
        });

        // Delete buttons
        document.querySelectorAll('.delete-task').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.stopPropagation();
                const taskId = btn.dataset.taskId;
                this.confirmDelete(taskId);
            });
        });
    }

    sortTasks(tasks, sortBy) {
        const sorted = [...tasks];
        
        switch (sortBy) {
            case 'date-desc':
                return sorted.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
            case 'date-asc':
                return sorted.sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt));
            case 'priority':
                const priorityOrder = { high: 1, medium: 2, low: 3 };
                return sorted.sort((a, b) => priorityOrder[a.priority] - priorityOrder[b.priority]);
            case 'title':
                return sorted.sort((a, b) => a.title.localeCompare(b.title));
            default:
                return sorted;
        }
    }

    updateStatistics() {
        const total = this.tasks.length;
        const pending = this.tasks.filter(t => t.status === 'pending').length;
        const inProgress = this.tasks.filter(t => t.status === 'in-progress').length;
        const completed = this.tasks.filter(t => t.status === 'completed').length;

        document.getElementById('totalTasks').textContent = total;
        document.getElementById('pendingTasks').textContent = pending + inProgress;
        document.getElementById('completedTasks').textContent = completed;
    }

    loadTasks() {
        const stored = localStorage.getItem('smartTaskManager');
        if (stored) {
            try {
                this.tasks = JSON.parse(stored);
            } catch (e) {
                console.error('Error loading tasks:', e);
                this.tasks = [];
            }
        }
    }

    saveTasks() {
        localStorage.setItem('smartTaskManager', JSON.stringify(this.tasks));
    }

    generateId() {
        return 'task_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
    }

    formatStatus(status) {
        const statusMap = {
            'pending': 'Pending',
            'in-progress': 'In Progress',
            'completed': 'Completed'
        };
        return statusMap[status] || status;
    }

    formatPriority(priority) {
        return priority.charAt(0).toUpperCase() + priority.slice(1);
    }

    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

    showToast(message, type = 'success') {
        const toastElement = document.getElementById('toast');
        const toastMessage = document.getElementById('toastMessage');
        const toastIcon = toastElement.querySelector('.toast-header i');

        toastMessage.textContent = message;

        // Update icon and color based on type
        toastIcon.className = '';
        if (type === 'success') {
            toastIcon.className = 'bi bi-check-circle-fill text-success me-2';
        } else if (type === 'danger') {
            toastIcon.className = 'bi bi-exclamation-circle-fill text-danger me-2';
        } else if (type === 'warning') {
            toastIcon.className = 'bi bi-exclamation-triangle-fill text-warning me-2';
        }

        this.toast.show();
    }
}

// API Service Module (for future REST API integration)
class APIService {
    constructor(baseURL = '/api') {
        this.baseURL = baseURL;
    }

    async request(endpoint, options = {}) {
        const url = `${this.baseURL}${endpoint}`;
        const config = {
            headers: {
                'Content-Type': 'application/json',
                ...options.headers
            },
            ...options
        };

        try {
            const response = await fetch(url, config);
            
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            
            return await response.json();
        } catch (error) {
            console.error('API request failed:', error);
            throw error;
        }
    }

    // CRUD Operations
    async getTasks() {
        return this.request('/tasks');
    }

    async getTask(id) {
        return this.request(`/tasks/${id}`);
    }

    async createTask(taskData) {
        return this.request('/tasks', {
            method: 'POST',
            body: JSON.stringify(taskData)
        });
    }

    async updateTask(id, taskData) {
        return this.request(`/tasks/${id}`, {
            method: 'PUT',
            body: JSON.stringify(taskData)
        });
    }

    async deleteTask(id) {
        return this.request(`/tasks/${id}`, {
            method: 'DELETE'
        });
    }
}

// Initialize the application
document.addEventListener('DOMContentLoaded', () => {
    window.taskManager = new TaskManager();
    window.apiService = new APIService();
    
    console.log('Smart Task Manager initialized successfully!');
    console.log('API Service ready for REST API integration');
});

// Export for potential module usage
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { TaskManager, APIService };
}