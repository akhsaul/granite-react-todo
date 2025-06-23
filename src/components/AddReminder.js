import React, { useState, useEffect } from "react";
import { reminderPresets } from "../utils/constants";

export const AddReminder = ({ onAdd, existingReminders }) => {
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
