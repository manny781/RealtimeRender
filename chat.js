// Auto-detect environment
const socketUrl = window.location.hostname === 'localhost' 
  ? 'http://localhost:3000' 
  : 'https://your-render-app.onrender.com';

const socket = io(socketUrl, {
  reconnection: true,
  reconnectionAttempts: 5,
  reconnectionDelay: 1000
});

// DOM Elements
const chatUI = {
  messageForm: document.getElementById('messageForm'),
  messageInput: document.getElementById('message'),
  chatArea: document.getElementById('chatArea'),
  userList: document.getElementById('userList'),
  loginForm: document.getElementById('loginForm'),
  usernameInput: document.getElementById('usernameInput')
};

// User session
let currentUser = {
  id: generateId(),
  name: '',
  avatar: null
};

// Socket Events
socket.on('connect', () => {
  console.log('Connected to server');
  if (currentUser.name) {
    socket.emit('user-joined', currentUser);
  }
});

socket.on('active-users', updateUserList);
socket.on('user-joined', user => showSystemMessage(`${user.name} joined`));
socket.on('user-left', user => showSystemMessage(`${user.name} left`));
socket.on('receive-message', displayMessage);
socket.on('force-disconnect', () => {
  alert('Logged in elsewhere!');
  window.location.reload();
});

// Event Listeners
chatUI.loginForm.addEventListener('submit', handleLogin);
chatUI.messageForm.addEventListener('submit', sendMessage);

// Functions
function handleLogin(e) {
  e.preventDefault();
  currentUser.name = chatUI.usernameInput.value.trim();
  if (!currentUser.name) return;
  
  socket.emit('user-joined', currentUser);
  document.getElementById('loginContainer').style.display = 'none';
  document.getElementById('chatContainer').style.display = 'block';
}

function sendMessage(e) {
  e.preventDefault();
  const message = chatUI.messageInput.value.trim();
  if (!message) return;

  const messageData = {
    message,
    user: currentUser,
    timestamp: new Date().toISOString()
  };

  socket.emit('send-message', messageData);
  displayMessage({ ...messageData, isCurrentUser: true });
  chatUI.messageInput.value = '';
}

function displayMessage(data) {
  const messageElement = document.createElement('div');
  messageElement.className = `message ${data.isCurrentUser ? 'outgoing' : 'incoming'}`;
  messageElement.innerHTML = `
    <span class="sender">${data.user.name}:</span>
    <span class="text">${data.message}</span>
    <span class="time">${new Date(data.timestamp).toLocaleTimeString()}</span>
  `;
  chatUI.chatArea.appendChild(messageElement);
  chatUI.chatArea.scrollTop = chatUI.chatArea.scrollHeight;
}

function updateUserList(users) {
  chatUI.userList.innerHTML = users.map(user => `
    <li class="${user.id === currentUser.id ? 'active' : ''}">
      ${user.name} ${user.id === currentUser.id ? '(You)' : ''}
    </li>
  `).join('');
}

function generateId() {
  return 'user-' + Math.random().toString(36).substr(2, 9);
}
