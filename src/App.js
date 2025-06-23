import "@xyflow/react/dist/style.css";
import "./App.css";

import React, { useState, useEffect, useMemo } from "react";
import {
  DndContext,
  PointerSensor,
  useSensor,
  useSensors,
} from "@dnd-kit/core";
import { ReactFlowProvider } from "@xyflow/react";
import { format, parseISO } from "date-fns";
import {
  Zap,
  List,
  Activity,
  Plus,
  Search,
  Star,
  Inbox,
  ChevronUp,
  ChevronDown,
} from "lucide-react";

import { ThemeProvider } from "./context/ThemeContext";
import { playAlarm } from "./services/audioService";
import {
  requestNotificationPermission,
  showNotification,
} from "./services/notificationService";
import { newTodoTemplate } from "./utils/constants";
import { getSortDate } from "./utils/dateUtils";

import { Droppable } from "./components/Droppable";
import { PaginationControls } from "./components/PaginationControls";
import { ThemeToggle } from "./components/ThemeToggle";
import { TodoItem } from "./components/TodoItem";
import { TodoModal } from "./components/TodoModal";
import { TimelineView } from "./components/timeline/TimelineView";

export default function App() {
  const [todos, setTodos] = useState(() => {
    try {
      const savedTodos = localStorage.getItem("todos");
      return savedTodos ? JSON.parse(savedTodos) : [];
    } catch {
      return [];
    }
  });

  const [sort, setSort] = useState({ by: "date", order: "asc" });
  const [isCreating, setIsCreating] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [notificationPermission, setNotificationPermission] =
    useState("default");
  const [isCompletedExpanded, setIsCompletedExpanded] = useState(true);
  const [view, setView] = useState("list");

  const [importantPage, setImportantPage] = useState(1);
  const [otherPage, setOtherPage] = useState(1);
  const itemsPerPage = 10;
  const [editingTodoId, setEditingTodoId] = useState(null);

  useEffect(() => {
    localStorage.setItem("todos", JSON.stringify(todos));
  }, [todos]);

  useEffect(() => {
    if ("Notification" in window) {
      setNotificationPermission(Notification.permission);
    }
  }, []);

  useEffect(() => {
    const timeouts = [];
    todos.forEach((todo) => {
      if (!todo.completed && todo.deadline && todo.reminders.length > 0) {
        todo.reminders.forEach((reminder) => {
          const deadlineDate = parseISO(todo.deadline);
          const reminderTime = new Date(
            deadlineDate.getTime() - reminder.minutesBefore * 60 * 1000
          );

          if (reminderTime > new Date()) {
            const timeoutId = setTimeout(() => {
              const notifTitle = `Reminder: ${todo.title}`;
              const notifOptions = {
                body: `Due at ${format(deadlineDate, "h:mm a")}.`,
              };

              if (reminder.type === "notification")
                showNotification(notifTitle, notifOptions);
              if (reminder.type === "alarm") playAlarm();
              if (reminder.type === "both") {
                showNotification(notifTitle, notifOptions);
                playAlarm();
              }
            }, reminderTime.getTime() - new Date().getTime());
            timeouts.push(timeoutId);
          }
        });
      }
    });

    return () => {
      timeouts.forEach(clearTimeout);
    };
  }, [todos]);

  const handleRequestNotification = async () => {
    const permission = await requestNotificationPermission();
    setNotificationPermission(permission);
  };

  const handleCreateTodo = (newTodoData) => {
    const newTodo = {
      ...newTodoData,
      id: Date.now(),
    };
    setTodos([newTodo, ...todos]);
    setIsCreating(false);
  };

  const handleUpdateTodo = (id, updates) => {
    setTodos(todos.map((t) => (t.id === id ? { ...t, ...updates } : t)));
  };

  const handleDeleteTodo = (id) => {
    setTodos(todos.filter((t) => t.id !== id));
  };

  // Find the full todo object based on the ID.
  // We use useMemo to prevent recalculating this on every render.
  const todoToEdit = useMemo(
    () => todos.find((todo) => todo.id === editingTodoId),
    [todos, editingTodoId]
  );

  // This function will be passed down to TodoItem to open the modal.
  const handleStartEdit = (id) => {
    setEditingTodoId(id);
  };

  // This function handles the save action from the edit modal.
  const handleSaveEdit = (updatedTodo) => {
    handleUpdateTodo(updatedTodo.id, updatedTodo);
    setEditingTodoId(null); // Close the modal after saving
  };

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    })
  );

  const handleDragEnd = (event) => {
    const { active, over } = event;
    if (over && active.id !== over.id) {
      const todoId = active.id;
      const isStarred = active.data.current.isStarred;
      const targetContainer = over.id;

      if (targetContainer === "important-tasks" && !isStarred) {
        handleUpdateTodo(todoId, { isStarred: true });
      } else if (targetContainer === "other-tasks" && isStarred) {
        handleUpdateTodo(todoId, { isStarred: false });
      }
    }
  };

  const {
    paginatedImportantTasks,
    paginatedOtherTasks,
    completedTodos,
    totalImportantPages,
    totalOtherPages,
    timelineTasks,
  } = useMemo(() => {
    const filtered = todos.filter((todo) =>
      todo.title.toLowerCase().includes(searchQuery.toLowerCase())
    );

    const sorted = [...filtered].sort((a, b) => {
      if (sort.by === "title") {
        return a.title.localeCompare(b.title) * (sort.order === "asc" ? 1 : -1);
      }
      if (sort.by === "date") {
        const dateA = getSortDate(a);
        const dateB = getSortDate(b);
        if (dateA === Infinity && dateB !== Infinity) return 1;
        if (dateB === Infinity && dateA !== Infinity) return -1;
        if (dateA === Infinity && dateB === Infinity) return 0;
        return (dateA - dateB) * (sort.order === "asc" ? 1 : -1);
      }
      return 0;
    });

    const incomplete = sorted.filter((t) => !t.completed);
    const completed = sorted.filter((t) => t.completed);
    const importantTasks = incomplete.filter((t) => t.isStarred);
    const otherTasks = incomplete.filter((t) => !t.isStarred);

    const totalImportantPages = Math.ceil(importantTasks.length / itemsPerPage);
    const totalOtherPages = Math.ceil(otherTasks.length / itemsPerPage);

    const importantStartIndex = (importantPage - 1) * itemsPerPage;
    const paginatedImportant = importantTasks.slice(
      importantStartIndex,
      importantStartIndex + itemsPerPage
    );

    const otherStartIndex = (otherPage - 1) * itemsPerPage;
    const paginatedOther = otherTasks.slice(
      otherStartIndex,
      otherStartIndex + itemsPerPage
    );

    return {
      paginatedImportantTasks: paginatedImportant,
      paginatedOtherTasks: paginatedOther,
      completedTodos: completed,
      totalImportantPages,
      totalOtherPages,
      timelineTasks: incomplete,
    };
  }, [todos, sort, searchQuery, importantPage, otherPage]);

  useEffect(() => {
    if (importantPage > totalImportantPages && totalImportantPages > 0) {
      setImportantPage(totalImportantPages);
    } else if (totalImportantPages === 0 && importantPage > 1) {
      setImportantPage(1);
    }
  }, [importantPage, totalImportantPages]);

  useEffect(() => {
    if (otherPage > totalOtherPages && totalOtherPages > 0) {
      setOtherPage(totalOtherPages);
    } else if (totalOtherPages === 0 && otherPage > 1) {
      setOtherPage(1);
    }
  }, [otherPage, totalOtherPages]);

  return (
    <ReactFlowProvider>
      <ThemeProvider>
        <div className="bg-gray-50 dark:bg-gray-900 min-h-screen font-sans text-gray-800 dark:text-gray-200">
          {isCreating && (
            <TodoModal
              todo={newTodoTemplate}
              onClose={() => setIsCreating(false)}
              onSave={handleCreateTodo}
            />
          )}
          {todoToEdit && (
            <TodoModal
              todo={todoToEdit}
              onClose={() => setEditingTodoId(null)}
              onSave={handleSaveEdit}
            />
          )}
          <div className="container mx-auto p-4 md:p-8 max-w-7xl">
            <header className="flex justify-between items-center mb-6">
              <div className="flex items-center space-x-3">
                <Zap className="text-blue-500" size={32} />
                <h1 className="text-3xl font-bold">TodoZen</h1>
              </div>
              <div className="flex items-center space-x-2">
                <button
                  onClick={() => setView("list")}
                  className={`p-2 rounded-full ${
                    view === "list"
                      ? "bg-blue-100 dark:bg-blue-900 text-blue-600 dark:text-blue-300"
                      : "hover:bg-gray-100 dark:hover:bg-gray-700"
                  }`}
                >
                  <List />
                </button>
                <button
                  onClick={() => setView("timeline")}
                  className={`p-2 rounded-full ${
                    view === "timeline"
                      ? "bg-blue-100 dark:bg-blue-900 text-blue-600 dark:text-blue-300"
                      : "hover:bg-gray-100 dark:hover:bg-gray-700"
                  }`}
                >
                  <Activity />
                </button>
                <ThemeToggle />
              </div>
            </header>

            {notificationPermission !== "granted" && (
              <div className="bg-yellow-100 dark:bg-yellow-900/50 border-l-4 border-yellow-500 text-yellow-700 dark:text-yellow-300 p-4 mb-6 rounded-r-lg flex justify-between items-center">
                <p>Enable notifications to get reminders.</p>
                <button
                  onClick={handleRequestNotification}
                  className="bg-yellow-500 text-white px-3 py-1 rounded text-sm font-semibold hover:bg-yellow-600"
                >
                  Enable
                </button>
              </div>
            )}

            <div className="flex justify-between items-center mb-6">
              <button
                onClick={() => setIsCreating(true)}
                className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors flex items-center space-x-2 shrink-0"
              >
                <Plus size={20} />
                <span>Add Task</span>
              </button>
              <div className="flex items-center space-x-4">
                <span className="text-sm text-gray-500">Sort by:</span>
                <select
                  value={sort.by}
                  onChange={(e) => setSort({ ...sort, by: e.target.value })}
                  className="bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-md px-2 py-1 text-sm focus:outline-none"
                >
                  <option value="date">Date</option>
                  <option value="title">Title</option>
                </select>
                <select
                  value={sort.order}
                  onChange={(e) => setSort({ ...sort, order: e.target.value })}
                  className="bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-md px-2 py-1 text-sm focus:outline-none"
                >
                  <option value="asc">
                    {sort.by === "title" ? "A-Z" : "Nearest"}
                  </option>
                  <option value="desc">
                    {sort.by === "title" ? "Z-A" : "Longer"}
                  </option>
                </select>
              </div>
            </div>

            {/* Search Bar*/}
            <div className="mb-8">
              <div className="flex items-center w-full px-3 border rounded-lg bg-white dark:bg-gray-800 border-gray-300 dark:border-gray-600 focus-within:ring-2 focus-within:ring-blue-500 transition-shadow duration-200">
                <Search
                  className="text-gray-400" // Icon is now a simple flex item.
                  size={20}
                />
                <input
                  type="text"
                  placeholder="Search tasks by title..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  // The input is now transparent and has no border or outline; it relies on its parent for styling.
                  className="w-full pl-2 pr-4 py-2 bg-transparent focus:outline-none"
                />
              </div>
            </div>

            {view === "list" && (
              <DndContext sensors={sensors} onDragEnd={handleDragEnd}>
                <div className="grid grid-cols-1 md:grid-cols-2 md:gap-8">
                  <div>
                    <div className="flex items-center mb-4">
                      <Star
                        className="mr-3 text-yellow-400 fill-current"
                        size={22}
                      />
                      <h2 className="text-xl font-bold">Important</h2>
                    </div>
                    <Droppable id="important-tasks">
                      {paginatedImportantTasks.length > 0 ? (
                        paginatedImportantTasks.map((todo) => (
                          <TodoItem
                            key={todo.id}
                            todo={todo}
                            onUpdate={handleUpdateTodo}
                            onDelete={handleDeleteTodo}
                            onStartEdit={handleStartEdit}
                          />
                        ))
                      ) : (
                        <div className="text-center py-10 px-4 border-2 border-dashed dark:border-gray-700 rounded-lg h-48 flex justify-center items-center">
                          <p className="text-gray-500">
                            Drop tasks here to mark as important.
                          </p>
                        </div>
                      )}
                    </Droppable>
                    <PaginationControls
                      currentPage={importantPage}
                      totalPages={totalImportantPages}
                      setCurrentPage={setImportantPage}
                    />
                  </div>

                  <div>
                    <div className="flex items-center mb-4 mt-8 md:mt-0">
                      <Inbox className="mr-3 text-gray-500" size={22} />
                      <h2 className="text-xl font-bold">Tasks</h2>
                    </div>
                    <Droppable id="other-tasks">
                      {paginatedOtherTasks.length > 0 ? (
                        paginatedOtherTasks.map((todo) => (
                          <TodoItem
                            key={todo.id}
                            todo={todo}
                            onUpdate={handleUpdateTodo}
                            onDelete={handleDeleteTodo}
                          />
                        ))
                      ) : (
                        <div className="text-center py-10 px-4 border-2 border-dashed dark:border-gray-700 rounded-lg">
                          <p className="text-gray-500">No other tasks.</p>
                        </div>
                      )}
                    </Droppable>
                    <PaginationControls
                      currentPage={otherPage}
                      totalPages={totalOtherPages}
                      setCurrentPage={setOtherPage}
                    />
                  </div>
                </div>
              </DndContext>
            )}

            {view === "timeline" && <TimelineView tasks={timelineTasks} />}

            {completedTodos.length > 0 && (
              <div className="mt-12">
                <div className="relative">
                  <div
                    className="absolute inset-0 flex items-center"
                    aria-hidden="true"
                  >
                    <div className="w-full border-t border-gray-300 dark:border-gray-600" />
                  </div>
                  <div
                    className="relative flex justify-center cursor-pointer"
                    onClick={() => setIsCompletedExpanded(!isCompletedExpanded)}
                  >
                    <div className="flex items-center bg-gray-50 dark:bg-gray-900 px-3">
                      <span className="text-lg font-medium text-gray-900 dark:text-gray-100">
                        Completed ({completedTodos.length})
                      </span>
                      {isCompletedExpanded ? (
                        <ChevronUp className="ml-2 h-5 w-5 text-gray-500" />
                      ) : (
                        <ChevronDown className="ml-2 h-5 w-5 text-gray-500" />
                      )}
                    </div>
                  </div>
                </div>
                <div
                  className={`transition-all duration-500 ease-in-out overflow-hidden ${
                    isCompletedExpanded ? "max-h-[5000px] mt-6" : "max-h-0"
                  }`}
                >
                  {completedTodos.map((todo) => (
                    <TodoItem
                      key={todo.id}
                      todo={todo}
                      onUpdate={handleUpdateTodo}
                      onDelete={handleDeleteTodo}
                      onStartEdit={handleStartEdit}
                    />
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </ThemeProvider>
    </ReactFlowProvider>
  );
}
