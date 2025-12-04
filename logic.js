// DOM elements
const taskInput = document.getElementById('task-input');
const categorySelect = document.getElementById('category-select');
const dueDateInput = document.getElementById('due-date-input');
const addBtn = document.getElementById('add-btn');
const searchInput = document.getElementById('search-input');
const taskList = document.getElementById('task-list');
const filterBtns = document.querySelectorAll('.filter-btn');
const exportBtn = document.getElementById('export-btn');
const importBtn = document.getElementById('import-btn');
const importInput = document.getElementById('import-input');
const undoBtn = document.getElementById('undo-btn');
const themeToggle = document.getElementById('theme-toggle');
const progressFill = document.getElementById('progress-fill');
const progressText = document.getElementById('progress-text');

// Task array and undo stack
let tasks = [];
let deletedTask = null; // For undo functionality

// Keep track of active filter for re-renders
let currentFilter = 'all';

// Load tasks from localStorage
function loadTasks() {
    const storedTasks = localStorage.getItem('tasks');
    const storedTheme = localStorage.getItem('theme');
    if (storedTasks) {
        tasks = JSON.parse(storedTasks);
        renderTasks();
    }
    if (storedTheme === 'dark') {
        document.body.classList.add('dark-mode');
        themeToggle.textContent = '☀️ Light Mode';
    }
}

// Save tasks to localStorage
function saveTasks() {
    localStorage.setItem('tasks', JSON.stringify(tasks));
}

// Update progress bar
function updateProgress() {
    const completed = tasks.filter(t => t.completed).length;
    const total = tasks.length;
    const percentage = total > 0 ? (completed / total) * 100 : 0;
    if (progressFill) progressFill.style.width = `${percentage}%`;
    if (progressText) progressText.textContent = `${completed}/${total} completed`;
}

// Render tasks with filters and search
function renderTasks(filter = currentFilter, search = '') {
    taskList.innerHTML = '';
    const filteredTasks = tasks.filter(task => {
        const matchesFilter = filter === 'all' || (filter === 'completed' && task.completed) || (filter === 'pending' && !task.completed);
        const matchesSearch = task.text.toLowerCase().includes(search.toLowerCase());
        return matchesFilter && matchesSearch;
    });

    filteredTasks.forEach((task, index) => {
        const li = document.createElement('li');
        li.className = 'task-item fade-in'; // Add fade-in animation
        li.draggable = true; // Enable drag-and-drop
        li.dataset.id = task.id;

        if (task.completed) li.classList.add('completed');
        if (task.dueDate && new Date(task.dueDate) < new Date() && !task.completed) li.classList.add('overdue');

        // Checkbox
        const checkbox = document.createElement('input');
        checkbox.type = 'checkbox';
        checkbox.className = 'task-checkbox';
        checkbox.checked = task.completed;
        checkbox.addEventListener('change', () => toggleComplete(task.id));

        // Task text and details
        const textSpan = document.createElement('span');
        textSpan.className = 'task-text';
        textSpan.textContent = task.text;

        const detailsSpan = document.createElement('span');
        detailsSpan.className = 'task-details';
        detailsSpan.textContent = `${task.category} ${task.dueDate ? `- Due: ${task.dueDate}` : ''}`;

        // Actions
        const editBtn = document.createElement('button');
        editBtn.className = 'edit-btn';
        editBtn.textContent = 'Edit';
        editBtn.addEventListener('click', () => editTask(task.id));

        const deleteBtn = document.createElement('button');
        deleteBtn.className = 'delete-btn';
        deleteBtn.textContent = 'Delete';
        deleteBtn.addEventListener('click', () => deleteTask(task.id));

        li.appendChild(checkbox);
        li.appendChild(textSpan);
        li.appendChild(detailsSpan);
        const actionsDiv = document.createElement('div');
        actionsDiv.className = 'task-actions';
        actionsDiv.appendChild(editBtn);
        actionsDiv.appendChild(deleteBtn);
        li.appendChild(actionsDiv);

        // Drag events
        li.addEventListener('dragstart', (e) => {
            // store the index within the filtered list (as string)
            e.dataTransfer.setData('text/plain', String(index));
            li.classList.add('dragging');
        });
        li.addEventListener('dragend', () => li.classList.remove('dragging'));
        li.addEventListener('dragover', (e) => e.preventDefault());
        li.addEventListener('drop', (e) => {
            e.preventDefault();
            const draggedIndex = parseInt(e.dataTransfer.getData('text/plain'), 10);
            const targetIndex = index;
            if (!Number.isNaN(draggedIndex) && draggedIndex !== targetIndex) {
                // We are reordering in the full tasks array.
                // To keep original content intact and avoid heavy refactor,
                // translate filtered indexes to actual indexes in tasks array.
                // Find ids in the filteredTasks list to map to real positions.
                const draggedTaskId = filteredTasks[draggedIndex].id;
                const targetTaskId = filteredTasks[targetIndex].id;
                const realDraggedIndex = tasks.findIndex(t => t.id === draggedTaskId);
                const realTargetIndex = tasks.findIndex(t => t.id === targetTaskId);
                if (realDraggedIndex > -1 && realTargetIndex > -1 && realDraggedIndex !== realTargetIndex) {
                    const [removed] = tasks.splice(realDraggedIndex, 1);
                    tasks.splice(realTargetIndex, 0, removed);
                    saveTasks();
                    renderTasks(filter, search);
                }
            }
        });

        taskList.appendChild(li);
    });
    updateProgress();
}

// Add task
function addTask() {
    const text = taskInput.value.trim();
    const category = categorySelect.value;
    const dueDate = dueDateInput.value;
    if (text) {
        const newTask = { id: Date.now(), text, category, dueDate, completed: false };
        tasks.push(newTask);
        saveTasks();
        renderTasks();
        taskInput.value = '';
        dueDateInput.value = '';
    }
}

// Toggle complete
function toggleComplete(id) {
    const task = tasks.find(t => t.id === id);
    if (task) {
        task.completed = !task.completed;
        saveTasks();
        renderTasks();
    }
}

// Edit task
function editTask(id) {
    const task = tasks.find(t => t.id === id);
    if (task) {
        const newText = prompt('Edit task:', task.text);
        if (newText !== null && newText.trim()) {
            task.text = newText.trim();
            saveTasks();
            renderTasks();
        }
    }
}

// Delete task with undo
function deleteTask(id) {
    const index = tasks.findIndex(t => t.id === id);
    if (index > -1) {
        deletedTask = tasks.splice(index, 1)[0];
        saveTasks();
        renderTasks();
        if (undoBtn) {
            undoBtn.style.display = 'block';
            setTimeout(() => {
                if (undoBtn) undoBtn.style.display = 'none';
            }, 5000); // Hide after 5s
        }
    }
}

// Undo delete
function undoDelete() {
    if (deletedTask) {
        tasks.push(deletedTask);
        saveTasks();
        renderTasks();
        deletedTask = null;
        if (undoBtn) undoBtn.style.display = 'none';
    }
}

// Export tasks
function exportTasks() {
    const dataStr = JSON.stringify(tasks, null, 2);
    const blob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'tasks.json';
    a.click();
    URL.revokeObjectURL(url);
}

// Import tasks
function importTasks(event) {
    const file = event.target.files[0];
    if (file) {
        const reader = new FileReader();
        reader.onload = (e) => {
            try {
                const importedTasks = JSON.parse(e.target.result);
                tasks = [...tasks, ...importedTasks];
                saveTasks();
                renderTasks();
            } catch (err) {
                console.error('Failed to import tasks:', err);
                alert('Invalid JSON file.');
            } finally {
                // clear the input so same file can be selected again if needed
                if (importInput) importInput.value = '';
            }
        };
        reader.onerror = () => {
            console.error('FileReader error:', reader.error);
            alert('Error reading file.');
            if (importInput) importInput.value = '';
        };
        reader.readAsText(file);
    }
}

// Theme toggle
function toggleTheme() {
    const isDark = document.body.classList.toggle('dark-mode');
    if (isDark) {
        themeToggle.textContent = '☀️ Light Mode';
        localStorage.setItem('theme', 'dark');
    } else {
        themeToggle.textContent = '🌙 Dark Mode';
        localStorage.setItem('theme', 'light');
    }
}

// Filter buttons handler
filterBtns.forEach(btn => {
    btn.addEventListener('click', () => {
        document.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        currentFilter = btn.dataset.filter || 'all';
        renderTasks(currentFilter, searchInput ? searchInput.value : '');
    });
});

// Search handler
if (searchInput) {
    searchInput.addEventListener('input', () => {
        renderTasks(currentFilter, searchInput.value);
    });
}

// Buttons / inputs event listeners
if (addBtn) addBtn.addEventListener('click', addTask);
if (exportBtn) exportBtn.addEventListener('click', exportTasks);
if (importBtn) importBtn.addEventListener('click', () => {
    if (importInput) importInput.click();
});
if (importInput) importInput.addEventListener('change', importTasks);
if (undoBtn) undoBtn.addEventListener('click', undoDelete);
if (themeToggle) themeToggle.addEventListener('click', toggleTheme);

// Initial load
loadTasks();
renderTasks();
