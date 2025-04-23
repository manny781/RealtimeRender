const socket = io('https://chat-app-server.onrender.com');
const chatArea = document.getElementById('chatArea');
const form = document.getElementById('messageForm');
const messageInput = document.getElementById('message');
const userList = document.getElementById('userList');
const chatHeader = document.getElementById('chatHeader');

// Get or create user
let currentUser = JSON.parse(localStorage.getItem('user')) || {
  id: generateId(),
  name: `User${Math.floor(Math.random() * 1000)}`
};
localStorage.setItem('user', JSON.stringify(currentUser));

let selectedUserId = null; // For private messages
let activeUsers = {}; // Track all active users

// Join chat with current user
socket.emit('user-joined', currentUser);

// Form submission
form.addEventListener('submit', e => {
  e.preventDefault();
  const msg = messageInput.value.trim();
  if (!msg) return;
  
  const data = {
    message: msg,
    user: currentUser,
    to: selectedUserId,
    timestamp: new Date().toISOString()
  };
  
  appendMessage({
    text: msg,
    sender: 'You',
    isPrivate: !!selectedUserId,
    isSystem: false
  });
  
  socket.emit('send-message', data);
  messageInput.value = '';
});

// Socket event handlers
socket.on('user-joined', user => {
  appendSystem(`${user.name} joined the chat`);
  updateActiveUsers();
});

socket.on('user-left', user => {
  appendSystem(`${user.name} left the chat`);
  updateActiveUsers();
});

socket.on('receive-message', data => {
  const isPrivate = data.to === socket.id;
  const sender = isPrivate ? `${data.user.name} (private)` : data.user.name;
  
  appendMessage({
    text: data.message,
    sender: sender,
    isPrivate: isPrivate,
    isSystem: false
  });
});

socket.on('active-users', users => {
  activeUsers = users.reduce((acc, user) => {
    acc[user.id] = user;
    return acc;
  }, {});
  renderUserList();
});

// Helper functions
function appendMessage({ text, sender, isPrivate, isSystem }) {
  const div = document.createElement('div');
  div.className = `chat-message ${isPrivate ? 'private' : ''} ${isSystem ? 'system' : ''}`;
  
  const senderSpan = document.createElement('span');
  senderSpan.className = 'message-sender';
  senderSpan.textContent = `${sender}: `;
  
  const textSpan = document.createElement('span');
  textSpan.className = 'message-text';
  textSpan.textContent = text;
  
  div.appendChild(senderSpan);
  div.appendChild(textSpan);
  chatArea.appendChild(div);
  chatArea.scrollTop = chatArea.scrollHeight;
}

function appendSystem(msg) {
  appendMessage({
    text: msg,
    sender: 'System',
    isPrivate: false,
    isSystem: true
  });
}

function renderUserList() {
  userList.innerHTML = '';
  
  // Add "Everyone" option for group chat
  const everyoneOption = document.createElement('li');
  everyoneOption.textContent = 'Everyone';
  everyoneOption.className = !selectedUserId ? 'active' : '';
  everyoneOption.addEventListener('click', () => {
    selectedUserId = null;
    chatHeader.textContent = 'Group Chat';
    document.querySelectorAll('#userList li').forEach(li => li.classList.remove('active'));
    everyoneOption.classList.add('active');
  });
  userList.appendChild(everyoneOption);
  
  // Add other users
  Object.values(activeUsers).forEach(user => {
    if (user.id === currentUser.id) return;
    
    const userElement = document.createElement('li');
    userElement.textContent = user.name;
    userElement.className = selectedUserId === user.id ? 'active' : '';
    userElement.addEventListener('click', () => {
      selectedUserId = user.id;
      chatHeader.textContent = `Private Chat with ${user.name}`;
      document.querySelectorAll('#userList li').forEach(li => li.classList.remove('active'));
      userElement.classList.add('active');
    });
    userList.appendChild(userElement);
  });
}

function generateId() {
  return Math.random().toString(36).substr(2, 9);
}

// Initialize
updateActiveUsers = () => socket.emit('get-active-users');