// Cek apakah Firebase sudah diinisialisasi
let firebaseApp;
if (!firebase.apps.length) {
    firebaseApp = firebase.initializeApp({
        apiKey: "AIzaSyCIWiXrgBfRmWFtLTzRacFU61KPY0G3H3o",
        authDomain: "modulku-1596a.firebaseapp.com",
        projectId: "modulku-1596a",
        storageBucket: "modulku-1596a.appspot.com",
        messagingSenderId: "109335930454",
        appId: "1:109335930454:web:1f32eedcc352ea5564bdf7"
    });
} else {
    firebaseApp = firebase.app();
}

// Inisialisasi services
const auth = firebase.auth();
const db = firebase.firestore();

// Export untuk penggunaan global
window.moduleApp = {
    auth: auth,
    db: db,
    timestamp: firebase.firestore.FieldValue.serverTimestamp
};