import React, { useState, useEffect } from "react";
import { differenceInSeconds, parseISO } from "date-fns";

export const CountdownTimer = ({ deadline }) => {
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
