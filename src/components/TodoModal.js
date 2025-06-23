import React, { useState, useEffect } from "react";
import {
  Bell,
  Calendar,
  Globe,
  Link as LinkIcon,
  PlayCircle,
  Save,
  X,
} from "lucide-react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

import { timezones } from "../utils/constants";
import { getLocalTimezoneOffset } from "../utils/dateUtils";
import { AddReminder } from "./AddReminder";

export const TodoModal = ({ todo, onClose, onSave }) => {
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
      setStartDate(todo.startDate.substring(0, 16));
      const match = todo.startDate.match(/[+-]\d{2}:\d{2}|Z$/);
      if (match) setStartTimezone(match[0] === "Z" ? "+00:00" : match[0]);
    } else {
      setStartDate("");
      setStartTimezone(getLocalTimezoneOffset());
    }

    if (todo.deadline) {
      setDeadlineDate(todo.deadline.substring(0, 16));
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
    <div>
      <div className="fixed bg-black opacity-50 w-screen h-screen z-49"></div>
      <div className="fixed inset-0 overflow-y-auto items-center z-50 p-4">
        <div className="m-[1.75rem] mr-auto ml-auto bg-white dark:bg-gray-800 rounded-lg shadow-xl w-full max-w-2xl p-6 space-y-4 transform transition-all">
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
                <div className="markdown max-w-none h-40 overflow-y-auto p-2">
                  <ReactMarkdown remarkPlugins={[remarkGfm]}>
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
    </div>
  );
};
