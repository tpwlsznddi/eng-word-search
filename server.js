const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const path = require('path');

const app = express();
const server = http.createServer(app);
const io = new Server(server);

app.use(express.static('public', { index: false })); 

app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'player.html'));
});

app.get('/maker', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'maker.html'));
});

app.get('/display', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'display.html'));
});

let currentGrid = null;
let currentWords = [];
let currentSize = 10;
let foundWords = []; 
let foundLines = []; 
let players = []; 
const colors = ['#f44336', '#e91e63', '#9c27b0', '#673ab7', '#3f51b5', '#2196f3', '#00bcd4', '#009688', '#4caf50', '#ff9800', '#ff5722'];

io.on('connection', (socket) => {
    if (currentGrid) socket.emit('syncPuzzle', { grid: currentGrid, words: currentWords, size: currentSize, foundWords: foundWords, foundLines: foundLines });
    socket.emit('updatePlayers', players);

    socket.on('joinGame', (name) => {
        const usedColors = players.map(p => p.color);
        const availableColors = colors.filter(c => !usedColors.includes(c));
        let assignedColor;
        if (availableColors.length > 0) {
            assignedColor = availableColors[Math.floor(Math.random() * availableColors.length)];
        } else {
            assignedColor = '#' + Math.floor(Math.random()*16777215).toString(16).padStart(6, '0');
        }

        const newPlayer = { id: socket.id, name: name, color: assignedColor, score: 0 };
        players.push(newPlayer);
        io.emit('updatePlayers', players); 
    });

    socket.on('newPuzzle', (data) => {
        currentGrid = data.grid;
        currentWords = data.words;
        currentSize = data.size; 
        foundWords = []; 
        foundLines = []; 
        players.forEach(p => p.score = 0);
        
        io.emit('syncPuzzle', { grid: currentGrid, words: currentWords, size: currentSize, foundWords: foundWords, foundLines: foundLines }); 
        io.emit('updatePlayers', players);
    });

    socket.on('correctAnswer', (data) => {
        const player = players.find(p => p.id === socket.id);
        if (!player) return; 

        const { startX, startY, endX, endY, word } = data;
        
        // 💡 1차 방어막: 가로, 세로, 완벽한 45도 대각선이 아니면 오작동으로 간주하고 무시!
        const dx = Math.abs(endX - startX);
        const dy = Math.abs(endY - startY);
        if (dx !== 0 && dy !== 0 && dx !== dy) return;

        if (!foundWords.includes(word)) {
            foundWords.push(word);
            
            player.score += 1;
            io.emit('updatePlayers', players);
            
            data.color = player.color;
            foundLines.push({ startX, startY, endX, endY, color: data.color });
            
            io.emit('colorCells', data); 
            io.emit('wordFound', word);  
        }
    });

    socket.on('disconnect', () => {
        players = players.filter(p => p.id !== socket.id);
        io.emit('updatePlayers', players);
    });
});

const PORT = 3000;
server.listen(PORT, () => {
    console.log(`🚀 서버가 실행되었습니다!`);
});
