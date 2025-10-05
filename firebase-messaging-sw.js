import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";
import { getMessaging, onBackgroundMessage } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-messaging-sw.js";

const firebaseConfig = {
  apiKey: "AIzaSyBMpLj1TKI4HJZeUEJ5iXekNZFv91lB1Cc",
  authDomain: "azzam-c8aad.firebaseapp.com",
  projectId: "azzam-c8aad",
  storageBucket: "azzam-c8aad.firebasestorage.app",
  messagingSenderId: "916342975413",
  appId: "1:916342975413:web:0cd396d037eabef93b07fc",
};

const app = initializeApp(firebaseConfig);
const messaging = getMessaging(app);

onBackgroundMessage(messaging, (payload) => {
  console.log('[firebase-messaging-sw.js] Received background message ', payload);
  const notificationTitle = payload.notification.title;
  const notificationOptions = {
    body: payload.notification.body,
    icon: './firebase-logo.png' // Optional: you can add an icon file to your project
  };
  self.registration.showNotification(notificationTitle, notificationOptions);
});

