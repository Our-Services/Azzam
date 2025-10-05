const admin = require('firebase-admin');

// تهيئة Firebase Admin SDK
const serviceAccount = {
    type: "service_account",
    project_id: "azzam-c8aad",
    private_key_id: "3bbf57c7dfd5d0d7a5f4aafd873d36e36b057387",
    private_key: process.env.FIREBASE_PRIVATE_KEY,
    client_email: "firebase-adminsdk-fbsvc@azzam-c8aad.iam.gserviceaccount.com",
    client_id: "110808101842222835678",
    auth_uri: "https://accounts.google.com/o/oauth2/auth",
    token_uri: "https://oauth2.googleapis.com/token",
    auth_provider_x509_cert_url: "https://www.googleapis.com/oauth2/v1/certs",
    client_x509_cert_url: "https://www.googleapis.com/robot/v1/metadata/x509/firebase-adminsdk-fbsvc%40azzam-c8aad.iam.gserviceaccount.com"
};

// تهيئة التطبيق إذا لم يكن مهيأ بالفعل
if (!admin.apps.length) {
    admin.initializeApp({
        credential: admin.credential.cert(serviceAccount)
    });
}

const db = admin.firestore();

// بيانات الجدول الدراسي
const scheduleData = [
    {day:"Monday",subject:"Effective Writing",type:"Tutorial",code:"BLE3022",start:"08:00",end:"10:00",lecturer:"Melissa Wong Ling Lee",room:"C204"},
    {day:"Monday",subject:"Fundamentals of Marketing",type:"Tutorial",code:"BBM1013",start:"11:00",end:"12:00",lecturer:"Nazliwati Mohamad",room:"C207"},
    {day:"Tuesday",subject:"Business Accounting",type:"Tutorial",code:"BBA1093",start:"12:00",end:"13:00",lecturer:"Asst. Prof. Dr. Mohamad Aznillah",room:"C411"},
    {day:"Tuesday",subject:"Logistics and Supply Chain Management",type:"Tutorial",code:"BBL1013",start:"17:00",end:"18:00",lecturer:"Ong Eu Chin",room:"C401"},
    {day:"Tuesday",subject:"Fundamentals of Marketing",type:"Lecture",code:"BBM1013",start:"18:00",end:"20:00",lecturer:"Nazliwati Mohamad",room:"C302"},
    {day:"Wednesday",subject:"Logistics and Supply Chain Management",type:"Lecture",code:"BBL1013",start:"17:00",end:"19:00",lecturer:"Ong Eu Chin",room:"C407"},
    {day:"Thursday",subject:"Business Accounting",type:"Lecture",code:"BBA1093",start:"13:00",end:"15:00",lecturer:"Asst. Prof. Dr. Mohamad Aznillah",room:"GG07"}
];

const daysOrder = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

function getAbsoluteTime(day, time) {
    const now = new Date();
    const [hours, minutes] = time.split(':').map(Number);
    const targetDayIndex = daysOrder.indexOf(day);
    const currentDayIndex = now.getDay();
    
    let daysDiff = targetDayIndex - currentDayIndex;
    if (daysDiff < 0) daysDiff += 7;

    const targetDate = new Date(now);
    targetDate.setDate(now.getDate() + daysDiff);
    targetDate.setHours(hours, minutes, 0, 0);

    // إذا كان الوقت المحسوب في الماضي لليوم الحالي، احصل على وقت الأسبوع القادم
    if (daysDiff === 0 && targetDate.getTime() < now.getTime()) {
        targetDate.setDate(targetDate.getDate() + 7);
    }

    return targetDate;
}

exports.handler = async function(event, context) {
    try {
        // جلب جميع رموز المستخدمين
        const tokensSnapshot = await db.collection('fcmTokens').get();
        if (tokensSnapshot.empty) {
            console.log('No tokens found in database');
            return { 
                statusCode: 200, 
                body: JSON.stringify({ message: "No tokens found" })
            };
        }

        const now = new Date();
        const sentNotifications = new Set();
        let notificationsSent = 0;

        // التحقق من كل مستخدم
        for (const doc of tokensSnapshot.docs) {
            const data = doc.data();
            const token = data.token;
            const alerts = data.alerts || [];

            // التحقق من كل تنبيه للمستخدم
            for (const alert of alerts) {
                if (!alert.enabled || !alert.minutes) continue;

                const reminderMinutes = alert.minutes;

                // التحقق من كل محاضرة
                for (const cls of scheduleData) {
                    const classTime = getAbsoluteTime(cls.day, cls.start);
                    const minutesUntilClass = Math.round((classTime.getTime() - now.getTime()) / 60000);

                    // إرسال إشعار إذا كان الوقت مناسباً
                    if (minutesUntilClass <= reminderMinutes && minutesUntilClass > (reminderMinutes - 5)) {
                        const notificationId = `${token}_${cls.day}_${cls.start}_${reminderMinutes}`;
                        
                        if (!sentNotifications.has(notificationId)) {
                            const message = {
                                notification: {
                                    title: `تذكير بالمحاضرة: ${cls.subject}`,
                                    body: `المحاضرة ستبدأ بعد ${reminderMinutes} دقيقة في قاعة ${cls.room}`,
                                },
                                data: {
                                    subject: cls.subject,
                                    room: cls.room,
                                    start: cls.start,
                                    type: cls.type,
                                    lecturer: cls.lecturer
                                },
                                token: token
                            };

                            try {
                                await admin.messaging().send(message);
                                sentNotifications.add(notificationId);
                                notificationsSent++;
                                console.log(`Sent notification for ${cls.subject} to token ${token}`);
                            } catch (error) {
                                console.error(`Error sending notification to ${token}:`, error);
                                if (error.code === 'messaging/registration-token-not-registered') {
                                    // حذف الرمز غير الصالح
                                    await db.collection('fcmTokens').doc(doc.id).delete();
                                    console.log(`Deleted invalid token: ${token}`);
                                }
                            }
                        }
                    }
                }
            }
        }

        return {
            statusCode: 200,
            body: JSON.stringify({
                message: `Successfully processed notifications`,
                notificationsSent: notificationsSent
            })
        };
    } catch (error) {
        console.error('Error in notification function:', error);
        return {
            statusCode: 500,
            body: JSON.stringify({
                message: 'Error processing notifications',
                error: error.message
            })
        };
    }
};
