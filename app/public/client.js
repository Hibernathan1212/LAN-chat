document.addEventListener('DOMContentLoaded', () => {
  const messagesDiv = document.getElementById('messages');
  const usernameInput = document.getElementById('usernameInput');
  const messageInput = document.getElementById('messageInput');
  const sendButton = document.getElementById('sendButton');

  const socket = new WebSocket(`ws://${window.location.host}`);

  
  function displayMessage(message) {
    const messageElement = document.createElement('div');
    messageElement.classList.add('message');
    
    const timestamp = new Date(message.timestamp).toLocaleTimeString([], {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    });

    messageElement.innerHTML = `
      <span class="username">${escapeHTML(message.username)}:</span>
      <span class="content">${escapeHTML(message.message)}</span>
      <span class="timestamp">${timestamp}</span>
    `;

    messagesDiv.appendChild(messageElement);

    messagesDiv.scrollTop = messagesDiv.scrollHeight; //scroll to bottom
  }

  function escapeHTML(str) { //prevents cross site scripting
    const div = document.createElement('div');
    div.appendChild(document.createTextNode(str));
    return div.innerHTML;
  }

  socket.onopen = (event) => {
    console.log('WebSocket connected');
    messageInput.focus();
  }

  socket.onmessage = (event) => {
    const data = JSON.parse(event.data);

    if (data.type === 'history') {
      data.messages.forEach(displayMessage);
      console.log('Received message history');
    } else if (data.type === 'newMessage') {
      displayMessage(data.message);
      console.log('Received new message:', data.message);
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

      usernameInput.setAttribute('readonly', true); // Lock username after first send
      usernameInput.style.backgroundColor = '#e9ecef';
      usernameInput.style.cursor = 'not-allowed';


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