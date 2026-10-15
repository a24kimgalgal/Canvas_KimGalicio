const express = require('express');
const http = require('http');
const path = require('path');
const { Server } = require('socket.io');

const app = express();
const server = http.createServer(app);
const io = new Server(server);

const PORT = 40601;
const users = new Map();

function getUsersList() {
    return Array.from(users.values());
}

app.use(express.static(path.join(__dirname)));

app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

io.on('connection', (socket) => {
    console.log('Cliente conectado:', socket.id);

    socket.on('register-user', ({ name }) => {
        const user = {
            id: socket.id,
            name: name || 'Anònim',
            x: 0,
            y: 0,
            strokes: []
        };

        users.set(socket.id, user);

        socket.emit('users-list', getUsersList());
        socket.broadcast.emit('user-connected', user);
    });

    socket.on('cursor-move', ({ x, y }) => {
        const user = users.get(socket.id);
        if (!user) return;

        user.x = x;
        user.y = y;

        socket.broadcast.emit('cursor-move', {
            id: socket.id,
            x,
            y
        });
    });

    socket.on('drawing', (stroke) => {
        if (!Array.isArray(stroke) || stroke.length === 0) return;

        socket.broadcast.emit('drawing', {
            id: socket.id,
            stroke
        });
    });

    socket.on('disconnect', () => {
        const user = users.get(socket.id);
        users.delete(socket.id);

        if (user) {
            socket.broadcast.emit('user-disconnected', {
                id: socket.id,
                name: user.name
            });
        }

        console.log('Cliente desconectado:', socket.id);
    });
});

server.listen(PORT, () => {
    console.log(`Servidor escuchando en el puerto ${PORT}`);
});
