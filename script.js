/* My To-Do List — vanilla JavaScript */

// ---------- Constants & state ----------
const STORAGE_KEY = "myTodoList.tasks";
let tasks = [];            // array of { id, text, deadline, completed }
let currentFilter = "all"; // "all" | "completed" | "pending"
let searchTerm = "";
let toastTimer;

// ---------- DOM references ----------
const form = document.querySelector("#task-form");
const taskInput = document.querySelector("#task-input");
const dateInput = document.querySelector("#task-date");
const errorEl = document.querySelector("#form-error");
const listEl = document.querySelector("#task-list");
const emptyEl = document.querySelector("#empty-state");
const searchInput = document.querySelector("#search-input");
const filterBtns = document.querySelectorAll(".filter-btn");
const clearBtn = document.querySelector("#clear-all");
const toastEl = document.querySelector("#toast");

// ---------- Local storage ----------
/** Save the tasks array to localStorage. */
function saveTasks() {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(tasks));
  } catch (err) {
    showToast("Could not save tasks in this browser.", true);
  }
}

/** Load tasks from localStorage (falls back to an empty list). */
function loadTasks() {
  try {
    const saved = JSON.parse(localStorage.getItem(STORAGE_KEY));
    tasks = Array.isArray(saved) ? saved : [];
  } catch (err) {
    tasks = [];
  }
}

// ---------- Helpers ----------
/** Generate a unique ID for a task. */
function generateId() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
}

/** Today's date as YYYY-MM-DD (local time), for overdue checks. */
function todayString() {
  const d = new Date();
  const pad = (n) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

/** Format a YYYY-MM-DD string for display. */
function formatDate(value) {
  return new Date(value + "T00:00:00").toLocaleDateString(undefined, {
    year: "numeric", month: "short", day: "numeric",
  });
}

/** Show a short message at the bottom of the screen. */
function showToast(message, isError = false) {
  toastEl.textContent = message;
  toastEl.classList.toggle("error", isError);
  toastEl.classList.add("show");
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => toastEl.classList.remove("show"), 2200);
}

// ---------- Core features ----------
/** Validate the form and add a new task. */
function addTask() {
  const text = taskInput.value.trim();

  // Form validation: no empty tasks
  if (text === "") {
    errorEl.textContent = "Enter a task description before adding.";
    taskInput.classList.add("invalid");
    taskInput.focus();
    return;
  }
  errorEl.textContent = "";
  taskInput.classList.remove("invalid");

  tasks.push({ id: generateId(), text, deadline: dateInput.value, completed: false });
  saveTasks();
  renderTasks();

  taskInput.value = "";
  dateInput.value = "";
  taskInput.focus();
  showToast("Task added successfully!");
}

/** Flip the completed state of a task. */
function toggleTask(id) {
  tasks = tasks.map((t) => (t.id === id ? { ...t, completed: !t.completed } : t));
  saveTasks();
  renderTasks();
}

/** Remove one task. */
function deleteTask(id) {
  tasks = tasks.filter((t) => t.id !== id);
  saveTasks();
  renderTasks();
  showToast("Task deleted.");
}

/** Remove every task after confirmation. */
function clearAllTasks() {
  if (tasks.length === 0) {
    showToast("There are no tasks to clear.", true);
    return;
  }
  if (confirm("Delete all tasks? This cannot be undone.")) {
    tasks = [];
    saveTasks();
    renderTasks();
    showToast("All tasks cleared.");
  }
}

/** Return the tasks matching the current filter and search term. */
function filterTasks() {
  return tasks.filter((t) => {
    const matchesFilter =
      currentFilter === "all" ||
      (currentFilter === "completed" && t.completed) ||
      (currentFilter === "pending" && !t.completed);
    const matchesSearch = t.text.toLowerCase().includes(searchTerm.toLowerCase());
    return matchesFilter && matchesSearch;
  });
}

/** Update the dashboard numbers and progress bar. */
function updateProgress() {
  const total = tasks.length;
  const done = tasks.reduce((sum, t) => sum + (t.completed ? 1 : 0), 0);
  const percent = total === 0 ? 0 : Math.round((done / total) * 100);

  document.querySelector("#stat-total").textContent = total;
  document.querySelector("#stat-done").textContent = done;
  document.querySelector("#stat-pending").textContent = total - done;
  document.querySelector("#stat-percent").textContent = percent + "%";
  document.querySelector("#progress-fill").style.width = percent + "%";
  document.querySelector("#progress").setAttribute("aria-valuenow", percent);
  document.querySelector("#progress-text").innerHTML =
    `${done} of ${total} tasks completed<br>${percent}% productivity progress.`;
}

/** Build one <li> for a task (textContent keeps user input safe). */
function createTaskElement(task) {
  const li = document.createElement("li");
  li.className = "task" + (task.completed ? " done" : "");
  li.dataset.id = task.id;

  const checkbox = document.createElement("input");
  checkbox.type = "checkbox";
  checkbox.checked = task.completed;
  checkbox.setAttribute("aria-label", "Mark as completed: " + task.text);

  const body = document.createElement("div");
  body.className = "task-body";
  const text = document.createElement("div");
  text.className = "task-text";
  text.textContent = task.text;
  const date = document.createElement("div");
  date.className = "task-date";
  if (task.deadline) {
    date.textContent = "Due " + formatDate(task.deadline);
    if (!task.completed && task.deadline < todayString()) date.classList.add("overdue");
  } else {
    date.textContent = "No deadline";
  }
  body.append(text, date);

  const badge = document.createElement("span");
  badge.className = "badge " + (task.completed ? "completed" : "pending");
  badge.textContent = task.completed ? "Completed" : "Pending";

  const del = document.createElement("button");
  del.className = "delete-btn";
  del.setAttribute("aria-label", "Delete task: " + task.text);
  del.innerHTML =
    '<svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 6h18M8 6V4h8v2M6 6l1 14h10l1-14M10 10v6M14 10v6"/></svg>';

  li.append(checkbox, body, badge, del);
  return li;
}

/** Re-draw the list and dashboard. */
function renderTasks() {
  const visible = filterTasks();
  listEl.replaceChildren(...visible.map(createTaskElement));

  // Friendly empty-state messages
  emptyEl.hidden = visible.length > 0;
  if (visible.length === 0) {
    emptyEl.textContent = tasks.length === 0
      ? "No tasks yet. Add your first task above."
      : "No tasks match your search or filter.";
  }
  updateProgress();
}

// ---------- Event listeners ----------
// Submit handles both the Add Task button and pressing Enter
form.addEventListener("submit", (e) => {
  e.preventDefault();
  addTask();
});

taskInput.addEventListener("input", () => {
  errorEl.textContent = "";
  taskInput.classList.remove("invalid");
});

// Event delegation: one listener handles every task's checkbox and delete button
listEl.addEventListener("change", (e) => {
  if (e.target.matches('input[type="checkbox"]')) {
    toggleTask(e.target.closest(".task").dataset.id);
  }
});
listEl.addEventListener("click", (e) => {
  const btn = e.target.closest(".delete-btn");
  if (btn) deleteTask(btn.closest(".task").dataset.id);
});

filterBtns.forEach((btn) =>
  btn.addEventListener("click", () => {
    currentFilter = btn.dataset.filter;
    filterBtns.forEach((b) => b.classList.toggle("active", b === btn));
    renderTasks();
  })
);

searchInput.addEventListener("input", () => {
  searchTerm = searchInput.value.trim();
  renderTasks();
});

clearBtn.addEventListener("click", clearAllTasks);

// ---------- Start ----------
loadTasks();
renderTasks();