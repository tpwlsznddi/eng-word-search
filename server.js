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
let foundLines = []; // 💡 새로 추가됨: 선을 그렸던 좌표와 색상을 기억하는 장부
let players = []; 
const colors = ['#f44336', '#e91e63', '#9c27b0', '#673ab7', '#3f51b5', '#2196f3', '#00bcd4', '#009688', '#4caf50', '#ff9800', '#ff5722'];

io.on('connection', (socket) => {
    // 💡 중간에 들어오면 장부(foundLines)도 같이 넘겨줍니다.
    if (currentGrid) socket.emit('syncPuzzle', { grid: currentGrid, words: currentWords, foundWords: foundWords, foundLines: foundLines });
    socket.emit('updatePlayers', players);

    socket.on('joinGame', (name) => {
        const randomColor = colors[Math.floor(Math.random() * colors.length)];
        const newPlayer = { id: socket.id, name: name, color: randomColor, score: 0 };
        players.push(newPlayer);
        io.emit('updatePlayers', players); 
    });

    socket.on('newPuzzle', (data) => {
        currentGrid = data.grid;
        currentWords = data.words;
        foundWords = []; 
        foundLines = []; // 새 게임 시작 시 장부 초기화
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
            
            // 💡 선을 그릴 때마다 장부에 위치와 색상 기록
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
