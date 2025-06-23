import { isPast, parseISO } from "date-fns";

export const getLocalTimezoneOffset = () => {
  const offset = -new Date().getTimezoneOffset();
  const sign = offset >= 0 ? "+" : "-";
  const hours = Math.floor(Math.abs(offset) / 60);
  const minutes = Math.abs(offset) % 60;
  return `${sign}${String(hours).padStart(2, "0")}:${String(minutes).padStart(
    2,
    "0"
  )}`;
};

export const getSortDate = (todo) => {
  const hasStartDate = !!todo.startDate;
  const taskHasStarted = hasStartDate && isPast(parseISO(todo.startDate));
  if (hasStartDate && !taskHasStarted) {
    return parseISO(todo.startDate).getTime();
  }
  return todo.deadline ? parseISO(todo.deadline).getTime() : Infinity;
};
