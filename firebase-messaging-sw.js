importScripts(
    'https://www.gstatic.com/firebasejs/10.12.2/firebase-app-compat.js',
    'https://www.gstatic.com/firebasejs/10.12.2/firebase-messaging-compat.js'
);

firebase.initializeApp({
    apiKey: "AIzaSyBMpLj1TKI4HJZeUEJ5iXekNZFv91lB1Cc",
    authDomain: "azzam-c8aad.firebaseapp.com",
    projectId: "azzam-c8aad",
    storageBucket: "azzam-c8aad.firebasestorage.app",
    messagingSenderId: "916342975413",
    appId: "1:916342975413:web:0cd396d037eabef93b07fc"
});

const messaging = firebase.messaging();

messaging.onBackgroundMessage((payload) => {
    console.log('Received background message:', payload);
    
    const notificationTitle = payload.notification.title;
    const notificationOptions = {
        body: payload.notification.body,
        icon: '/notification-icon.png',
        badge: '/notification-badge.png',
        tag: 'class-notification',
        data: payload.data
    };

    return self.registration.showNotification(notificationTitle, notificationOptions);
});

