const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const path = require('path');

const app = express();
const server = http.createServer(app);
const io = socketIo(server);

// Servir arquivos estáticos
app.use(express.static(path.join(__dirname, 'public')));

// Armazenar salas e usuários
const rooms = new Map();
const defaultRooms = ['Geral', 'Tecnologia', 'Esportes', 'Games', 'Musica'];

// Inicializar salas padrão
defaultRooms.forEach(room => {
    rooms.set(room, new Set());
});

app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Eventos do Socket.IO
io.on('connection', (socket) => {
    console.log('Novo usuário conectado:', socket.id);

    // Enviar lista de salas disponíveis
    socket.emit('rooms_list', Array.from(rooms.keys()));

    // Entrar em uma sala
    socket.on('join_room', (data) => {
        const { room, username } = data;
        
        // Sair da sala anterior, se houver
        if (socket.room) {
            socket.leave(socket.room);
            const roomUsers = rooms.get(socket.room);
            if (roomUsers) {
                roomUsers.delete(socket.username);
                io.to(socket.room).emit('user_left', {
                    username: socket.username,
                    message: `${socket.username} saiu da sala`,
                    users: Array.from(roomUsers)
                });
            }
        }

        // Entrar na nova sala
        socket.join(room);
        socket.room = room;
        socket.username = username;

        // Adicionar usuário à sala
        if (!rooms.has(room)) {
            rooms.set(room, new Set());
        }
        rooms.get(room).add(username);

        // Notificar sala sobre novo usuário
        socket.to(room).emit('user_joined', {
            username,
            message: `${username} entrou na sala`,
            users: Array.from(rooms.get(room))
        });

        // Enviar confirmação para o usuário
        socket.emit('room_joined', {
            room,
            username,
            users: Array.from(rooms.get(room))
        });

        console.log(`${username} entrou na sala ${room}`);
    });

    // Enviar mensagem
    socket.on('send_message', (data) => {
        const { room, message } = data;
        const messageData = {
            username: socket.username,
            message: message,
            timestamp: new Date().toLocaleTimeString()
        };

        // Enviar mensagem para todos na sala
        io.to(room).emit('receive_message', messageData);
        console.log(`Mensagem em ${room}: ${socket.username}: ${message}`);
    });

    // Sair da sala
    socket.on('leave_room', () => {
        if (socket.room) {
            const roomUsers = rooms.get(socket.room);
            if (roomUsers) {
                roomUsers.delete(socket.username);
                socket.to(socket.room).emit('user_left', {
                    username: socket.username,
                    message: `${socket.username} saiu da sala`,
                    users: Array.from(roomUsers)
                });
            }
            socket.leave(socket.room);
            console.log(`${socket.username} saiu da sala ${socket.room}`);
            socket.room = null;
        }
    });

    // Desconectar
    socket.on('disconnect', () => {
        if (socket.room) {
            const roomUsers = rooms.get(socket.room);
            if (roomUsers) {
                roomUsers.delete(socket.username);
                socket.to(socket.room).emit('user_left', {
                    username: socket.username,
                    message: `${socket.username} desconectou`,
                    users: Array.from(roomUsers)
                });
            }
        }
        console.log('Usuário desconectado:', socket.id);
    });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
    console.log(`Servidor rodando na porta ${PORT}`);
    console.log(`Acesse: http://localhost:${PORT}`);
});