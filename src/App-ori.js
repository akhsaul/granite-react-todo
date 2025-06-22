import "@xyflow/react/dist/style.css";
import "./App.css";
import "./output.css";
import React, {
  useState,
  useEffect,
  useMemo,
  useCallback,
  createContext,
  useContext,
} from "react";
import {
  ChevronDown,
  ChevronUp,
  Plus,
  X,
  Edit,
  Save,
  Trash2,
  Bell,
  Zap,
  Moon,
  Sun,
  Clock,
  Calendar,
  Link as LinkIcon,
  CheckCircle,
  Circle,
  Star,
  Inbox,
  AlertTriangle,
  Search,
  ArrowLeft,
  ArrowRight,
  Globe,
  PlayCircle,
  ExternalLink,
} from "lucide-react";
import {
  format,
  parseISO,
  isPast,
  differenceInSeconds,
  isFuture,
} from "date-fns";
import ReactMarkdown from "react-markdown";
// For full GitHub-Flavored Markdown support (tables, strikethrough, etc.),
// you would install and import the 'remark-gfm' plugin in your local environment.
// Example: import remarkGfm from 'remark-gfm';
// Then, you would add it to the ReactMarkdown component: <ReactMarkdown remarkPlugins={[remarkGfm]}>...</ReactMarkdown>
// This import is removed here because 'remark-gfm' is not available in this sandboxed environment.

// -- CONTEXT FOR THEME -- //
const ThemeContext = createContext();

// NOTE: The BroadcastChannel implementation has been removed to fix a "Channel is closed" error.
// Theme syncing for the sticky note will now rely on localStorage.

const ThemeProvider = ({ children }) => {
  const [theme, setTheme] = useState(
    () => localStorage.getItem("todo-theme") || "light"
  );

  useEffect(() => {
    const root = window.document.documentElement;
    root.classList.remove("light", "dark");
    root.classList.add(theme);
    localStorage.setItem("todo-theme", theme);
  }, [theme]);

  const toggleTheme = () => {
    setTheme((prevTheme) => (prevTheme === "light" ? "dark" : "light"));
  };

  return (
    <ThemeContext.Provider value={{ theme, toggleTheme }}>
      {children}
    </ThemeContext.Provider>
  );
};

const useTheme = () => useContext(ThemeContext);

// -- MOCK DATA AND UTILS -- //
const generateInitialTodos = () => {
  const todos = [];
  for (let i = 1; i <= 25; i++) {
    const deadlineDate = new Date(
      new Date().getTime() + i * 24 * 60 * 60 * 1000
    );
    todos.push({
      id: i,
      title: `Task number ${i}`,
      description: `This is a sample description for task ${i}.`,
      completed: i > 22, // Last 3 are completed
      isExpanded: false,
      isStarred: i % 4 === 0, // Every 4th task is starred
      startDate: null,
      deadline: deadlineDate.toISOString(), // Stored as UTC
      meetingLink: "",
      reminders: [{ id: 1, minutesBefore: 30, type: "both" }],
      subTodos: [],
    });
  }
  // Add one urgent task
  todos.push({
    id: 26,
    title: "URGENT: Submit Final Report",
    description: "Final report is due in a few hours!",
    completed: false,
    isExpanded: true,
    isStarred: true,
    startDate: new Date(
      new Date().getTime() - 2 * 60 * 60 * 1000
    ).toISOString(), // Started 2 hours ago
    deadline: new Date(new Date().getTime() + 3 * 60 * 60 * 1000).toISOString(),
    meetingLink: "",
    reminders: [
      { id: 1, minutesBefore: 60, type: "notification" },
      { id: 2, minutesBefore: 15, type: "both" },
    ],
    subTodos: [],
  });
  // Add a task with a future start date
  todos.push({
    id: 27,
    title: "Prepare for Tokyo Presentation",
    description: "Begin preparing slides for the presentation in Tokyo.",
    completed: false,
    isExpanded: false,
    isStarred: true,
    startDate: "2025-06-18T09:00:00.000+09:00", // Example: 9 AM in JST
    deadline: "2025-06-20T17:00:00.000+09:00",
    meetingLink: "",
    reminders: [{ id: 1, minutesBefore: 60, type: "alarm" }],
    subTodos: [],
  });
  return todos;
};

const newTodoTemplate = {
  id: null,
  title: "",
  description: "",
  completed: false,
  isExpanded: true,
  isStarred: false,
  startDate: null,
  deadline: null,
  meetingLink: "",
  reminders: [],
  subTodos: [],
};

// -- AUDIO CONTEXT & NOTIFICATION UTILS -- //
let audioContext;
try {
  audioContext = new (window.AudioContext || window.webkitAudioContext)();
} catch (e) {
  console.error("Web Audio API is not supported in this browser.");
}

const playAlarm = () => {
  if (!audioContext) return;
  const oscillator = audioContext.createOscillator();
  const gainNode = audioContext.createGain();
  oscillator.connect(gainNode);
  gainNode.connect(audioContext.destination);
  oscillator.type = "sine";
  oscillator.frequency.setValueAtTime(440, audioContext.currentTime); // A4
  gainNode.gain.setValueAtTime(0.5, audioContext.currentTime);
  gainNode.gain.exponentialRampToValueAtTime(
    0.0001,
    audioContext.currentTime + 1
  );
  oscillator.start();
  setTimeout(() => oscillator.stop(), 1000);
};

const requestNotificationPermission = async () => {
  if (!("Notification" in window)) {
    console.warn("This browser does not support desktop notification");
    return "denied";
  }
  const permission = await Notification.requestPermission();
  return permission;
};

const showNotification = (title, options) => {
  if (Notification.permission === "granted") {
    new Notification(title, options);
  }
};

const timezones = [
  { label: "UTC-12:00", value: "-12:00" },
  { label: "UTC-11:00", value: "-11:00" },
  { label: "UTC-10:00", value: "-10:00" },
  { label: "UTC-09:00", value: "-09:00" },
  { label: "UTC-08:00", value: "-08:00" },
  { label: "UTC-07:00", value: "-07:00" },
  { label: "UTC-06:00", value: "-06:00" },
  { label: "UTC-05:00", value: "-05:00" },
  { label: "UTC-04:00", value: "-04:00" },
  { label: "UTC-03:00", value: "-03:00" },
  { label: "UTC-02:00", value: "-02:00" },
  { label: "UTC-01:00", value: "-01:00" },
  { label: "UTC+00:00", value: "+00:00" },
  { label: "UTC+01:00", value: "+01:00" },
  { label: "UTC+02:00", value: "+02:00" },
  { label: "UTC+03:00", value: "+03:00" },
  { label: "UTC+04:00", value: "+04:00" },
  { label: "UTC+05:00", value: "+05:00" },
  { label: "UTC+05:30", value: "+05:30" },
  { label: "UTC+05:45", value: "+05:45" },
  { label: "UTC+06:00", value: "+06:00" },
  { label: "UTC+07:00", value: "+07:00" },
  { label: "UTC+08:00", value: "+08:00" },
  { label: "UTC+08:45", value: "+08:45" },
  { label: "UTC+09:00", value: "+09:00" },
  { label: "UTC+09:30", value: "+09:30" },
  { label: "UTC+10:00", value: "+10:00" },
  { label: "UTC+11:00", value: "+11:00" },
  { label: "UTC+12:00", value: "+12:00" },
  { label: "UTC+13:00", value: "+13:00" },
  { label: "UTC+14:00", value: "+14:00" },
];

const getLocalTimezoneOffset = () => {
  const offset = -new Date().getTimezoneOffset();
  const sign = offset >= 0 ? "+" : "-";
  const hours = Math.floor(Math.abs(offset) / 60);
  const minutes = Math.abs(offset) % 60;
  return `${sign}${String(hours).padStart(2, "0")}:${String(minutes).padStart(
    2,
    "0"
  )}`;
};

// -- SUB-COMPONENTS -- //
const CountdownTimer = ({ deadline }) => {
  const [now, setNow] = useState(new Date());

  useEffect(() => {
    const timer = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  const totalSeconds = differenceInSeconds(parseISO(deadline), now);

  if (totalSeconds <= 0) {
    return <span className="text-red-500 font-bold">Overdue</span>;
  }

  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;

  return (
    <span className="font-mono text-orange-500 dark:text-orange-400">
      {String(hours).padStart(2, "0")}:{String(minutes).padStart(2, "0")}:
      {String(seconds).padStart(2, "0")}
    </span>
  );
};

const SubTodoItem = ({ subTodo, onToggle, onUpdate, onDelete }) => {
  const [isEditing, setIsEditing] = useState(false);
  const [text, setText] = useState(subTodo.title);

  const handleUpdate = () => {
    if (text.trim()) {
      onUpdate(subTodo.id, text.trim());
      setIsEditing(false);
    }
  };

  return (
    <div className="flex items-center space-x-2 py-1 group">
      <div onClick={() => onToggle(subTodo.id)} className="cursor-pointer">
        {subTodo.completed ? (
          <CheckCircle size={18} className="text-green-500" />
        ) : (
          <Circle size={18} className="text-gray-400 dark:text-gray-500" />
        )}
      </div>
      {isEditing ? (
        <input
          type="text"
          value={text}
          onChange={(e) => setText(e.target.value)}
          onBlur={handleUpdate}
          onKeyPress={(e) => e.key === "Enter" && handleUpdate()}
          className="flex-grow bg-transparent border-b border-blue-500 focus:outline-none text-sm"
          autoFocus
        />
      ) : (
        <span
          className={`flex-grow text-sm ${
            subTodo.completed
              ? "line-through text-gray-500 dark:text-gray-400"
              : "text-gray-700 dark:text-gray-300"
          }`}
        >
          {subTodo.title}
        </span>
      )}
      <div className="opacity-0 group-hover:opacity-100 transition-opacity flex items-center space-x-1">
        <button
          onClick={() => setIsEditing(!isEditing)}
          className="text-gray-500 hover:text-blue-500"
        >
          <Edit size={14} />
        </button>
        <button
          onClick={() => onDelete(subTodo.id)}
          className="text-gray-500 hover:text-red-500"
        >
          <Trash2 size={14} />
        </button>
      </div>
    </div>
  );
};

const reminderPresets = [
  { label: "5 minutes before", value: 5 },
  { label: "10 minutes before", value: 10 },
  { label: "15 minutes before", value: 15 },
  { label: "30 minutes before", value: 30 },
  { label: "1 hour before", value: 60 },
  { label: "8 hours before", value: 480 },
  { label: "1 day before", value: 1440 },
];

const AddReminder = ({ onAdd, existingReminders }) => {
  const [minutes, setMinutes] = useState(10);
  const [type, setType] = useState("both");
  const [selection, setSelection] = useState("10");
  const [customValue, setCustomValue] = useState(10);
  const [customUnit, setCustomUnit] = useState("minutes");
  const [error, setError] = useState("");

  useEffect(() => {
    let currentMinutes;
    if (selection === "custom") {
      const multipliers = { minutes: 1, hours: 60, days: 1440, weeks: 10080 };
      currentMinutes = customValue * multipliers[customUnit];
    } else {
      currentMinutes = parseInt(selection, 10);
    }
    setMinutes(currentMinutes);
  }, [selection, customValue, customUnit]);

  useEffect(() => {
    // Validation logic
    if (existingReminders.length >= 2) {
      setError("Maximum of 2 reminders reached.");
      return;
    }

    const newActions = type === "both" ? ["alarm", "notification"] : [type];
    const conflict = existingReminders.some((existing) => {
      if (existing.minutesBefore !== minutes) return false;
      const existingActions =
        existing.type === "both" ? ["alarm", "notification"] : [existing.type];
      return newActions.some((action) => existingActions.includes(action));
    });

    if (conflict) {
      setError("This reminder conflicts with an existing one.");
    } else {
      setError("");
    }
  }, [minutes, type, existingReminders]);

  const handleAdd = () => {
    if (!error) {
      onAdd({ id: Date.now(), minutesBefore: minutes, type });
    }
  };

  return (
    <div className="p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg space-y-3">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        <select
          value={selection}
          onChange={(e) => setSelection(e.target.value)}
          className="w-full p-2 border rounded bg-white dark:bg-gray-700 border-gray-300 dark:border-gray-600 focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          {reminderPresets.map((preset) => (
            <option key={preset.value} value={preset.value}>
              {preset.label}
            </option>
          ))}
          <option value="custom">Custom...</option>
        </select>
        <select
          value={type}
          onChange={(e) => setType(e.target.value)}
          className="w-full p-2 border rounded bg-white dark:bg-gray-700 border-gray-300 dark:border-gray-600 focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          <option value="both">Notification & Alarm</option>
          <option value="notification">Notification Only</option>
          <option value="alarm">Alarm Only</option>
        </select>
      </div>
      {selection === "custom" && (
        <div className="grid grid-cols-2 gap-3">
          <input
            type="number"
            min="1"
            value={customValue}
            onChange={(e) => setCustomValue(parseInt(e.target.value, 10) || 1)}
            className="w-full p-2 border rounded bg-white dark:bg-gray-700 border-gray-300 dark:border-gray-600 focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <select
            value={customUnit}
            onChange={(e) => setCustomUnit(e.target.value)}
            className="w-full p-2 border rounded bg-white dark:bg-gray-700 border-gray-300 dark:border-gray-600 focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="minutes">minutes</option>
            <option value="hours">hours</option>
            <option value="days">days</option>
            <option value="weeks">weeks</option>
          </select>
        </div>
      )}
      <button
        onClick={handleAdd}
        disabled={!!error}
        className="w-full py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600 transition-colors disabled:bg-gray-400 disabled:cursor-not-allowed"
      >
        {error || "Add Reminder"}
      </button>
    </div>
  );
};

const TodoModal = ({ todo, onClose, onSave }) => {
  const [editedTodo, setEditedTodo] = useState(todo);
  const [showError, setShowError] = useState(false);
  const [activeTab, setActiveTab] = useState("write");

  const [startDate, setStartDate] = useState("");
  const [startTimezone, setStartTimezone] = useState(getLocalTimezoneOffset());
  const [deadlineDate, setDeadlineDate] = useState("");
  const [deadlineTimezone, setDeadlineTimezone] = useState(
    getLocalTimezoneOffset()
  );

  useEffect(() => {
    setEditedTodo(todo);
    if (todo.startDate) {
      const dateTimePart = todo.startDate.substring(0, 16);
      setStartDate(dateTimePart);
      const match = todo.startDate.match(/[+-]\d{2}:\d{2}|Z$/);
      if (match) setStartTimezone(match[0] === "Z" ? "+00:00" : match[0]);
    } else {
      setStartDate("");
      setStartTimezone(getLocalTimezoneOffset());
    }

    if (todo.deadline) {
      const dateTimePart = todo.deadline.substring(0, 16);
      setDeadlineDate(dateTimePart);
      const match = todo.deadline.match(/[+-]\d{2}:\d{2}|Z$/);
      if (match) setDeadlineTimezone(match[0] === "Z" ? "+00:00" : match[0]);
    } else {
      setDeadlineDate("");
      setDeadlineTimezone(getLocalTimezoneOffset());
    }
  }, [todo]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setEditedTodo((prev) => ({ ...prev, [name]: value }));
  };

  const handleSave = () => {
    if (!editedTodo.title.trim()) {
      setShowError(true);
      return;
    }

    let finalTodo = { ...editedTodo };
    if (startDate) {
      finalTodo.startDate = `${startDate}:00.000${startTimezone}`;
    } else {
      finalTodo.startDate = null;
    }
    if (deadlineDate) {
      finalTodo.deadline = `${deadlineDate}:00.000${deadlineTimezone}`;
    } else {
      finalTodo.deadline = null;
    }

    onSave(finalTodo);
    onClose();
  };

  const addReminder = (reminder) => {
    setEditedTodo((prev) => ({
      ...prev,
      reminders: [...prev.reminders, reminder],
    }));
  };

  const deleteReminder = (id) => {
    setEditedTodo((prev) => ({
      ...prev,
      reminders: prev.reminders.filter((r) => r.id !== id),
    }));
  };

  const formatMinutes = (minutes) => {
    if (minutes < 60) return `${minutes}m`;
    if (minutes < 1440) return `${minutes / 60}h`;
    return `${minutes / 1440}d`;
  };

  const isNew = !todo.id;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-70 flex justify-center items-center z-50 p-4">
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl w-full max-w-2xl p-6 space-y-4 transform transition-all">
        <div className="flex justify-between items-center">
          <h2 className="text-2xl font-bold text-gray-800 dark:text-white">
            {isNew ? "Create New Task" : "Edit Task"}
          </h2>
          <button
            onClick={onClose}
            className="p-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700"
          >
            <X size={20} />
          </button>
        </div>

        <div>
          <input
            type="text"
            name="title"
            value={editedTodo.title}
            onChange={handleChange}
            className={`w-full p-2 border rounded bg-gray-50 dark:bg-gray-700 ${
              showError
                ? "border-red-500"
                : "border-gray-300 dark:border-gray-600"
            } focus:outline-none focus:ring-2 focus:ring-blue-500`}
            placeholder="Task Title"
          />
          {showError && (
            <p className="text-red-500 text-xs mt-1">Title is required.</p>
          )}
        </div>

        <div className="border rounded-md border-gray-300 dark:border-gray-600">
          <div className="flex border-b border-gray-300 dark:border-gray-600 bg-gray-50 dark:bg-gray-800 rounded-t-md">
            <button
              type="button"
              onClick={() => setActiveTab("write")}
              className={`px-4 py-2 text-sm font-medium focus:outline-none ${
                activeTab === "write"
                  ? "border-b-2 border-blue-500 text-blue-600 dark:text-blue-400"
                  : "text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-700"
              }`}
            >
              Write
            </button>
            <button
              type="button"
              onClick={() => setActiveTab("preview")}
              className={`px-4 py-2 text-sm font-medium focus:outline-none ${
                activeTab === "preview"
                  ? "border-b-2 border-blue-500 text-blue-600 dark:text-blue-400"
                  : "text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-700"
              }`}
            >
              Preview
            </button>
          </div>
          <div className="p-1 min-h-[160px]">
            {activeTab === "write" ? (
              <textarea
                name="description"
                value={editedTodo.description}
                onChange={handleChange}
                className="w-full p-2 bg-transparent focus:outline-none h-40 resize-none"
                placeholder="Task Description (Markdown supported)"
              />
            ) : (
              <div className="prose prose-sm dark:prose-invert max-w-none h-40 overflow-y-auto p-2">
                <ReactMarkdown>
                  {editedTodo.description || "Nothing to preview."}
                </ReactMarkdown>
              </div>
            )}
          </div>
        </div>

        <div className="flex items-center space-x-2">
          <LinkIcon className="text-gray-500" size={20} />
          <input
            type="text"
            name="meetingLink"
            value={editedTodo.meetingLink}
            onChange={handleChange}
            className="w-full p-2 border rounded bg-gray-50 dark:bg-gray-700 border-gray-300 dark:border-gray-600 focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="Meeting Link"
          />
        </div>

        <div className="space-y-2">
          <h4 className="font-semibold text-sm text-gray-600 dark:text-gray-400">
            Start Date (Optional)
          </h4>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="flex items-center space-x-2">
              <PlayCircle className="text-gray-500" size={20} />
              <input
                type="datetime-local"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="w-full p-2 border rounded bg-gray-50 dark:bg-gray-700 border-gray-300 dark:border-gray-600 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div className="flex items-center space-x-2">
              <Globe className="text-gray-500" size={20} />
              <select
                value={startTimezone}
                onChange={(e) => setStartTimezone(e.target.value)}
                className="w-full p-2 border rounded bg-gray-50 dark:bg-gray-700 border-gray-300 dark:border-gray-600 focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                {timezones.map((tz) => (
                  <option key={tz.value} value={tz.value}>
                    {tz.label}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>

        <div className="space-y-2">
          <h4 className="font-semibold text-sm text-gray-600 dark:text-gray-400">
            Due Date
          </h4>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="flex items-center space-x-2">
              <Calendar className="text-gray-500" size={20} />
              <input
                type="datetime-local"
                value={deadlineDate}
                onChange={(e) => setDeadlineDate(e.target.value)}
                className="w-full p-2 border rounded bg-gray-50 dark:bg-gray-700 border-gray-300 dark:border-gray-600 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div className="flex items-center space-x-2">
              <Globe className="text-gray-500" size={20} />
              <select
                value={deadlineTimezone}
                onChange={(e) => setDeadlineTimezone(e.target.value)}
                className="w-full p-2 border rounded bg-gray-50 dark:bg-gray-700 border-gray-300 dark:border-gray-600 focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                {timezones.map((tz) => (
                  <option key={tz.value} value={tz.value}>
                    {tz.label}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>

        <div>
          <h4 className="font-semibold mb-2 text-sm text-gray-600 dark:text-gray-400">
            Reminders
          </h4>
          <div className="space-y-2">
            {editedTodo.reminders.map((reminder) => (
              <div
                key={reminder.id}
                className="flex justify-between items-center bg-gray-100 dark:bg-gray-700 p-2 rounded-md"
              >
                <div className="flex items-center space-x-2">
                  <Bell
                    size={16}
                    className="text-gray-600 dark:text-gray-300"
                  />
                  <span>{formatMinutes(reminder.minutesBefore)} before</span>
                  <span className="text-xs px-2 py-0.5 rounded-full bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200 capitalize">
                    {reminder.type}
                  </span>
                </div>
                <button
                  onClick={() => deleteReminder(reminder.id)}
                  className="p-1 hover:bg-red-100 dark:hover:bg-red-800/50 rounded-full text-red-500"
                >
                  <X size={16} />
                </button>
              </div>
            ))}
          </div>
          <div className="mt-3">
            <AddReminder
              onAdd={addReminder}
              existingReminders={editedTodo.reminders}
            />
          </div>
        </div>

        <div className="flex justify-end space-x-4 pt-4">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-md bg-gray-200 dark:bg-gray-600 text-gray-800 dark:text-gray-200 hover:bg-gray-300 dark:hover:bg-gray-500 transition"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            className="px-4 py-2 rounded-md bg-blue-600 text-white hover:bg-blue-700 transition flex items-center space-x-2"
          >
            <Save size={18} />
            <span>Save Changes</span>
          </button>
        </div>
      </div>
    </div>
  );
};

const TodoItem = ({ todo, onUpdate, onDelete }) => {
  const [newSubTodo, setNewSubTodo] = useState("");
  const [isEditing, setIsEditing] = useState(false);
  // Get the current theme from context. This will be passed to the new window.
  const { theme } = useTheme();

  const handleToggle = () => onUpdate(todo.id, { completed: !todo.completed });
  const handleStarToggle = () =>
    onUpdate(todo.id, { isStarred: !todo.isStarred });
  const handleExpandToggle = () =>
    onUpdate(todo.id, { isExpanded: !todo.isExpanded });
  const handleDelete = () => onDelete(todo.id);
  const handleEdit = () => setIsEditing(true);

  // This function creates the HTML for the sticky note and opens it in a new window.
  const handleStickyNote = () => {
    // We serialize the 'todo' object into a JSON string to embed it directly in the new window's script.
    const todoDataString = JSON.stringify(todo);

    // The `theme` variable is taken directly from the component's context (`useTheme`).
    // It's injected into the <html> tag's class attribute immediately.
    // This avoids any race condition with localStorage.
    const stickyHTML = `
            <!DOCTYPE html>
            <html lang="en" class="${theme}">
            <head>
                <meta charset="UTF-8">
                <meta name="viewport" content="width=device-width, initial-scale=1.0">
                <title>Sticky: ${todo.title}</title>
                <script src="https://cdn.tailwindcss.com"><\/script>
                <style>
                    body {
                        -webkit-font-smoothing: antialiased;
                        -moz-osx-font-smoothing: grayscale;
                        overscroll-behavior: none;
                    }
                </style>
            </head>
            <body class="bg-yellow-100 dark:bg-gray-800 p-4 font-sans">
                <div id="sticky-content"></div>
                <script>
                    const todo = ${todoDataString};
                    const formatDisplayDate = (isoString, prefix) => {
                        if (!isoString) return '';
                        const date = new Date(isoString);
                        return prefix + new Intl.DateTimeFormat(undefined, {
                            year: 'numeric', month: 'short', day: 'numeric',
                            hour: 'numeric', minute: 'numeric'
                        }).format(date);
                    };

                    const isFuture = (isoString) => new Date(isoString) > new Date();

                    let displayDate = '';
                    if(todo.startDate && isFuture(todo.startDate)) {
                        displayDate = formatDisplayDate(todo.startDate, 'Starts: ');
                    } else if(todo.deadline) {
                        displayDate = formatDisplayDate(todo.deadline, 'Due: ');
                    }

                    const subTodosHTML = todo.subTodos.map(sub => \`
                        <li class="flex items-center space-x-2 text-sm">
                            <span class="\${sub.completed ? 'text-green-500' : 'text-gray-400'}">\${sub.completed ? '✔' : '○'}</span>
                            <span class="\${sub.completed ? 'line-through text-gray-500' : 'text-gray-800 dark:text-gray-200'}">\${sub.title}</span>
                        </li>
                    \`).join('');

                    const content = \`
                        <div class="bg-white dark:bg-gray-900 shadow-lg rounded-lg p-6 w-full max-w-md mx-auto">
                            <h1 class="text-2xl font-bold mb-2 text-gray-900 dark:text-white">\${todo.title}</h1>
                            \${displayDate ? \`<p class="text-sm text-gray-500 dark:text-gray-400 mb-4">\${displayDate}</p>\` : ''}
                            
                            <div class="prose prose-sm dark:prose-invert max-w-none mb-4 text-gray-700 dark:text-gray-300">
                               \${todo.description.replace(/\\n/g, '<br />')}
                            </div>
                            
                            \${todo.subTodos.length > 0 ? \`
                                <div>
                                    <h2 class="font-semibold mb-2 text-gray-800 dark:text-white">Sub-tasks</h2>
                                    <ul class="space-y-1">\${subTodosHTML}</ul>
                                </div>
                            \` : ''}
                        </div>
                    \`;

                    document.getElementById('sticky-content').innerHTML = content;
                <\/script>
            </body>
            </html>
        `;

    const stickyWindow = window.open(
      "",
      "_blank",
      "width=450,height=550,scrollbars=yes,resizable=yes"
    );
    if (stickyWindow) {
      stickyWindow.document.write(stickyHTML);
      stickyWindow.document.close();
    }
  };

  const handleSubTodoUpdate = (subTodoId, updates) => {
    const updatedSubTodos = todo.subTodos.map((st) =>
      st.id === subTodoId ? { ...st, ...updates } : st
    );
    onUpdate(todo.id, { subTodos: updatedSubTodos });
  };

  const handleSubTodoCreate = () => {
    if (newSubTodo.trim()) {
      const newSub = {
        id: Date.now(),
        title: newSubTodo.trim(),
        completed: false,
      };
      onUpdate(todo.id, { subTodos: [...todo.subTodos, newSub] });
      setNewSubTodo("");
    }
  };

  const handleSubTodoToggle = (subTodoId) => {
    const subTodo = todo.subTodos.find((st) => st.id === subTodoId);
    if (subTodo) {
      handleSubTodoUpdate(subTodoId, { completed: !subTodo.completed });
    }
  };

  const handleSubTodoTextUpdate = (subTodoId, newTitle) => {
    handleSubTodoUpdate(subTodoId, { title: newTitle });
  };

  const handleSubTodoDelete = (subTodoId) => {
    const updatedSubTodos = todo.subTodos.filter((st) => st.id !== subTodoId);
    onUpdate(todo.id, { subTodos: updatedSubTodos });
  };

  const handleSaveFromModal = (updatedTodo) => {
    onUpdate(updatedTodo.id, updatedTodo);
  };

  const { displayDate, displayIcon, isUrgent } = useMemo(() => {
    const hasStartDate = !!todo.startDate;
    const taskHasStarted = hasStartDate && isPast(parseISO(todo.startDate));

    let dateStringToFormat = null;
    let icon = <Clock size={14} />;
    let prefix = "Due: ";

    if (hasStartDate && !taskHasStarted) {
      dateStringToFormat = todo.startDate;
      icon = <PlayCircle size={14} className="text-green-500" />;
      prefix = "Starts: ";
    } else {
      dateStringToFormat = todo.deadline;
    }

    const formatted = dateStringToFormat
      ? new Intl.DateTimeFormat(undefined, {
          year: "numeric",
          month: "short",
          day: "numeric",
          hour: "numeric",
          minute: "numeric",
          timeZoneName: "short",
        }).format(parseISO(dateStringToFormat))
      : null;

    const urgent =
      todo.deadline &&
      differenceInSeconds(parseISO(todo.deadline), new Date()) < 24 * 60 * 60;

    return {
      displayDate: formatted ? prefix + formatted : null,
      displayIcon: icon,
      isUrgent: urgent,
    };
  }, [todo.startDate, todo.deadline]);

  const isDeadlinePast = todo.deadline && isPast(parseISO(todo.deadline));

  return (
    <div
      className={`bg-white dark:bg-gray-800 rounded-lg shadow-md transition-all duration-300 ease-in-out mb-4 border dark:border-gray-700 ${
        todo.completed ? "opacity-60" : ""
      } ${
        todo.isStarred && !todo.completed
          ? "border-yellow-400"
          : "border-gray-200"
      }`}
    >
      {isEditing && (
        <TodoModal
          todo={todo}
          onClose={() => setIsEditing(false)}
          onSave={handleSaveFromModal}
        />
      )}
      <div className="p-4 flex flex-col">
        {/* Header */}
        <div className="flex items-start space-x-4">
          <div onClick={handleToggle} className="cursor-pointer pt-1">
            {todo.completed ? (
              <CheckCircle size={24} className="text-green-500" />
            ) : (
              <Circle size={24} className="text-gray-400 dark:text-gray-500" />
            )}
          </div>
          <div className="flex-grow">
            <h3
              className={`font-bold text-lg ${
                todo.completed
                  ? "line-through text-gray-500 dark:text-gray-400"
                  : "text-gray-800 dark:text-white"
              }`}
            >
              {todo.title}
            </h3>
            <div className="flex items-center space-x-4 text-sm mt-1">
              {displayDate && (
                <div
                  className={`flex items-center space-x-2 ${
                    isDeadlinePast && !todo.completed
                      ? "text-red-500"
                      : "text-gray-500 dark:text-gray-400"
                  }`}
                >
                  {displayIcon}
                  <span>{displayDate}</span>
                </div>
              )}
              {isUrgent && !todo.completed && (
                <div className="flex items-center space-x-1">
                  <AlertTriangle size={14} className="text-orange-500" />
                  <CountdownTimer deadline={todo.deadline} />
                </div>
              )}
            </div>
          </div>
          <div className="flex items-center space-x-2">
            <button
              onClick={handleStickyNote}
              className="p-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-500 hover:text-yellow-500"
            >
              <ExternalLink size={18} />
            </button>
            <button
              onClick={handleStarToggle}
              className="p-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700"
              disabled={todo.completed}
            >
              <Star
                size={18}
                className={`${
                  todo.isStarred && !todo.completed
                    ? "text-yellow-400 fill-current"
                    : "text-gray-500 hover:text-yellow-400"
                }`}
              />
            </button>
            <button
              onClick={handleEdit}
              className="p-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-500 hover:text-blue-500"
            >
              <Edit size={18} />
            </button>
            <button
              onClick={handleDelete}
              className="p-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-500 hover:text-red-500"
            >
              <Trash2 size={18} />
            </button>
            <button
              onClick={handleExpandToggle}
              className="p-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-600 dark:text-gray-300"
            >
              {todo.isExpanded ? (
                <ChevronUp size={20} />
              ) : (
                <ChevronDown size={20} />
              )}
            </button>
          </div>
        </div>

        {/* Collapsible Content */}
        <div
          className={`transition-all duration-500 ease-in-out overflow-hidden ${
            todo.isExpanded ? "max-h-[1000px] mt-4" : "max-h-0"
          }`}
        >
          <div className="pl-10 space-y-3">
            {todo.description && (
              <div className="prose prose-sm dark:prose-invert max-w-none text-gray-600 dark:text-gray-300">
                <ReactMarkdown>{todo.description}</ReactMarkdown>
              </div>
            )}
            {todo.meetingLink && (
              <div className="flex items-center space-x-2">
                <LinkIcon size={16} className="text-blue-500" />
                <a
                  href={todo.meetingLink}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-blue-500 hover:underline text-sm truncate"
                >
                  {todo.meetingLink}
                </a>
              </div>
            )}

            {/* Sub-Todos */}
            <div className="space-y-1">
              {todo.subTodos.map((st) => (
                <SubTodoItem
                  key={st.id}
                  subTodo={st}
                  onToggle={() => handleSubTodoToggle(st.id)}
                  onUpdate={handleSubTodoTextUpdate}
                  onDelete={() => handleSubTodoDelete(st.id)}
                />
              ))}
            </div>

            {/* Add sub-todo form */}
            <div className="flex items-center space-x-2 pt-2">
              <input
                type="text"
                value={newSubTodo}
                onChange={(e) => setNewSubTodo(e.target.value)}
                onKeyPress={(e) => e.key === "Enter" && handleSubTodoCreate()}
                placeholder="Add a sub-task..."
                className="flex-grow bg-gray-100 dark:bg-gray-700 rounded-md py-1 px-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <button
                onClick={handleSubTodoCreate}
                className="p-1.5 rounded-md bg-blue-500 text-white hover:bg-blue-600"
              >
                <Plus size={16} />
              </button>
            </div>
          </div>
        </div>
        {!todo.isExpanded && todo.subTodos.length > 0 && (
          <div className="pl-10 mt-2 text-sm text-gray-500 dark:text-gray-400">
            {todo.subTodos.filter((st) => !st.completed).length} of{" "}
            {todo.subTodos.length} sub-tasks remaining
          </div>
        )}
      </div>
    </div>
  );
};

const PaginationControls = ({ currentPage, totalPages, setCurrentPage }) => {
  if (totalPages <= 1) return null;

  return (
    <div className="flex justify-center items-center mt-4 space-x-4">
      <button
        onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
        disabled={currentPage === 1}
        className="flex items-center space-x-2 px-3 py-1 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-md disabled:opacity-50 disabled:cursor-not-allowed text-sm"
      >
        <ArrowLeft size={16} />
        <span>Previous</span>
      </button>
      <span className="text-gray-700 dark:text-gray-300 text-sm">
        Page {currentPage} of {totalPages}
      </span>
      <button
        onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
        disabled={currentPage === totalPages}
        className="flex items-center space-x-2 px-3 py-1 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-md disabled:opacity-50 disabled:cursor-not-allowed text-sm"
      >
        <span>Next</span>
        <ArrowRight size={16} />
      </button>
    </div>
  );
};

// -- MAIN APP COMPONENT -- //
export default function App() {
  const [todos, setTodos] = useState(() => {
    try {
      const savedTodos = localStorage.getItem("todos");
      return savedTodos ? JSON.parse(savedTodos) : generateInitialTodos();
    } catch {
      return generateInitialTodos();
    }
  });

  const [sort, setSort] = useState({ by: "date", order: "asc" });
  const [isCreating, setIsCreating] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [notificationPermission, setNotificationPermission] =
    useState("default");
  const [isCompletedExpanded, setIsCompletedExpanded] = useState(true);

  const [importantPage, setImportantPage] = useState(1);
  const [otherPage, setOtherPage] = useState(1);
  const itemsPerPage = 10;

  // Persist todos to localStorage
  useEffect(() => {
    localStorage.setItem("todos", JSON.stringify(todos));
  }, [todos]);

  // Request notification permission on load
  useEffect(() => {
    if ("Notification" in window) {
      setNotificationPermission(Notification.permission);
    }
  }, []);

  // Notification scheduler
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

  const getSortDate = (todo) => {
    const hasStartDate = !!todo.startDate;
    const taskHasStarted = hasStartDate && isPast(parseISO(todo.startDate));
    if (hasStartDate && !taskHasStarted) {
      return parseISO(todo.startDate).getTime();
    }
    return todo.deadline ? parseISO(todo.deadline).getTime() : Infinity;
  };

  const {
    paginatedImportantTasks,
    paginatedOtherTasks,
    completedTodos,
    totalImportantPages,
    totalOtherPages,
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
    };
  }, [todos, sort, searchQuery, importantPage, otherPage]);

  // Reset pages if they go out of bounds after filtering/deleting
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

  const ThemeToggle = () => {
    const { theme, toggleTheme } = useTheme();
    return (
      <button
        onClick={toggleTheme}
        className="p-2 rounded-full bg-gray-200 dark:bg-gray-700 text-gray-600 dark:text-gray-300"
      >
        {theme === "light" ? <Moon size={20} /> : <Sun size={20} />}
      </button>
    );
  };

  return (
    <ThemeProvider>
      <div className="bg-gray-50 dark:bg-gray-900 min-h-screen font-sans text-gray-800 dark:text-gray-200">
        {isCreating && (
          <TodoModal
            todo={newTodoTemplate}
            onClose={() => setIsCreating(false)}
            onSave={handleCreateTodo}
          />
        )}
        <div className="container mx-auto p-4 md:p-8 max-w-7xl">
          {/* Header */}
          <header className="flex justify-between items-center mb-6">
            <div className="flex items-center space-x-3">
              <Zap className="text-blue-500" size={32} />
              <h1 className="text-3xl font-bold">TodoZen</h1>
            </div>
            <ThemeToggle />
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

          {/* Controls */}
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

          {/* Search Bar */}
          <div className="mb-8">
            <div className="relative">
              <Search
                className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
                size={20}
              />
              <input
                type="text"
                placeholder="Search tasks by title..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border rounded-lg bg-white dark:bg-gray-800 border-gray-300 dark:border-gray-600 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 md:gap-8">
            {/* Important Column */}
            <div>
              <div className="flex items-center mb-4">
                <Star className="mr-3 text-yellow-400 fill-current" size={22} />
                <h2 className="text-xl font-bold">Important</h2>
              </div>
              {paginatedImportantTasks.length > 0 ? (
                paginatedImportantTasks.map((todo) => (
                  <TodoItem
                    key={todo.id}
                    todo={todo}
                    onUpdate={handleUpdateTodo}
                    onDelete={handleDeleteTodo}
                  />
                ))
              ) : (
                <div className="text-center py-10 px-4 border-2 border-dashed dark:border-gray-700 rounded-lg">
                  <p className="text-gray-500">No important tasks.</p>
                </div>
              )}
              <PaginationControls
                currentPage={importantPage}
                totalPages={totalImportantPages}
                setCurrentPage={setImportantPage}
              />
            </div>

            {/* Other Tasks Column */}
            <div>
              <div className="flex items-center mb-4 mt-8 md:mt-0">
                <Inbox className="mr-3 text-gray-500" size={22} />
                <h2 className="text-xl font-bold">Tasks</h2>
              </div>
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
              <PaginationControls
                currentPage={otherPage}
                totalPages={totalOtherPages}
                setCurrentPage={setOtherPage}
              />
            </div>
          </div>

          {/* Completed Section */}
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
                  />
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </ThemeProvider>
  );
}
