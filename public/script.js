class ChatApp {
    constructor() {
        this.socket = null;
        this.currentRoom = null;
        this.username = null;
        this.initializeEvents();
    }

    initializeEvents() {
        document.getElementById('enter-chat').addEventListener('click', () => this.enterChat());
        document.getElementById('username').addEventListener('keypress', (e) => {
            if (e.key === 'Enter') this.enterChat();
        });

        document.getElementById('logout').addEventListener('click', () => this.logout());
        document.getElementById('leave-room').addEventListener('click', () => this.leaveRoom());
        document.getElementById('send-button').addEventListener('click', () => this.sendMessage());
        document.getElementById('message-input').addEventListener('keypress', (e) => {
            if (e.key === 'Enter') this.sendMessage();
        });
    }

    enterChat() {
        const usernameInput = document.getElementById('username');
        const username = usernameInput.value.trim();

        if (!username) {
            alert('Por favor, digite seu nome!');
            return;
        }

        this.username = username;
        this.connectSocket();
        this.showChatScreen();
    }

    connectSocket() {
        this.socket = io();

        this.socket.on('connect', () => {
            console.log('Conectado ao servidor');
        });

        this.socket.on('rooms_list', (rooms) => {
            this.renderRooms(rooms);
        });

        this.socket.on('room_joined', (data) => {
            this.currentRoom = data.room;
            this.updateChatInterface(data);
        });

        this.socket.on('receive_message', (data) => {
            this.displayMessage(data);
        });

        this.socket.on('user_joined', (data) => {
            this.displaySystemMessage(data.message);
            this.updateUsersList(data.users);
        });

        this.socket.on('user_left', (data) => {
            this.displaySystemMessage(data.message);
            this.updateUsersList(data.users);
        });

        this.socket.on('disconnect', () => {
            console.log('Desconectado do servidor');
        });
    }

    showChatScreen() {
        document.getElementById('login-section').classList.remove('active');
        document.getElementById('chat-section').classList.add('active');
        document.getElementById('current-username').textContent = this.username;
    }

    renderRooms(rooms) {
        const roomsList = document.getElementById('rooms-list');
        roomsList.innerHTML = '';

        rooms.forEach(room => {
            const roomElement = document.createElement('div');
            roomElement.className = 'room-item';
            roomElement.innerHTML = `
                <i class="fas fa-hashtag"></i>
                <span>${room}</span>
            `;
            roomElement.addEventListener('click', () => this.joinRoom(room));
            roomsList.appendChild(roomElement);
        });
    }

    joinRoom(room) {
        if (this.currentRoom === room) return;

        document.querySelectorAll('.room-item').forEach(item => {
            item.classList.remove('active');
        });

        const roomElements = document.querySelectorAll('.room-item');
        roomElements.forEach(item => {
            if (item.querySelector('span').textContent === room) {
                item.classList.add('active');
            }
        });

        this.socket.emit('join_room', {
            room: room,
            username: this.username
        });
    }

    updateChatInterface(data) {
        document.getElementById('current-room').textContent = data.room;
        document.getElementById('room-topic').textContent = `${data.users.length} usuários online`;

        document.getElementById('welcome-state').style.display = 'none';
        document.getElementById('chat-area').style.display = 'flex';
        
        const messagesContainer = document.getElementById('messages-container');
        messagesContainer.innerHTML = `
            <div class="empty-chat">
                <i class="fas fa-comment-slash"></i>
                <p>Nenhuma mensagem ainda</p>
                <span>Seja o primeiro a enviar uma mensagem!</span>
            </div>
        `;
        

        this.displaySystemMessage(`Bem-vindo à sala ${data.room}! Você entrou na conversa.`);
        

        this.updateUsersList(data.users);
    }

    leaveRoom() {
        if (this.currentRoom) {
            this.socket.emit('leave_room');
            this.currentRoom = null;

            document.getElementById('welcome-state').style.display = 'flex';
            document.getElementById('chat-area').style.display = 'none';

            const messagesContainer = document.getElementById('messages-container');
            messagesContainer.innerHTML = `
                <div class="empty-chat">
                    <i class="fas fa-comment-slash"></i>
                    <p>Nenhuma mensagem ainda</p>
                    <span>Seja o primeiro a enviar uma mensagem!</span>
                </div>
            `;

            document.getElementById('users-list').innerHTML = `
                <div class="empty-state">
                    <i class="fas fa-door-open"></i>
                    <p>Entre em uma sala para ver os usuários</p>
                </div>
            `;
            document.getElementById('online-count').textContent = '0';

            document.querySelectorAll('.room-item').forEach(item => {
                item.classList.remove('active');
            });
        }
    }

    sendMessage() {
        const messageInput = document.getElementById('message-input');
        const message = messageInput.value.trim();

        if (!message || !this.currentRoom) return;

        this.socket.emit('send_message', {
            room: this.currentRoom,
            message: message
        });

        messageInput.value = '';
        messageInput.focus();
    }

    displayMessage(data) {
        const messagesContainer = document.getElementById('messages-container');
        
        const welcomeMessage = messagesContainer.querySelector('.welcome-message');
        if (welcomeMessage) {
            welcomeMessage.remove();
        }

        const emptyChat = messagesContainer.querySelector('.empty-chat');
        if (emptyChat) {
            emptyChat.remove();
        }

        const messageElement = document.createElement('div');
        
        const isOwnMessage = data.username === this.username;
        
        messageElement.className = `message ${isOwnMessage ? 'own' : 'other'}`;
        
        messageElement.innerHTML = `
            <div class="message-header">
                <strong>${isOwnMessage ? 'Você' : data.username}</strong>
                <span>${data.timestamp}</span>
            </div>
            <div class="message-content">${this.escapeHtml(data.message)}</div>
        `;

        messagesContainer.appendChild(messageElement);
        messagesContainer.scrollTop = messagesContainer.scrollHeight;
    }

    displaySystemMessage(message) {
        const messagesContainer = document.getElementById('messages-container');
        
        const emptyChat = messagesContainer.querySelector('.empty-chat');
        if (emptyChat) {
            emptyChat.remove();
        }

        const messageElement = document.createElement('div');
        messageElement.className = 'message system';
        messageElement.innerHTML = `
            <i class="fas fa-info-circle"></i>
            ${message}
        `;

        messagesContainer.appendChild(messageElement);
        messagesContainer.scrollTop = messagesContainer.scrollHeight;
    }

    updateUsersList(users) {
        const usersList = document.getElementById('users-list');
        const onlineCount = document.getElementById('online-count');
        
        onlineCount.textContent = users.length;
        
        if (users.length === 0) {
            usersList.innerHTML = `
                <div class="empty-state">
                    <i class="fas fa-door-open"></i>
                    <p>Entre em uma sala para ver os usuários</p>
                </div>
            `;
            return;
        }
        
        usersList.innerHTML = '';
        users.forEach(user => {
            const userElement = document.createElement('div');
            userElement.className = 'user-item';
            userElement.innerHTML = `
                <i class="fas fa-circle"></i>
                <span>${this.escapeHtml(user)}</span>
            `;
            usersList.appendChild(userElement);
        });
    }

    logout() {
        if (this.socket) {
            this.socket.disconnect();
        }
        
        this.currentRoom = null;
        this.username = null;

        document.getElementById('chat-section').classList.remove('active');
        document.getElementById('login-section').classList.add('active');
        document.getElementById('welcome-state').style.display = 'flex';
        document.getElementById('chat-area').style.display = 'none';
        document.getElementById('username').value = '';
        document.getElementById('username').focus();

        document.getElementById('users-list').innerHTML = `
            <div class="empty-state">
                <i class="fas fa-door-open"></i>
                <p>Entre em uma sala para ver os usuários</p>
            </div>
        `;
        document.getElementById('online-count').textContent = '0';

        document.querySelectorAll('.room-item').forEach(item => {
            item.classList.remove('active');
        });
    }

    escapeHtml(unsafe) {
        return unsafe
            .replace(/&/g, "&amp;")
            .replace(/</g, "&lt;")
            .replace(/>/g, "&gt;")
            .replace(/"/g, "&quot;")
            .replace(/'/g, "&#039;");
    }
}

document.addEventListener('DOMContentLoaded', () => {
    new ChatApp();
});