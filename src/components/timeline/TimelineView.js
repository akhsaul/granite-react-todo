import React, { useMemo } from "react";
import { ReactFlow } from "@xyflow/react";
import { useTheme } from "../../context/ThemeContext";
import { TimelineNode } from "./TimelineNode";

const nodeTypes = { timelineNode: TimelineNode };

export const TimelineView = ({ tasks }) => {
  const { theme } = useTheme();

  const elements = useMemo(() => {
    const nodes = tasks.map((task, index) => ({
      id: task.id.toString(),
      type: "timelineNode",
      data: {
        title: task.title,
        startDate: task.startDate,
        deadline: task.deadline,
        isStarred: task.isStarred,
      },
      position: { x: index * 300, y: 100 },
    }));

    const edges = [];
    for (let i = 0; i < tasks.length - 1; i++) {
      edges.push({
        id: `e${tasks[i].id}-${tasks[i + 1].id}`,
        source: tasks[i].id.toString(),
        target: tasks[i + 1].id.toString(),
        type: "smoothstep",
        animated: true,
        arrowHeadType: "arrowclosed",
        style: { stroke: theme === "dark" ? "#fff" : "#000" },
      });
    }
    return [...nodes, ...edges];
  }, [tasks, theme]);

  return (
    <div
      style={{ height: 300 }}
      className="bg-white dark:bg-gray-800 rounded-lg shadow-inner"
    >
      <ReactFlow
        nodes={elements.filter((el) => el.position)}
        edges={elements.filter((el) => !el.position)}
        nodeTypes={nodeTypes}
        nodesDraggable={false}
        nodesConnectable={false}
        zoomOnScroll={false}
      />
    </div>
  );
};
