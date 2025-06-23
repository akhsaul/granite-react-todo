import React, { useState, useMemo } from "react";
import { useDraggable } from "@dnd-kit/core";
import { differenceInSeconds, isPast, parseISO } from "date-fns";
import {
  AlertTriangle,
  CheckCircle,
  ChevronDown,
  ChevronUp,
  Circle,
  Clock,
  Edit,
  ExternalLink,
  GripVertical,
  Link as LinkIcon,
  PlayCircle,
  Plus,
  Star,
  Trash2,
} from "lucide-react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

import { useTheme } from "../context/ThemeContext";
import { CountdownTimer } from "./CountdownTimer";
import { useMediaQuery } from "../hooks/useMediaQuery";
import { SubTodoItem } from "./SubTodoItem";

export const TodoItem = ({ todo, onUpdate, onDelete, onStartEdit }) => {
  const [newSubTodo, setNewSubTodo] = useState("");
  const { theme } = useTheme();

  const { attributes, listeners, setNodeRef, transform, isDragging } =
    useDraggable({
      id: todo.id,
      data: {
        isStarred: todo.isStarred,
      },
      disabled: todo.completed,
    });

  const style = transform
    ? {
        transform: `translate3d(${transform.x}px, ${transform.y}px, 0)`,
        zIndex: isDragging ? 9999 : "auto",
        opacity: isDragging ? 0.5 : 1,
      }
    : {};

  const handleToggle = () => onUpdate(todo.id, { completed: !todo.completed });
  const handleStarToggle = () =>
    onUpdate(todo.id, { isStarred: !todo.isStarred });
  const handleExpandToggle = () =>
    onUpdate(todo.id, { isExpanded: !todo.isExpanded });
  const handleDelete = () => onDelete(todo.id);
  const handleEdit = () => onStartEdit(todo.id);

  // Use the hook to check for desktop screen sizes (Tailwind's `md` breakpoint)
  const isDesktop = useMediaQuery("(min-width: 768px)");
  const handleStickyNote = () => {
    // Construct the URL to open the same app but with a query parameter
    const url = `${window.location.origin}?sticky=${todo.id}`;
    // Define the window features: smaller and not resizable
    const features = "width=450,height=550,resizable=no,scrollbars=yes";

    window.open(url, `_blank`, features);
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
      ref={setNodeRef}
      style={style}
      className={`bg-white dark:bg-gray-800 rounded-lg shadow-md transition-all duration-300 ease-in-out mb-4 border dark:border-gray-700 ${
        todo.completed ? "opacity-60" : ""
      } ${
        todo.isStarred && !todo.completed
          ? "border-yellow-400 dark:border-yellow-400"
          : "border-gray-200"
      }`}
    >
      <div className="p-4 flex flex-col">
        <div className="flex items-start space-x-2">
          {!todo.completed && (
            <div
              {...listeners}
              {...attributes}
              className="cursor-grab pt-1 touch-none"
            >
              <GripVertical size={24} className="text-gray-400" />
            </div>
          )}
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
            {isDesktop && (
              <button
                onClick={handleStickyNote}
                className="p-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-500 hover:text-yellow-500"
              >
                <ExternalLink size={18} />
              </button>
            )}
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

        <div
          className={`transition-all duration-500 ease-in-out overflow-hidden ${
            todo.isExpanded ? "max-h-[1000px] mt-4" : "max-h-0"
          }`}
        >
          <div className="pl-10 space-y-3">
            {todo.description && (
              <div className="markdown max-w-none text-gray-600 dark:text-gray-300">
                <ReactMarkdown remarkPlugins={[remarkGfm]}>
                  {todo.description}
                </ReactMarkdown>
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
