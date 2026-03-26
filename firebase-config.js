const firebaseConfig = {
    apiKey: "AIzaSyD7Cf_VMH1ACx1eweozlF9D26yw-pj9WcY",
    authDomain: "gorm-b3316.firebaseapp.com",
    databaseURL: "https://gorm-b3316-default-rtdb.firebaseio.com",
    projectId: "gorm-b3316",
    storageBucket: "gorm-b3316.firebasestorage.app",
    messagingSenderId: "1092629474101",
    appId: "1:1092629474101:web:d84a61f3cd80e6a83efa7c",
    measurementId: "G-ZM7FTMWC0N"
};

firebase.initializeApp(firebaseConfig);
const auth = firebase.auth();
const db = firebase.database();

const CLOUD_NAME = 'dnillsbmi';
const UPLOAD_PRESET = 'ekxzvogb';

console.log('✅ instagrami Ready');
