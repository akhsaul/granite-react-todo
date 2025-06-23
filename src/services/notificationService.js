export const requestNotificationPermission = async () => {
  if (!("Notification" in window)) {
    console.warn("This browser does not support desktop notification");
    return "denied";
  }
  const permission = await Notification.requestPermission();
  return permission;
};

export const showNotification = (title, options) => {
  if (Notification.permission === "granted") {
    new Notification(title, options);
  }
};
