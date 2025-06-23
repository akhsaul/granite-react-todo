import React, { useMemo } from "react";
import { Handle, Position } from "@xyflow/react";
import { isPast, parseISO } from "date-fns";
import { Clock, PlayCircle, Star } from "lucide-react";

export const TimelineNode = ({ data }) => {
  const { displayDate, displayIcon } = useMemo(() => {
    const hasStartDate = !!data.startDate;
    const taskHasStarted = hasStartDate && isPast(parseISO(data.startDate));
    let dateStringToFormat = null;
    let icon = <Clock size={12} className="mr-1" />;
    let prefix = "Due: ";

    if (hasStartDate && !taskHasStarted) {
      dateStringToFormat = data.startDate;
      icon = <PlayCircle size={12} className="text-green-500 mr-1" />;
      prefix = "Starts: ";
    } else {
      dateStringToFormat = data.deadline;
    }

    const formatted = dateStringToFormat
      ? new Intl.DateTimeFormat(undefined, {
          month: "short",
          day: "numeric",
          hour: "numeric",
          minute: "numeric",
        }).format(parseISO(dateStringToFormat))
      : "No Date";

    return { displayDate: prefix + formatted, displayIcon: icon };
  }, [data.startDate, data.deadline]);

  return (
    <div
      className={`p-3 rounded-lg shadow-md w-64 ${
        data.isStarred
          ? "bg-yellow-100 border-2 border-yellow-400 dark:bg-yellow-900/50"
          : "bg-white dark:bg-gray-700"
      }`}
    >
      <Handle type="target" position={Position.Left} className="!bg-gray-400" />
      <div className="flex items-center mb-1">
        {data.isStarred && (
          <Star size={14} className="mr-2 text-yellow-400 fill-current" />
        )}
        <p className="text-sm font-bold text-gray-900 dark:text-white truncate">
          {data.title}
        </p>
      </div>
      <div className="text-xs flex items-center text-gray-500 dark:text-gray-300">
        {displayIcon}
        <span>{displayDate}</span>
      </div>
      <Handle
        type="source"
        position={Position.Right}
        className="!bg-gray-400"
      />
    </div>
  );
};
