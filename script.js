// ========== 1. 14维度定义 ==========
const DIMENSIONS = [
    'S1 学业进取欲',
    'S2 拖延倾向',
    'S3 知识深耕度',
    'S4 计划性',
    'I1 人际暴露度',
    'I2 人格伪装度',
    'I3 处世态度',
    'L1 驻留漫游倾向',
    'L2 生活节律态',
    'L3 精神松弛度',
    'A1 规则态度',
    'A2 未来感知力',
    'A3 本心执念度',
    'A4 动机'
];

// ========== 2. 计算理论最高原始分 ==========
function computeMaxRawScores() {
    const maxScores = new Array(14).fill(0);
    modules.forEach(module => {
        module.questions.forEach(question => {
            const numDims = 14;
            const questionMax = new Array(numDims).fill(0);
            question.scores.forEach(scoreArray => {
                for (let dim = 0; dim < numDims; dim++) {
                    if (scoreArray[dim] > questionMax[dim]) {
                        questionMax[dim] = scoreArray[dim];
                    }
                }
            });
            for (let dim = 0; dim < numDims; dim++) {
                maxScores[dim] += questionMax[dim];
            }
        });
    });
    return maxScores;
}
const maxRawScores = computeMaxRawScores();
console.log('各维度理论最高原始分:', maxRawScores);

// ========== 3. 全局状态 ==========
let currentModuleIndex = 0;
const userScores = new Array(14).fill(0);
const userAnswers = {};

// ========== 4. DOM 元素 ==========
const panels = {
    home: document.getElementById('homePanel'),
    gallery: document.getElementById('galleryPanel'),
    quiz: document.getElementById('quizPanel'),
    result: document.getElementById('resultPanel'),
    detail: document.getElementById('detailPanel')  // 新增详情面板
};
const moduleNameEl = document.getElementById('moduleName');
const questionsContainer = document.getElementById('questionsContainer');
const prevBtn = document.getElementById('prevModuleBtn');
const nextBtn = document.getElementById('nextModuleBtn');
const pageIndicator = document.getElementById('pageIndicator');
const exitQuizBtn = document.getElementById('exitQuizBtn');
const startTestBtn = document.getElementById('startTestBtn');
const viewGalleryBtn = document.getElementById('viewGalleryBtn');
const backFromGalleryBtn = document.getElementById('backFromGalleryBtn');
const restartBtn = document.getElementById('restartBtn');
const backHomeBtn = document.getElementById('backHomeBtn');

// ========== 5. 切换面板 ==========
function showPanel(panelId) {
    Object.values(panels).forEach(p => p.classList.remove('active'));
    panels[panelId].classList.add('active');
}

// ========== 6. 重置测试 ==========
function resetQuiz() {
    currentModuleIndex = 0;
    userScores.fill(0);
    for (let key in userAnswers) {
        delete userAnswers[key];
    }
}

// ========== 7. 渲染模块（全局题号） ==========
function renderModule(index) {
    const module = modules[index];
    if (!module) return;
    moduleNameEl.textContent = module.name;

    let totalQuestionsBefore = 0;
    for (let i = 0; i < index; i++) {
        totalQuestionsBefore += modules[i].questions.length;
    }

    let html = '';
    module.questions.forEach((q, qIdx) => {
        const savedOption = userAnswers[q.id] !== undefined ? userAnswers[q.id] : -1;
        const globalNumber = totalQuestionsBefore + qIdx + 1;

        html += `<div class="question-card" data-question-id="${q.id}">`;
        html += `<div class="question-text">${globalNumber}. ${q.text}</div>`;
        html += `<div class="option-list">`;

        q.options.forEach((opt, optIdx) => {
            const checked = (savedOption === optIdx) ? 'checked' : '';
            html += `
                <label class="option-item ${savedOption === optIdx ? 'selected' : ''}">
                    <input type="radio" name="${q.id}" value="${optIdx}" ${checked}>
                    <span>${opt}</span>
                </label>
            `;
        });
        html += `</div></div>`;
    });

    questionsContainer.innerHTML = html;

    module.questions.forEach(q => {
        const radios = document.querySelectorAll(`input[name="${q.id}"]`);
        radios.forEach(radio => {
            radio.addEventListener('change', (e) => {
                const newOptionIndex = parseInt(e.target.value);
                handleAnswerChange(q.id, newOptionIndex);
            });
        });
    });

    prevBtn.disabled = (index === 0);
    const isLast = (index === modules.length - 1);
    nextBtn.textContent = isLast ? '查看结果' : '下一页';
    pageIndicator.textContent = `第 ${index + 1} / ${modules.length} 模块`;
}

// ========== 8. 处理答案变化 ==========
function handleAnswerChange(questionId, newOptionIndex) {
    let question = null;
    for (let m of modules) {
        const found = m.questions.find(q => q.id === questionId);
        if (found) { question = found; break; }
    }
    if (!question) return;

    const oldOptionIndex = userAnswers[questionId];
    if (oldOptionIndex === newOptionIndex) return;

    if (oldOptionIndex !== undefined) {
        const oldScores = question.scores[oldOptionIndex];
        for (let i = 0; i < 14; i++) {
            userScores[i] -= oldScores[i];
        }
    }

    const newScores = question.scores[newOptionIndex];
    for (let i = 0; i < 14; i++) {
        userScores[i] += newScores[i];
    }

    userAnswers[questionId] = newOptionIndex;

    const questionCard = document.querySelector(`.question-card[data-question-id="${questionId}"]`);
    if (questionCard) {
        const labels = questionCard.querySelectorAll('.option-item');
        labels.forEach((label, idx) => {
            const radio = label.querySelector('input[type="radio"]');
            if (radio) radio.checked = (idx === newOptionIndex);
            label.classList.toggle('selected', idx === newOptionIndex);
        });
    }

    console.log('当前14维得分:', userScores.map((v, i) => `${DIMENSIONS[i]}: ${v}`));
}

// ========== 9. 标准化与结果匹配 ==========
function normalizeScores(rawScores, maxRaws) {
    return rawScores.map((raw, idx) => {
        const maxRaw = maxRaws[idx];
        if (maxRaw === 0) return 1;
        return Math.min(2, (raw / maxRaw) * 2);
    });
}

function showResult() {
    // 1. 标准化
    const normalizedUser = normalizeScores(userScores, maxRawScores);
    console.log('标准化得分 (0-2):', normalizedUser);

    // 2. 匹配（传入 userAnswers，阈值 50%）
    const { bestMatch, minDistance, topMatches } = findBestMatch(normalizedUser, userAnswers, 50);
    console.log('最佳匹配人格:', bestMatch, '距离:', minDistance);
    console.log('前三名:', topMatches);

    // 3. 获取描述和详情
    const description = typeof getPersonalityDescription === 'function'
        ? getPersonalityDescription(bestMatch)
        : '一个独特的科广人。';
    const detail = typeof getPersonalityDetail === 'function'
        ? getPersonalityDetail(bestMatch)
        : '';

    // 4. 更新 DOM
    const resultPersonalityEl = document.getElementById('resultPersonality');
    const resultDescEl = document.getElementById('resultDesc');
    const resultSubEl = document.getElementById('resultSub');
    const resultDetailEl = document.getElementById('resultDetail');
    const resultImageEl = document.getElementById('resultImage');

    if (resultPersonalityEl) resultPersonalityEl.textContent = bestMatch;
    if (resultDescEl) resultDescEl.textContent = description;
    if (resultDetailEl) resultDetailEl.textContent = detail;

    if (resultImageEl) {
        const imagePath = `images/${bestMatch}.png`;
        resultImageEl.src = imagePath;
        resultImageEl.alt = bestMatch;
        resultImageEl.onerror = function() {
            this.src = 'images/default.png';
        };
    }

    if (resultSubEl) {
        const displaySimilarity = topMatches.find(item => item.name === bestMatch)?.similarity || topMatches[0]?.similarity;
        if (bestMatch === '自定义') {
            resultSubEl.textContent = `相似度 ${displaySimilarity}% · 低于阈值，判定为独特存在`;
        } else {
            resultSubEl.textContent = `匹配度 ${displaySimilarity}% · 与你最相似的科广人格`;
        }
    }

    showPanel('result');
}

// ========== 10. 事件绑定 ==========
startTestBtn.addEventListener('click', () => {
    resetQuiz();
    renderModule(0);
    showPanel('quiz');
});

// 注意：viewGalleryBtn 只绑定一次，在下面图鉴部分统一处理，此处不再重复绑定
backFromGalleryBtn.addEventListener('click', () => {
    showPanel('home');
});

exitQuizBtn.addEventListener('click', () => {
    if (confirm('确定要退出测试吗？当前进度将丢失。')) {
        resetQuiz();
        showPanel('home');
    }
});

prevBtn.addEventListener('click', () => {
    if (currentModuleIndex > 0) {
        currentModuleIndex--;
        renderModule(currentModuleIndex);
    }
});

nextBtn.addEventListener('click', () => {
    const currentModule = modules[currentModuleIndex];
    const allAnswered = currentModule.questions.every(q => userAnswers[q.id] !== undefined);
    if (!allAnswered) {
        alert('请先回答本页所有题目');
        return;
    }
    if (currentModuleIndex < modules.length - 1) {
        currentModuleIndex++;
        renderModule(currentModuleIndex);
    } else {
        showResult();
    }
});

restartBtn.addEventListener('click', () => {
    resetQuiz();
    renderModule(0);
    showPanel('quiz');
});

backHomeBtn.addEventListener('click', () => {
    resetQuiz();
    showPanel('home');
});

// ========== 11. 图鉴与详情功能 ==========
const galleryGrid = document.getElementById('galleryGrid');
const detailContent = document.getElementById('detailContent');
const backToGalleryBtn = document.getElementById('backToGalleryBtn');
const startFromDetailBtn = document.getElementById('startFromDetailBtn');

const allPersonalities = Object.keys(personalityVectors).filter(name => name !== '自定义');

function renderGallery() {
    let html = '';
    allPersonalities.forEach(name => {
        const imagePath = `images/${name}.png`;
        html += `
      <div class="personality-card" data-personality="${name}">
        <img src="${imagePath}" alt="${name}" onerror="this.src='images/default.png'">
        <h3>${name}</h3>
      </div>
    `;
    });
    galleryGrid.innerHTML = html;

    document.querySelectorAll('.personality-card').forEach(card => {
        card.addEventListener('click', () => {
            const personalityName = card.dataset.personality;
            showDetail(personalityName);
        });
    });
}

function showDetail(name) {
    const imagePath = `images/${name}.png`;
    const slogan = getPersonalityDescription(name);
    const detail = getPersonalityDetail(name);

    const html = `
    <img src="${imagePath}" alt="${name}" class="detail-image" onerror="this.src='images/default.png'">
    <h2 class="detail-name">${name}</h2>
    <p class="detail-slogan">${slogan}</p>
    <div class="detail-description">${detail}</div>
  `;
    detailContent.innerHTML = html;

    panels.gallery.classList.remove('active');
    panels.detail.classList.add('active');
}

// 图鉴按钮绑定（唯一绑定点）
viewGalleryBtn.addEventListener('click', () => {
    renderGallery();
    showPanel('gallery');
});

backToGalleryBtn.addEventListener('click', () => {
    panels.detail.classList.remove('active');
    panels.gallery.classList.add('active');
});

startFromDetailBtn.addEventListener('click', () => {
    resetQuiz();
    renderModule(0);
    showPanel('quiz');
});

// ========== 12. 初始化 ==========
showPanel('home');