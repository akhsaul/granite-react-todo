import React from "react";
import { useDroppable } from "@dnd-kit/core";

export const Droppable = ({ id, children, className }) => {
  const { isOver, setNodeRef } = useDroppable({ id });

  const style = {
    backgroundColor: isOver ? "rgba(0, 0, 0, 0.05)" : undefined,
    transition: "background-color 0.2s ease-in-out",
  };

  return (
    <div ref={setNodeRef} style={style} className={className}>
      {children}
    </div>
  );
};
