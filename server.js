// server.js
const express = require('express');
const path = require('path');
const app = express();

const NUM_LINES = 10;
const NUM_STEPS = 12;

app.use(express.json());
// 'public' 폴더를 정적 파일 경로로 설정
app.use(express.static(path.join(__dirname, 'public')));


// 사다리 데이터 생성
function generateLadder() {
    const ladder = Array(NUM_STEPS).fill(0).map(() => Array(NUM_LINES - 1).fill(false));

    for (let i = 0; i < NUM_STEPS; i++) {
        for (let j = 0; j < NUM_LINES - 1; j++) {
            // 연속된 가로줄 방지
            if (j > 0 && ladder[i][j - 1] === true) {
                ladder[i][j] = false;
                continue;
            }
            // 30% 확률로 가로줄 생성
            ladder[i][j] = Math.random() < 0.3;
        }
    }
    return ladder;
}

// API: 사다리 정보를 JSON으로 반환
app.get('/generate-ladder', (req, res) => {
    const ladder = generateLadder();
    res.json({ ladder });
});

// 서버 실행
const PORT = 3000;
app.listen(PORT, () => console.log(`Server running on http://localhost:${PORT}`));
