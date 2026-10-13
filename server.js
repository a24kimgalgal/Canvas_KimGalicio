const express = require('express');
const http = require('http');
const path = require('path');
const { Server } = require('socket.io');

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
    connectionStateRecovery: {
        maxDisconnectionDuration: 2 * 60 * 1000,
    },
});

const port = 7070;
const cursorBySocket = new Map();

app.use(express.static(path.join(__dirname)));

app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

io.on('connection', (socket) => {
    console.log(`Cliente conectado: ${socket.id}`);

    socket.on('register-user', ({ name }) => {
        cursorBySocket.set(socket.id, {
            id: socket.id,
            name: name || 'Anònim',
            x: 0,
            y: 0,
        });

        socket.emit('users-list', Array.from(cursorBySocket.values()));
        socket.broadcast.emit('user-connected', cursorBySocket.get(socket.id));
    });

    socket.on('cursor-move', ({ x, y }) => {
        const user = cursorBySocket.get(socket.id);
        if (!user) return;

        user.x = x;
        user.y = y;
        socket.broadcast.emit('cursor-move', { id: socket.id, x, y });
    });

    socket.on('disconnect', () => {
        const user = cursorBySocket.get(socket.id);
        cursorBySocket.delete(socket.id);

        if (user) {
            socket.broadcast.emit('user-disconnected', { id: socket.id, name: user.name });
        }

        console.log(`Cliente desconectado: ${socket.id}`);
    });
});

server.listen(port, () => {
    console.log(`Server is running on port ${port}`);
});