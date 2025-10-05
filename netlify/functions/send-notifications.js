const admin = require('firebase-admin');

const serviceAccount = {
  type: "service_account",
  project_id: process.env.FIREBASE_PROJECT_ID,
  private_key_id: process.env.FIREBASE_PRIVATE_KEY_ID,
  private_key: (process.env.FIREBASE_PRIVATE_KEY || "").replace(/\\n/g, '\n'),
  client_email: process.env.FIREBASE_CLIENT_EMAIL,
  client_id: process.env.FIREBASE_CLIENT_ID,
  auth_uri: "https://accounts.google.com/o/oauth2/auth",
  token_uri: "https://oauth2.googleapis.com/token",
  auth_provider_x509_cert_url: "https://www.googleapis.com/oauth2/v1/certs",
  client_x509_cert_url: process.env.FIREBASE_CLIENT_CERT_URL,
};

if (!admin.apps.length) {
  admin.initializeApp({ credential: admin.credential.cert(serviceAccount) });
}
const db = admin.firestore();

const scheduleData = [
    { day: 'Monday', subject: 'Effective Writing', start: '08:00' },
    { day: 'Monday', subject: 'Fundamentals of Marketing', start: '11:00' },
    { day: 'Tuesday', subject: 'Business Accounting', start: '12:00' },
    { day: 'Tuesday', subject: 'Logistics and Supply Chain Management', start: '17:00' },
    { day: 'Tuesday', subject: 'Fundamentals of Marketing', start: '18:00' },
    { day: 'Wednesday', subject: 'Logistics and Supply Chain Management', start: '17:00' },
    { day: 'Thursday', subject: 'Business Accounting', start: '13:00' },
];
const daysOrder = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

const getAbsoluteTime = (day, time) => {
    // This function now runs on the server, which is likely in UTC.
    // We need to calculate time relative to a specific timezone, e.g., Malaysia Time (UTC+8)
    const now = new Date();
    const serverTimezoneOffset = now.getTimezoneOffset() * 60000;
    const malaysiaTimezoneOffset = -8 * 3600 * 1000; // UTC+8
    const malaysiaNow = new Date(now.getTime() + serverTimezoneOffset + malaysiaTimezoneOffset);

    const [hours, minutes] = time.split(':').map(Number);
    const targetDayIndex = daysOrder.indexOf(day);
    const currentDayIndex = malaysiaNow.getDay();
    
    let daysDiff = targetDayIndex - currentDayIndex;
    if (daysDiff < 0) daysDiff += 7;

    const targetDate = new Date(malaysiaNow);
    targetDate.setDate(malaysiaNow.getDate() + daysDiff);
    targetDate.setHours(hours, minutes, 0, 0);

    // If the calculated time is in the past for today, get next week's time
    if (daysDiff === 0 && targetDate.getTime() < malaysiaNow.getTime()) {
        targetDate.setDate(targetDate.getDate() + 7);
    }
    return targetDate;
};

exports.handler = async function(event, context) {
    const tokensSnapshot = await db.collection('fcmTokens').get();
    if (tokensSnapshot.empty) {
        return { statusCode: 200, body: "No user tokens found." };
    }

    const now = new Date();
    const serverTimezoneOffset = now.getTimezoneOffset() * 60000;
    const malaysiaTimezoneOffset = -8 * 3600 * 1000; // UTC+8
    const malaysiaNow = new Date(now.getTime() + serverTimezoneOffset + malaysiaTimezoneOffset);

    const sentNotifications = new Set();

    for (const doc of tokensSnapshot.docs) {
        const data = doc.data();
        const token = data.token;
        const userAlerts = data.alerts || [];

        for (const alert of userAlerts) {
            if (!alert.enabled || !alert.minutes) continue;

            const reminderMinutes = alert.minutes;

            for (const cls of scheduleData) {
                const classTime = getAbsoluteTime(cls.day, cls.start);
                const minutesUntilClass = (classTime.getTime() - malaysiaNow.getTime()) / 60000;

                if (minutesUntilClass <= reminderMinutes && minutesUntilClass > reminderMinutes - 5) {
                    const notificationId = `${token}_${cls.day}_${cls.start}_${reminderMinutes}`;
                    if (!sentNotifications.has(notificationId)) {
                        const message = {
                            notification: {
                                title: 'Class Reminder!',
                                body: `Your "${cls.subject}" class starts in about ${reminderMinutes} minutes.`,
                            },
                            token: token,
                        };
                        try {
                            await admin.messaging().send(message);
                            sentNotifications.add(notificationId);
                        } catch (error) {
                            console.error(`Error sending message to token ${token}:`, error);
                        }
                    }
                }
            }
        }
    }

    return { statusCode: 200, body: `Notification check complete. Sent ${sentNotifications.size} notifications.` };
};
