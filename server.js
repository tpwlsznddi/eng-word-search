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
let foundWords = []; 
let foundLines = []; 
let players = []; 
const colors = ['#f44336', '#e91e63', '#9c27b0', '#673ab7', '#3f51b5', '#2196f3', '#00bcd4', '#009688', '#4caf50', '#ff9800', '#ff5722'];

io.on('connection', (socket) => {
    if (currentGrid) socket.emit('syncPuzzle', { grid: currentGrid, words: currentWords, foundWords: foundWords, foundLines: foundLines });
    socket.emit('updatePlayers', players);

    socket.on('joinGame', (name) => {
        // 💡 1. 현재 접속 중인 사람들이 쓰고 있는 색상들을 모읍니다.
        const usedColors = players.map(p => p.color);
        
        // 💡 2. 아직 아무도 안 쓰고 있는 남은 색상들을 찾습니다.
        const availableColors = colors.filter(c => !usedColors.includes(c));

        let assignedColor;
        // 💡 3. 남은 색상이 있다면 그 중에서 랜덤으로 하나를 줍니다.
        if (availableColors.length > 0) {
            assignedColor = availableColors[Math.floor(Math.random() * availableColors.length)];
        } else {
            // (만약 12명 이상 들어와서 기본 색상을 다 썼다면, 완전히 새로운 무작위 색상을 만들어냅니다)
            assignedColor = '#' + Math.floor(Math.random()*16777215).toString(16).padStart(6, '0');
        }

        const newPlayer = { id: socket.id, name: name, color: assignedColor, score: 0 };
        players.push(newPlayer);
        io.emit('updatePlayers', players); 
    });

    socket.on('newPuzzle', (data) => {
        currentGrid = data.grid;
        currentWords = data.words;
        foundWords = []; 
        foundLines = []; 
        players.forEach(p => p.score = 0);
        
        io.emit('syncPuzzle', { grid: currentGrid, words: currentWords, foundWords: foundWords, foundLines: foundLines }); 
        io.emit('updatePlayers', players);
    });

    socket.on('correctAnswer', (data) => {
        const { startX, startY, endX, endY, word } = data;
        
        if (!foundWords.includes(word)) {
            foundWords.push(word);
            
            const player = players.find(p => p.id === socket.id);
            if (player) {
                player.score += 1;
                io.emit('updatePlayers', players);
            }
            
            data.color = player ? player.color : '#FFEB3B';
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
