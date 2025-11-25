// public/script.js
const NUM_LINES = 10;
const NUM_STEPS = 12;
const LADDER_HEIGHT = 400;

let ladderStructure = [];
let selectedIndices = []; 
let isAnimating = false;

// --- 서버에서 사다리 구조 가져오기 ---
async function fetchLadder() {
    try {
        const res = await fetch('/generate-ladder');
        if (!res.ok) {
            throw new Error(`HTTP error! status: ${res.status}`);
        }
        const data = await res.json();
        return data.ladder;
    } catch (error) {
        console.error("🚨 서버 연결 또는 데이터 가져오기 실패:", error);
        document.getElementById('results-display').innerHTML = 
            "<span style='color:red;'>🚨 서버 연결에 실패했습니다. (Node.js 서버 실행 확인 필요)</span>";
        return null; 
    }
}

// --- 화면에 사다리 그리기 ---
function drawLadder() {
    const board = document.getElementById('ladder-board');
    const topLabels = document.getElementById('top-labels');
    const bottomLabels = document.getElementById('bottom-labels');

    if (!board || !topLabels || !bottomLabels) return; // 요소가 없으면 종료

    board.innerHTML = '';
    topLabels.innerHTML = '';
    bottomLabels.innerHTML = '';

    const boardWidth = board.clientWidth; 
    const verticalLineGap = boardWidth / NUM_LINES; 
    const bridgeHeightInterval = LADDER_HEIGHT / (NUM_STEPS + 1);

    // 1. 라벨 생성
    for (let i = 0; i < NUM_LINES; i++) {
        const startLabel = document.createElement('div');
        startLabel.className = `label start-${i}`;
        startLabel.textContent = i;
        startLabel.onclick = () => handleLabelClick(i);
        topLabels.appendChild(startLabel);

        const endLabel = document.createElement('div');
        endLabel.className = `label end-${i}`;
        endLabel.textContent = `?`; 
        bottomLabels.appendChild(endLabel);
    }

    // 2. 사다리 구조 생성
    for (let j = 0; j < NUM_LINES; j++) {
        const lineLeft = j * verticalLineGap + (verticalLineGap / 2);

        const verticalLine = document.createElement('div');
        verticalLine.className = 'vertical-line';
        verticalLine.style.left = `${lineLeft}px`;
        board.appendChild(verticalLine);

        ladderStructure.forEach((step, i) => {
            if (j < NUM_LINES - 1 && step[j]) {
                const bridge = document.createElement('div');
                bridge.className = 'bridge';
                bridge.dataset.lineIndex = j;
                bridge.dataset.stepIndex = i;
                
                bridge.style.width = `${verticalLineGap}px`;
                bridge.style.height = '4px';
                bridge.style.top = `${(i + 1) * bridgeHeightInterval}px`;
                bridge.style.left = `${lineLeft}px`;
                
                board.appendChild(bridge);
            }
        });
    }
}

// --- 클릭 핸들러 (2개 선택 로직) ---
function handleLabelClick(index) {
    if (isAnimating || ladderStructure === null || ladderStructure.length === 0) return;
    if (selectedIndices.includes(index)) return; 

    const colors = ['red', 'blue'];
    
    selectedIndices.push(index);
    
    const label = document.querySelector(`.start-${index}`);
    const color = colors[selectedIndices.length - 1];
    label.classList.add('active', `bg-${color}`);

    if (selectedIndices.length === 2) {
        runDualAnimation();
    }
}

// --- 두 개의 공 동시 실행 (오류 처리 강화) ---
async function runDualAnimation() {
    if (isAnimating) return;
    
    isAnimating = true;
    document.getElementById('spinner').style.display = 'block';

    try {
        const [start1, start2] = selectedIndices;
        
        // Promise.all로 두 공의 애니메이션을 동시에 실행하고 결과를 기다림
        const results = await Promise.all([
            animatePath(start1, 'red'),
            animatePath(start2, 'blue')
        ]);

        const [end1, end2] = results;
        displayResult(start1, end1, start2, end2); // <-- 결과 표시 함수 호출
        
    } catch (error) {
        console.error("❌ 애니메이션 중 예상치 못한 오류 발생:", error);
        document.getElementById('results-display').innerHTML = 
            "<span style='color:red;'>❌ 사다리 이동 중 오류가 발생했습니다. (콘솔 확인 요망)</span>";
    } finally {
        isAnimating = false;
        document.getElementById('spinner').style.display = 'none'; // 스피너 종료는 finally에서 실행
    }
}

// --- 개별 공 애니메이션 (수정 완료) ---
async function animatePath(startIndex, colorType) {
    const board = document.getElementById('ladder-board');
    if (!board) return startIndex; 
    
    const boardWidth = board.clientWidth;
    const verticalLineGap = boardWidth / NUM_LINES;
    const bridgeHeightInterval = LADDER_HEIGHT / (NUM_STEPS + 1);

    let line = startIndex;
    let y = 0;
    
    // 플레이어 포인터 생성 (지역 변수로 선언)
    const pointer = document.createElement('div');
    pointer.className = `player-pointer pointer-${colorType}`; 
    
    let currentX = line * verticalLineGap + (verticalLineGap / 2) - 8; 
    pointer.style.left = `${currentX}px`;
    pointer.style.top = `${y}px`;
    board.appendChild(pointer);

    for (let i = 0; i < NUM_STEPS; i++) {
        await new Promise(r => setTimeout(r, 150)); 
        y = (i + 1) * bridgeHeightInterval;
        pointer.style.top = `${y}px`;

        if (line < NUM_LINES - 1 && ladderStructure[i][line]) {
            highlightBridge(line, i, colorType);
            await new Promise(r => setTimeout(r, 200));
            line++;
            currentX = line * verticalLineGap + (verticalLineGap / 2) - 8;
            pointer.style.left = `${currentX}px`;

        } else if (line > 0 && ladderStructure[i][line - 1]) {
            highlightBridge(line - 1, i, colorType);
            await new Promise(r => setTimeout(r, 200));
            line--;
            currentX = line * verticalLineGap + (verticalLineGap / 2) - 8;
            pointer.style.left = `${currentX}px`;
        }
    }

    // 최종 도착
    await new Promise(r => setTimeout(r, 300));
    y = LADDER_HEIGHT; 
    pointer.style.top = `${y}px`;

    // 🔴 최종 도착 후 포인터 제거 (오류 방지)
    if (pointer && board.contains(pointer)) {
        await new Promise(r => setTimeout(r, 100));
        pointer.remove();
    }

    // 도착 라벨 강조
    const endLabel = document.querySelector(`.end-${line}`);
    if (endLabel) { // 요소 존재 확인
        endLabel.classList.add('active', `bg-${colorType}`);
    }

    return line; 
}

// --- 자취 색칠하기 ---
function highlightBridge(line, step, color) {
    const el = document.querySelector(
        `.bridge[data-line-index="${line}"][data-step-index="${step}"]`
    );
    if (el) {
        el.style.backgroundColor = color === 'red' ? '#e53935' : '#1e88e5';
        el.style.boxShadow = `0 0 5px ${color === 'red' ? '#e53935' : '#1e88e5'}`;
    }
}

// --- 볼륨 결과 표시 함수 (수정 완료) ---
function displayResult(s1, e1, s2, e2) {
    const display = document.getElementById('results-display');
    
    const tens = e1;
    const units = e2;
    
    const volume = tens * 10 + units;

    const volumeBarHtml = `
        <div class="volume-bar-container">
            <div class="volume-bar" style="width: ${volume}%;"></div>
        </div>
    `;

    display.innerHTML = `
        <h3>Volume: ${volume}</h3>
        ${volumeBarHtml}
    `;
    
    // 🔴 10의 자리 라벨 최종 텍스트 업데이트
    const endLabel1 = document.querySelector(`.end-${e1}`);
    if (endLabel1) {
        endLabel1.innerHTML = `<span style="font-size:0.8em; color:red;"></span>${e1}`;
    }

    // 🔵 1의 자리 라벨 최종 텍스트 업데이트 (도착점이 같을 경우를 처리)
    const endLabel2 = document.querySelector(`.end-${e2}`);
    if (endLabel2) {
        endLabel2.innerHTML = `<span style="font-size:0.8em; color:blue;"></span>${e2}`;
    }
}


function clearResults() {
    selectedIndices = [];
    isAnimating = false;
    document.getElementById('results-display').innerHTML = "Choose another nodes";
    
    document.querySelectorAll('.label').forEach(e => {
        e.className = 'label';
        if(e.parentElement.id === 'bottom-labels') e.textContent = '?';
    });
    
    document.querySelectorAll('.bridge').forEach(e => {
        e.style.backgroundColor = '#ddd';
        e.style.boxShadow = 'none';
    });

    document.querySelectorAll('.player-pointer').forEach(e => e.remove());
    document.getElementById('spinner').style.display = 'none';
}

async function setupGame() {
    clearResults();
    document.getElementById('results-display').innerHTML = "loading ladder data...";
    
    ladderStructure = await fetchLadder();
    
    if(ladderStructure) {
        drawLadder();
        document.getElementById('results-display').innerHTML = "Choose two another numbers";
    } else {
        document.getElementById('results-display').innerHTML = "<span style='color:red;'>🚨 failed to load the ladder</span>";
    }
}

window.onload = setupGame;
window.onresize = drawLadder;
