// P5.js 遊戲腳本開始

let handPose;
let video;
let hands = [];
// ml5.handPose 模型選項，這裡的 flipped: true 是指模型內部處理影像時是否翻轉
let options = { flipped: true }; 

let words = []; // 陣列用於存放掉落中的詞彙物件 (大部分時間只會有一個)
const categories = {
    "工具": [],
    "數位科技": [],
    "學習理論": []
};

const allWords = [
    { text: "簡報軟體", category: "工具" },
    { text: "學習管理系統", category: "工具" },
    { text: "視訊會議", category: "工具" },
    { text: "電子白板", category: "工具" },
    { text: "測驗工具", category: "工具" },
    { text: "人工智慧", category: "數位科技" },
    { text: "虛擬實境", category: "數位科技" },
    { text: "擴增實境", category: "數位科技" },
    { text: "大數據", category: "數位科技" },
    { text: "雲端運算", category: "數位科技" },
    { text: "建構主義", category: "學習理論" },
    { text: "行為主義", "category": "學習理論" },
    { text: "認知負荷", category: "學習理論" },
    { text: "社會學習", category: "學習理論" },
    { text: "翻轉課堂", category: "學習理論" },
];

let score = 0;
let timer = 60; // 秒
let gameStarted = false;
let gameEnded = false;
let countdown = 5; // 新增 5 秒倒數計時變數
let countdownInterval; // 用於儲存倒數計時的 setInterval ID

let feedbackText = "";
let feedbackColor;
let feedbackDisplayTime = 0;
const feedbackDuration = 1000; // 毫秒，顯示回饋的時間

const categoryZones = {}; // 用於儲存分類區塊的座標

function preload() {
    // 載入 ml5.js 的 handPose 模型
    handPose = ml5.handPose(options);
}

function setup() {
    // 建立畫布，增加大小以容納分類區塊
    createCanvas(1000, 600);
    // 建立視訊捕捉器
    video = createCapture(VIDEO);
    video.size(width, height);
    video.hide(); // 隱藏原始視訊元素
    // 開始手部姿勢偵測
    handPose.detectStart(video, gotHands);

    // 定義分類區塊的座標和尺寸
    const categoryWidth = width / 3 - 20;
    const categoryHeight = 100;
    const categoryY = height - categoryHeight - 20;

    categoryZones["工具"] = { x: 10, y: categoryY, w: categoryWidth, h: categoryHeight };
    categoryZones["數位科技"] = { x: width / 3 + 10, y: categoryY, w: categoryWidth, h: categoryHeight };
    categoryZones["學習理論"] = { x: 2 * width / 3 + 10, y: categoryY, w: categoryWidth, h: categoryHeight };

    // 設定文字對齊和模式
    textAlign(CENTER, CENTER);
    textSize(24); // 遊戲開始前的提示文字尺寸
    rectMode(CORNER);

    // 啟動 5 秒倒數計時
    countdownInterval = setInterval(updateCountdown, 1000);
}

function draw() {
    background(0); // 黑色背景
    
    // 將畫布翻轉，實現視訊鏡像顯示
    push();
    translate(width, 0); // 將原點移動到畫布右側
    scale(-1, 1); // 水平翻轉
    image(video, 0, 0, width, height); // 在畫布上顯示視訊畫面
    pop(); // 恢復畫布的原始變換設定，不影響後續元素的繪製

    // 遊戲開始前顯示倒數計時和提示
    if (!gameStarted) {
        fill(255); // 白色文字
        textSize(60); // 倒數數字尺寸
        text(countdown, width / 2, height / 2 - 80); // 顯示倒數數字
        textSize(40); // 「準備開始！」文字尺寸
        text("準備開始！", width / 2, height / 2);
        textSize(28); // 提示文字尺寸
        text("請將詞彙拖曳至正確的分類區塊", width / 2, height / 2 + 50);
        return; // 遊戲未開始時不執行後續遊戲邏輯
    }

    // 遊戲結束時顯示結果
    if (gameEnded) {
        fill(255); // 白色文字
        textSize(50); // 「遊戲結束！」文字尺寸
        text("遊戲結束！", width / 2, height / 2 - 50);
        text(`最終分數: ${score}`, width / 2, height / 2 + 20);
        return; // 遊戲結束時不執行後續遊戲邏輯
    }

    // 顯示計時器和分數
    fill(255); // 白色文字
    textSize(36); // 計時器和分數文字尺寸
    text(`時間: ${timer}s`, width - 150, 40);
    text(`分數: ${score}`, 150, 40);

    // 繪製分類區塊
    drawCategoryZones();

    // 只有當螢幕上沒有詞彙時才生成新詞彙 (確保一次一個)
    if (words.length === 0 && !gameEnded) {
        spawnNewWord();
    }

    // 更新並顯示詞彙
    for (let i = words.length - 1; i >= 0; i--) {
        let word = words[i];

        // 詞彙持續掉落，無論是否被拖曳
        word.y += word.speed;

        // 如果詞彙正在被拖曳，則只更新詞彙的水平位置
        if (word.isDragging && hands.length > 0 && hands[0].keypoints[8]) {
            let indexFinger = hands[0].keypoints[8];
            word.x = indexFinger.x; // 只更新 X 座標
            // word.y 會在上面持續增加，實現邊拖曳邊掉落
        }

        // 繪製詞彙主體
        fill(255, 255, 0); // 將詞彙顏色設定為黃色，使其更明顯
        textSize(32); // 詞彙文字尺寸增加
        
        text(word.text, word.x, word.y);
        
        // 增加黑色描邊以提高對比度
        stroke(0); // 黑色描邊
        strokeWeight(3); // 描邊粗細
        text(word.text, word.x, word.y); // 再次繪製文字以套用描邊
        noStroke(); // 畫完後移除描邊，避免影響其他繪製

        // 如果詞彙掉出畫面 (且未被拖曳)，則移除並扣分
        if (word.y > height && !word.isDragging) {
            words.splice(i, 1);
            score = max(0, score - 1); // 錯過詞彙的懲罰
            displayFeedback("詞彙掉落，分數 -1！", color(255, 0, 0)); // 紅色回饋
        }
    }

    // 手勢互動邏輯用於拖曳詞彙
    if (hands.length > 0 && hands[0].keypoints[8]) { // 確保食指點存在
        let indexFinger = hands[0].keypoints[8];
        // 檢查手指是否懸停在詞彙上方以開始拖曳 (30 像素半徑)
        for (let word of words) {
            if (!word.isDragging && dist(indexFinger.x, indexFinger.y, word.x, word.y) < 30) {
                word.isDragging = true;
            }
        }
    }

    // 檢查被釋放的詞彙 (是否放入分類區塊)
    checkReleasedWords();

    // 顯示回饋訊息 (例如「答對了！」或「答錯了！」)
    if (millis() < feedbackDisplayTime + feedbackDuration) {
        push(); // 儲存當前繪圖設定
        textSize(36); // 回饋文字尺寸
        fill(feedbackColor); // 回饋文字顏色
        text(feedbackText, width / 2, height / 2); // 顯示回饋文字
        pop(); // 恢復之前的繪圖設定
    }
}

// 繪製分類區塊
function drawCategoryZones() {
    for (let category in categoryZones) {
        let zone = categoryZones[category];
        noFill(); // 不填充
        stroke(255); // 白色邊框
        strokeWeight(3); // 增加邊框粗細
        rect(zone.x, zone.y, zone.w, zone.h, 10); // 繪製圓角矩形

        fill(255); // 白色文字
        textSize(30); // 分類區塊文字尺寸增加
        text(category, zone.x + zone.w / 2, zone.y + zone.h / 2); // 顯示分類名稱
    }
}

// 生成一個新詞彙
function spawnNewWord() {
    // 檢查是否還有未出現的詞彙
    if (allWords.length > 0) {
        // 從 allWords 陣列中隨機選取一個詞彙
        let randomIndex = floor(random(allWords.length));
        let wordData = allWords[randomIndex];
        
        // 將選中的詞彙添加到 words 陣列中
        words.push({
            text: wordData.text,
            category: wordData.category,
            x: random(50, width - 50), // 隨機水平位置
            y: -20, // 從螢幕上方開始
            speed: random(0.8, 2), // 隨機掉落速度
            isDragging: false // 初始狀態未被拖曳
        });

        // 從 allWords 中移除已生成的詞彙，確保不會重複出現，直到所有詞彙都出現過
        allWords.splice(randomIndex, 1);

        // 如果所有詞彙都已出現，可以考慮重新填充 allWords 陣列，或結束遊戲
        if (allWords.length === 0) {
            // 這裡可以選擇重新填充 allWords 陣列，讓遊戲無限進行
            // 或者可以設定一個標誌，當所有詞彙都出現過後結束遊戲
            // 例如：allWords.push(...originalAllWordsArray); // 如果有備份原始詞彙陣列
        }
    } else {
        // 如果所有詞彙都已經掉落完畢且被處理，可以設定遊戲結束的條件
        if (words.length === 0 && !gameEnded) {
            gameEnded = true;
        }
    }
}

// 檢查被釋放的詞彙是否被正確分類
function checkReleasedWords() {
    for (let i = words.length - 1; i >= 0; i--) {
        let word = words[i];

        // 如果詞彙正在被拖曳，但現在手勢消失或手指距離過遠 (偵測拖曳結束)
        if (word.isDragging && (hands.length === 0 || !hands[0].keypoints[8] || dist(hands[0].keypoints[8].x, hands[0].keypoints[8].y, word.x, word.y) > 50)) {
            word.isDragging = false; // 停止拖曳

            let droppedCorrectly = false;
            // 檢查詞彙是否被釋放到任一分類區塊內
            for (let category in categoryZones) {
                let zone = categoryZones[category];
                if (word.x > zone.x && word.x < zone.x + zone.w &&
                    word.y > zone.y && word.y < zone.y + zone.h) {

                    // 如果放入正確的分類區塊
                    if (word.category === category) {
                        score += 10; // 加分
                        displayFeedback("答對了！ +10 分！", color(0, 255, 0)); // 綠色回饋
                        droppedCorrectly = true;
                    } else {
                        // 如果放入錯誤的分類區塊
                        score = max(0, score - 5); // 扣分
                        displayFeedback(`答錯了！這是屬於「${word.category}」`, color(255, 0, 0)); // 紅色回饋
                    }
                    words.splice(i, 1); // 詞彙被分類後從陣列中移除
                    break; // 停止檢查其他區域，因為已經找到一個區域了
                }
            }

            // 如果詞彙被釋放但未放入任何正確的分類區塊，則扣分並移除 (處理詞彙被丟在空白區域的情況)
            if (!droppedCorrectly && words.includes(word)) {
                words.splice(i, 1);
                score = max(0, score - 2); // 只是錯過區域的輕微懲罰
                displayFeedback("未放入正確區塊！", color(255, 165, 0)); // 橙色表示未分類
            }
        }
    }
}

// 顯示回饋訊息
function displayFeedback(text, col) {
    feedbackText = text;
    feedbackColor = col;
    feedbackDisplayTime = millis();
}

// 更新計時器 (遊戲主計時器)
function updateTimer() {
    if (gameStarted && !gameEnded) {
        timer--;
        if (timer <= 0) {
            gameEnded = true; // 遊戲結束
            // 這裡不需要再設置 gameStarted = false; 因為 gameEnded 已經足夠判斷遊戲狀態
        }
    }
}

// 新增：更新倒數計時
function updateCountdown() {
    countdown--;
    if (countdown <= 0) {
        clearInterval(countdownInterval); // 清除倒數計時器
        gameStarted = true; // 遊戲開始
        setInterval(updateTimer, 1000); // 啟動主遊戲計時器
        spawnNewWord(); // 遊戲開始時立即生成第一個詞彙
    }
}

// ml5.js 手部姿勢偵測的回呼函數
function gotHands(results) {
    hands = results;
}

// P5.js 遊戲腳本結束

