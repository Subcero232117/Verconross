import { initializeApp } from 'https://www.gstatic.com/firebasejs/9.6.1/firebase-app.js';
import { getDatabase, ref, set, onValue, push, serverTimestamp } 
    from 'https://www.gstatic.com/firebasejs/9.6.1/firebase-database.js';

const firebaseConfig = {
    apiKey: "AIzaSyCAPf1HkUpAhztBL3J2czy2Mc9XyGb7zAM",
    authDomain: "vercon-ross.firebaseapp.com",
    projectId: "vercon-ross",
    storageBucket: "vercon-ross.appspot.com",
    messagingSenderId: "706096872487",
    appId: "1:706096872487:web:e6c8b08846954212082202",
    measurementId: "G-F2C9CVTPSC"
};

// Inicializar Firebase
const app = initializeApp(firebaseConfig);
const db = getDatabase(app);

// Elementos del DOM
const videoUrlInput = document.getElementById('videoUrl');
const videoFrame = document.getElementById('videoFrame');
const messageInput = document.getElementById('messageInput');
const chatMessages = document.getElementById('chatMessages');
const onlineCount = document.getElementById('onlineCount');

// Estado de la aplicación
let currentUser = `Usuario${Math.floor(Math.random() * 1000)}`;
let videoPlayer = null;

// Funciones de utilidad
function extractVideoId(url) {
    const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|\&v=)([^#\&\?]*).*/;
    const match = url.match(regExp);
    return (match && match[2].length === 11) ? match[2] : null;
}

function formatTime(seconds) {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = Math.floor(seconds % 60);
    return `${minutes.toString().padStart(2, '0')}:${remainingSeconds.toString().padStart(2, '0')}`;
}

// Gestión de presencia
const userRef = ref(db, `users/${currentUser}`);
set(userRef, {
    online: true,
    lastSeen: serverTimestamp()
});

// Actualizar contador de usuarios en línea
onValue(ref(db, 'users'), (snapshot) => {
    const users = snapshot.val() || {};
    const onlineUsers = Object.values(users).filter(user => user.online).length;
    onlineCount.textContent = `${onlineUsers} online`;
});

// Sincronización de video
function loadVideo() {
    const url = videoUrlInput.value;
    const videoId = extractVideoId(url);
    
    if (videoId) {
        set(ref(db, 'currentVideo'), {
            id: videoId,
            timestamp: serverTimestamp(),
            state: 'playing'
        });
        
        videoFrame.src = `https://www.youtube.com/embed/${videoId}?enablejsapi=1`;
        videoUrlInput.value = '';
    } else {
        alert('URL de YouTube inválida');
    }
}

// Chat
function sendMessage() {
    const message = messageInput.value.trim();
    if (message) {
        push(ref(db, 'messages'), {
            user: currentUser,
            text: message,
            timestamp: serverTimestamp()
        });
        messageInput.value = '';
    }
}

// Escuchar mensajes nuevos
onValue(ref(db, 'messages'), (snapshot) => {
    const messages = [];
    snapshot.forEach((childSnapshot) => {
        messages.push(childSnapshot.val());
    });
    
    // Ordenar mensajes por timestamp
    messages.sort((a, b) => a.timestamp - b.timestamp);
    
    // Mostrar últimos 50 mensajes
    chatMessages.innerHTML = messages.slice(-50).map(msg => `
        <div class="message">
            <strong>${msg.user}:</strong> ${msg.text}
        </div>
    `).join('');
    
    // Scroll al último mensaje
    chatMessages.scrollTop = chatMessages.scrollHeight;
});

// Event Listeners
document.getElementById('loadVideoBtn').addEventListener('click', loadVideo);
document.getElementById('sendMessageBtn').addEventListener('click', sendMessage);
document.getElementById('syncBtn').addEventListener('click', () => {
    // Implementar sincronización de tiempo aquí
});

messageInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') {
        sendMessage();
    }
});

// Limpieza al cerrar
window.addEventListener('beforeunload', () => {
    set(userRef, {
        online: false,
        lastSeen: serverTimestamp()
    });
});
