import React, { useState, useEffect } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

// This component is the entire page for the new sticky note window
export const StickyNoteView = ({ stickyId }) => {
  const [task, setTask] = useState(null);
  const [error, setError] = useState("");

  useEffect(() => {
    try {
      const allTodos = JSON.parse(localStorage.getItem("todos") || "[]");
      const foundTask = allTodos.find((t) => t.id.toString() === stickyId);

      if (foundTask) {
        setTask(foundTask);
        document.title = `Sticky: ${foundTask.title}`;
      } else {
        setError("Task not found. It may have been deleted.");
      }
    } catch (e) {
      setError("Could not load task data.");
    }
  }, [stickyId]);

  // This new useEffect sets up the theme listener.
  useEffect(() => {
    let channel;
    try {
      // Connect to the same named channel.
      channel = new BroadcastChannel("todo_app_sync_channel");

      // This function will execute whenever a message is received on the channel.
      channel.onmessage = (event) => {
        if (!event.data || !event.data.type) return;

        // Handle Theme Changes
        if (event.data && event.data.type === "THEME_CHANGE") {
          const newTheme = event.data.theme;
          const root = window.document.documentElement;

          // Apply the new theme to the sticky note's HTML element.
          root.classList.remove("light", "dark");
          root.classList.add(newTheme);
        } else if (event.data.type === "TODO_UPDATE") {
          const updatedTask = event.data.payload;
          // IMPORTANT: Only update if the message is for THIS sticky note
          if (updatedTask && updatedTask.id.toString() === stickyId) {
            setTask(updatedTask);
            document.title = `Sticky: ${updatedTask.title}`;
          }
        } else if (event.data.type === "TODO_DELETE") {
          const deletedInfo = event.data.payload;
          // If this task was deleted, close the window.
          if (deletedInfo && deletedInfo.id.toString() === stickyId) {
            // We disable the onmessage handler to prevent errors before closing
            channel.onmessage = null;
            window.close();
          }
        }
      };
    } catch (error) {
      console.error("BroadcastChannel is not supported or failed:", error);
    }

    // This is a crucial cleanup function.
    // It runs when the component unmounts (i.e., when the window is closed).
    return () => {
      if (channel) {
        channel.close();
      }
    };
  }, [stickyId]); // The empty dependency array ensures this effect runs only once on mount.

  // A simple loading/error/content renderer
  if (error) {
    return (
      <div className="flex items-center justify-center h-screen bg-yellow-100 dark:bg-gray-800 text-red-500 font-semibold p-4">
        {error}
      </div>
    );
  }

  if (!task) {
    return (
      <div className="flex items-center justify-center h-screen bg-yellow-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300">
        Loading...
      </div>
    );
  }

  // This is the actual UI for the sticky note
  return (
    <div className="bg-yellow-100 dark:bg-gray-800 p-4 font-sans min-h-screen">
      <div className="bg-white dark:bg-gray-900 shadow-lg rounded-lg p-6 w-full max-w-md mx-auto">
        <h1 className="text-2xl font-bold mb-2 text-gray-900 dark:text-white">
          {task.title}
        </h1>

        {task.description && (
          <div className="markdown max-w-none mb-4 text-gray-700 dark:text-gray-300">
            <ReactMarkdown remarkPlugins={[remarkGfm]}>
              {task.description}
            </ReactMarkdown>
          </div>
        )}

        {task.subTodos && task.subTodos.length > 0 && (
          <div>
            <h2 className="font-semibold mb-2 text-gray-800 dark:text-white">
              Sub-tasks
            </h2>
            <ul className="space-y-1">
              {task.subTodos.map((sub) => (
                <li
                  key={sub.id}
                  className="flex items-center space-x-2 text-sm"
                >
                  <span
                    className={
                      sub.completed ? "text-green-500" : "text-gray-400"
                    }
                  >
                    {sub.completed ? "✔" : "○"}
                  </span>
                  <span
                    className={
                      sub.completed
                        ? "line-through text-gray-500"
                        : "text-gray-800 dark:text-gray-200"
                    }
                  >
                    {sub.title}
                  </span>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </div>
  );
};
