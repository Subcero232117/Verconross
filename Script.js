// Elementos del DOM
const videoUrlInput = document.getElementById('videoUrl');
const videoFrame = document.getElementById('videoFrame');
const messageInput = document.getElementById('messageInput');
const chatMessages = document.getElementById('chatMessages');
const onlineCount = document.getElementById('onlineCount');
const loadVideoBtn = document.getElementById('loadVideoBtn');
const sendMessageBtn = document.getElementById('sendMessageBtn');
const syncBtn = document.getElementById('syncBtn');

// Configuración de Socket.io
const socket = io();

// Variables globales
let currentUser = `Usuario${Math.floor(Math.random() * 1000)}`;
let player = null;
let currentVideoId = null;

// Registrar usuario al conectar
socket.emit('register-user', currentUser);

// Cargar API de YouTube
function loadYouTubeAPI() {
    const tag = document.createElement('script');
    tag.src = 'https://www.youtube.com/iframe_api';
    const firstScriptTag = document.getElementsByTagName('script')[0];
    firstScriptTag.parentNode.insertBefore(tag, firstScriptTag);
}

// Función para crear el reproductor de YouTube
window.onYouTubeIframeAPIReady = function() {
    player = new YT.Player('videoFrame', {
        height: '360',
        width: '640',
        videoId: '',
        events: {
            'onStateChange': onPlayerStateChange,
            'onReady': onPlayerReady
        }
    });
}

// Eventos del reproductor
function onPlayerReady(event) {
    syncBtn.disabled = false;
}

function onPlayerStateChange(event) {
    socket.emit('video-state-update', {
        currentTime: player.getCurrentTime(),
        state: event.data,
        videoId: currentVideoId
    });
}

// Funciones de utilidad
function extractVideoId(url) {
    const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|\&v=)([^#\&\?]*).*/;
    const match = url.match(regExp);
    return (match && match[2].length === 11) ? match[2] : null;
}

// Cargar video
function loadVideo() {
    const url = videoUrlInput.value;
    const videoId = extractVideoId(url);
    
    if (videoId) {
        currentVideoId = videoId;
        player.loadVideoById(videoId);
        socket.emit('video-loaded', videoId);
        videoUrlInput.value = '';
    } else {
        alert('URL de YouTube inválida');
    }
}

// Chat
function sendMessage() {
    const message = messageInput.value.trim();
    if (message) {
        socket.emit('chat-message', message);
        messageInput.value = '';
    }
}

// Sincronización
function syncVideo() {
    if (player && currentVideoId) {
        socket.emit('video-time-update', {
            currentTime: player.getCurrentTime(),
            videoId: currentVideoId
        });
    }
}

// Event Listeners
loadVideoBtn.addEventListener('click', loadVideo);
sendMessageBtn.addEventListener('click', sendMessage);
syncBtn.addEventListener('click', syncVideo);
messageInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') sendMessage();
});

// Socket.io event listeners
socket.on('users-update', (users) => {
    onlineCount.textContent = `${users.length} online`;
});

socket.on('chat-history', (messages) => {
    chatMessages.innerHTML = messages
        .map(msg => `<div class="message"><strong>${msg.user}:</strong> ${msg.text}</div>`)
        .join('');
    chatMessages.scrollTop = chatMessages.scrollHeight;
});

socket.on('new-message', (msg) => {
    const messageElement = document.createElement('div');
    messageElement.className = 'message';
    messageElement.innerHTML = `<strong>${msg.user}:</strong> ${msg.text}`;
    chatMessages.appendChild(messageElement);
    chatMessages.scrollTop = chatMessages.scrollHeight;
});

socket.on('video-state-change', (data) => {
    if (player && data.videoId === currentVideoId) {
        if (Math.abs(player.getCurrentTime() - data.currentTime) > 2) {
            player.seekTo(data.currentTime);
        }
        
        if (data.state === YT.PlayerState.PLAYING) {
            player.playVideo();
        } else if (data.state === YT.PlayerState.PAUSED) {
            player.pauseVideo();
        }
    }
});

socket.on('video-time-sync', (data) => {
    if (player && data.videoId === currentVideoId) {
        player.seekTo(data.currentTime);
    }
});

// Inicializar
loadYouTubeAPI();
