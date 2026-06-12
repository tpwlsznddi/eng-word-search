const express = require('express');
const http = require('http');
const { Server } = require('socket.io');

const app = express();
const server = http.createServer(app);
const io = new Server(server);

app.use(express.static('public'));

let currentGrid = null;
let currentWords = [];
let foundWords = []; // 💡 이미 찾은 단어를 기억할 배열
let players = [];
const colors = ['#f44336', '#e91e63', '#9c27b0', '#673ab7', '#3f51b5', '#2196f3', '#00bcd4', '#009688', '#4caf50', '#ff9800', '#ff5722'];

io.on('connection', (socket) => {
    if (currentGrid) socket.emit('syncPuzzle', { grid: currentGrid, words: currentWords, foundWords: foundWords });
    socket.emit('updatePlayers', players);

    socket.on('joinGame', (name) => {
        const randomColor = colors[Math.floor(Math.random() * colors.length)];
        // 💡 score: 0 (기본 점수) 추가
        const newPlayer = { id: socket.id, name: name, color: randomColor, score: 0 };
        players.push(newPlayer);
        io.emit('updatePlayers', players);
    });

    socket.on('newPuzzle', (data) => {
        currentGrid = data.grid;
        currentWords = data.words;
        foundWords = []; // 새 게임 시작 시 찾은 단어 초기화
        players.forEach(p => p.score = 0); // 새 게임 시작 시 점수 초기화

        io.emit('syncPuzzle', { grid: currentGrid, words: currentWords, foundWords: foundWords });
        io.emit('updatePlayers', players);
    });

    socket.on('correctAnswer', (data) => {
        const { startX, startY, endX, endY, word } = data;

        // 💡 누군가 아직 찾지 않은 단어일 경우에만 인정
        if (!foundWords.includes(word)) {
            foundWords.push(word);

            const player = players.find(p => p.id === socket.id);
            if (player) {
                player.score += 1; // 점수 1점 증가
                io.emit('updatePlayers', players); // 변경된 점수 뿌리기
            }

            data.color = player ? player.color : '#FFEB3B';
            io.emit('colorCells', data); // 색 칠하기
            io.emit('wordFound', word);  // 취소선 긋기
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