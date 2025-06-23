import React, { useState } from "react";
import { CheckCircle, Circle, Edit, Trash2 } from "lucide-react";

export const SubTodoItem = ({ subTodo, onToggle, onUpdate, onDelete }) => {
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
