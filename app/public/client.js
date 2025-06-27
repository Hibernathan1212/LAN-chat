document.addEventListener('DOMContentLoaded', () => {
  const messagesDiv = document.getElementById('messages');
  const usernameInput = document.getElementById('usernameInput');
  const messageInput = document.getElementById('messageInput');
  const sendButton = document.getElementById('sendButton');
  const connectedUsersList = document.getElementById('connectedUsersList');

  const socket = new WebSocket(`ws://${window.location.host}`);

  
  function displayMessage(message) {
    const messageElement = document.createElement('div');
    messageElement.classList.add('message');
    messageElement.setAttribute('data-message-id', message.id);
    
    const timestamp = new Date(message.timestamp).toLocaleTimeString([], {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    });

    messageElement.innerHTML = `
      <div class="message-content-wrapper">
        <span class="username">${escapeHTML(message.username)}</span>
        <span class="ip-address">(${escapeHTML(message.ip)})</span>:
        <span class="content">${escapeHTML(message.message)}</span>
      </div>
      <span class="timestamp">${timestamp}</span>
      <button class="delete-btn" data-id="${message.id}">🗑️</button>
    `;

    messagesDiv.appendChild(messageElement);

    messageElement.querySelector('.delete-btn').addEventListener('click', (event) => {
      const messageId = event.currentTarget.getAttribute('data-id');
      if (confirm('Are you sure you want to delete this message?')) {
        socket.send(JSON.stringify({ type: 'deleteMessage', id: parseInt(messageId) }));
      }
    });

    messagesDiv.scrollTop = messagesDiv.scrollHeight; //scroll to bottom
  }

  function removeMessageElement(id) {
    const messageElement = messagesDiv.querySelector(`[data-message-id="${id}"]`);
    if (messageElement) {
      messageElement.remove();
    }
  }

  function escapeHTML(str) { //prevents cross site scripting
    const div = document.createElement('div');
    div.appendChild(document.createTextNode(str));
    return div.innerHTML;
  }

  function updateConnectedUsers(users) {
    connectedUsersList.innerHTML = '';
    users.forEach(user => {
      const listItem = document.createElement('li');
      listItem.innerHTML = `
        <span class="user-name">${escapeHTML(user.username)}</span>
        <span class="user-ip">(${escapeHTML(user.ip)})</span>
      `;
      connectedUsersList.appendChild(listItem);
    })
    console.log('test');
  }


  socket.onopen = (event) => {
    console.log('WebSocket connected');
    messageInput.focus();
  }

  socket.onmessage = (event) => {
    const data = JSON.parse(event.data);

    if (data.type === 'history') {
      messagesDiv.innerHTML = '';
      data.messages.forEach(displayMessage);
      console.log('Received message history');

    } else if (data.type === 'newMessage') {
      displayMessage(data.message);
      console.log('Received new message:', data.message);

    } else if (data.type === 'messageDeleted') {
      removeMessageElement(data.id);
      console.log('Message deleted:', data.id);

    } else if (data.type === 'connectedUsers') {
      updateConnectedUsers(data.users);
      console.log('Updated connected users:', data.users);
    }
  }

  socket.onclose = (event) => {
    console.log('WebSocket disconnected:', event.reason);
    displayMessage({ username: 'System', message: 'Disconnected from chat. Please refresh to reconnect.', timestamp: new Date().toISOString() });
  }

  socket.onerror = (event) => {
    console.log('WebSocket error:', error);
    displayMessage({username: 'System', message: 'Connection error. Check console for details.', timestamp: new Date().toISOString() })
  }

  function sendMessage() {
    const username = usernameInput.value.trim();
    const messageContent = messageInput.value.trim();

    if (username && messageContent) {
      const chatMessage = {
        type: 'chatMessage',
        username: username,
        content: messageContent,
      };

      socket.send(JSON.stringify(chatMessage));

      messageInput.value = '';

      if (!usernameInput.readOnly) {
        usernameInput.setAttribute('readonly', true);
        usernameInput.style.color = '#e9ecef';
        usernameInput.style.cursor = 'not-allowed';
      }
    }
  }

  sendButton.addEventListener('click', sendMessage);

  messageInput.addEventListener('keypress', (event) => {
    if (event.key === 'Enter') {
      sendMessage();
    }
  });

  const savedUsername = localStorage.getItem('chatUsername');
  if (savedUsername) {
    usernameInput.value = savedUsername;
  }

  usernameInput.addEventListener('change', () => {
    localStorage.setItem('chatUsername', usernameInput.value.trim());
  });
});