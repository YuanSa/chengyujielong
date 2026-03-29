document.addEventListener('DOMContentLoaded', () => {
    // 状态管理
    const state = {
        word: '正在加载',
        pinyin: ['zhèng', 'zài', 'jiā', 'zǎi'],
        explanation: '请稍候，成语数据正在加载中...',
        timer: null,
        time: 0,
        setTime: 30,
        score: 0,
        run: false,
        dict: new Map(), // Use Map for better performance and modern semantics
        past: new Set(),
        idiomData: []
    };

    // DOM 元素引用简化 (Helper)
    const $ = id => document.getElementById(id);

    const els = {
        startScreen: $('start-screen'),
        startBtn: $('start-btn'),
        reviewScreen: $('review-screen'),
        reviewList: $('review-list'),
        reviewScoreContainer: $('review-score-container'),
        reviewScoreVal: $('review-score-val'),
        gameDisplay: $('game'),
        timeBar: $('time-bar'),
        wordDisplay: $('word-display'),
        explanation: $('explanation'),
        answerForm: $('answer-form'),
        inputField: $('input'),
        historyContainer: $('history-container'),
        feedbackMsg: $('feedback-msg')
    };

    // Store ordered history for review
    let historyRecords = [];

    // 移除拼音音调
    const removeTone = pinyinStr =>
        pinyinStr?.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase() || '';

    let feedbackTimeout = null;

    const showFeedback = (message, type) => {
        els.feedbackMsg.textContent = message;

        // Reset class to restart animation
        els.feedbackMsg.className = 'feedback-msg';
        // force reflow
        void els.feedbackMsg.offsetWidth;

        els.feedbackMsg.className = `feedback-msg ${type}`;

        if (feedbackTimeout) clearTimeout(feedbackTimeout);

        if (type === 'error') {
            els.inputField.parentElement.style.borderColor = 'var(--accent-red)';
            setTimeout(() => {
                els.inputField.parentElement.style.borderColor = '';
            }, 400);
        }

        feedbackTimeout = setTimeout(() => {
            els.feedbackMsg.className = 'feedback-msg';
        }, 2000);
    };

    // Helper to create elements with classes/content
    const el = (tag, className, textContent = '') => {
        const element = document.createElement(tag);
        if (className) element.className = className;
        if (textContent) element.textContent = textContent;
        return element;
    };

    // 渲染 UI
    const render = () => {
        // 渲染进度条
        // When time is 0, width is 0. 
        // We use (state.time / state.setTime) but because of the 1s CSS transition, 
        // we subtract 1 from state.time for the visual width so it hits 0 exactly as the timer fires 0.
        const displayTime = Math.max(0, state.time - 1);
        els.timeBar.style.width = `${(displayTime / state.setTime) * 100}%`;

        // 渲染成语字符
        // Only re-render if the word has changed to avoid animation looping on every timer tick
        const currentWordHTML = els.wordDisplay.getAttribute('data-current-word');
        if (currentWordHTML !== state.word) {
            els.wordDisplay.innerHTML = '';
            // Using Array.from to correctly iterate over string characters (handles surrogate pairs if any)
            Array.from(state.word).forEach((char, i) => {
                const pairDiv = el('div', 'pair');

                const pinyinDiv = el('div', 'pinyin', state.pinyin[i] || '');

                const charDiv = el('div', 'character');
                const charSpan = el('span', '', char);
                charDiv.appendChild(charSpan);

                pairDiv.append(pinyinDiv, charDiv);
                pairDiv.style.animationDelay = `${i * 0.1}s`;

                els.wordDisplay.appendChild(pairDiv);
            });
            els.wordDisplay.setAttribute('data-current-word', state.word);
        }

        // 渲染解释和分数
        els.explanation.textContent = state.explanation;
        // els.scoreDisplay.textContent = state.score; // Removed score display from game screen

        // 渲染历史记录 (Bubble up effect)
        // Only show words that are strictly in the past, NOT the current word
        const historyWords = Array.from(state.past).filter(w => w !== state.word);
        const currentPastCount = parseInt(els.historyContainer.getAttribute('data-past-count') || '0', 10);

        if (currentPastCount !== historyWords.length) {
            els.historyContainer.innerHTML = '';

            // Take the last 5 to keep the DOM clean
            const pastArray = historyWords.slice(-5);

            pastArray.reverse().forEach((pastWord, index) => {
                const pastDiv = el('div', 'history-item');

                // Only animate the newest item
                if (index === 0 && currentPastCount > 0) {
                    pastDiv.style.animation = 'slideUp 0.5s cubic-bezier(0.4, 0, 0.2, 1) forwards';
                } else {
                    Object.assign(pastDiv.style, {
                        animation: 'none',
                        opacity: '0.3',
                        transform: 'translateY(0)'
                    });
                }

                // Render as plain text characters, no grid lines
                Array.from(pastWord).forEach(char => {
                    pastDiv.appendChild(el('span', 'history-char', char));
                });

                els.historyContainer.appendChild(pastDiv);
            });
            els.historyContainer.setAttribute('data-past-count', historyWords.length);
        }

        // Keep focus on input if game is running
        if (state.run && document.activeElement !== els.inputField) {
            els.inputField.focus();
        }
    };

    // 设置当前词汇
    const setWord = (item, stats = null) => {
        if (!item) return;
        Object.assign(state, {
            word: item.word,
            pinyin: item.pinyin,
            explanation: item.explanation
        });
        els.inputField.value = '';
        state.past.add(item.word);
        historyRecords.push({
            ...item,
            stats: stats // { addedScore, speedRatio, similarityType }
        });
        els.inputField.focus();
        render();
    };

    // 找提示词
    const getHints = (currentWord, currentPinyin) => {
        const lastChar = currentWord.at(-1);
        const lastPinyin = removeTone(currentPinyin.at(-1));
        const allHints = [];

        for (const item of state.idiomData) {
            // Skip if already used
            if (state.past.has(item.word)) continue;

            const firstChar = item.word.at(0);
            const firstPinyin = removeTone(item.pinyin.split(' ').at(0));

            if (firstChar === lastChar || firstPinyin === lastPinyin) {
                allHints.push(item.word);
            }
        }

        // Randomly pick up to 3 hints
        const shuffled = allHints.sort(() => 0.5 - Math.random());
        return shuffled.slice(0, 3);
    };

    // 结束游戏逻辑抽取
    const triggerGameOver = () => {
        if (state.timer) {
            clearInterval(state.timer);
            state.timer = null;
        }
        state.run = false;

        els.gameDisplay.style.opacity = '0';
        setTimeout(() => {
            els.gameDisplay.style.display = 'none';
            showReviewScreen();
        }, 500);
    };

    // 计时器逻辑
    const interval = () => {
        state.time--;

        render();

        if (state.time <= 0) {
            triggerGameOver();
        }
    };

    // 开始游戏
    const start = (specificWord = null) => {
        if (!state.idiomData.length) return;

        let cleanedWord;
        if (specificWord) {
            cleanedWord = specificWord.replace(/[,， ]/g, '');
        } else {
            const randomItem = state.idiomData[Math.floor(Math.random() * state.idiomData.length)];
            cleanedWord = randomItem.word.replace(/[,， ]/g, '');
        }

        Object.assign(state, {
            run: true,
            time: state.setTime
        });

        const initialWord = state.dict.get(cleanedWord);
        if (initialWord) setWord(initialWord);

        if (state.timer) clearInterval(state.timer);
        state.timer = setInterval(interval, 1000);
    };

    // 解析数据
    const parse = data => {
        state.idiomData = data;
        data.forEach(({ word, pinyin, explanation, derivation, example }) => {
            const cleanedWord = word.replace(/[,， ]/g, '');
            // Clean pinyin: remove commas and split by space
            const cleanedPinyinArray = pinyin.replace(/[,，]/g, '').split(' ').filter(p => p.trim() !== '');

            state.dict.set(cleanedWord, {
                word: cleanedWord,
                pinyin: cleanedPinyinArray,
                explanation,
                derivation: derivation && derivation !== '无' ? derivation : null,
                example: example && example !== '无' ? example : null
            });
        });
        // Don't start automatically anymore, let the user click Start
        render();
    };

    // 加载数据
    const load = () => {
        if (typeof IDIOM_DATA !== 'undefined' && Array.isArray(IDIOM_DATA)) {
            parse(IDIOM_DATA);
        } else {
            console.error('Failed to load local idioms data from IDIOM_DATA.');
            state.explanation = '加载本地数据失败，请检查 data/idiom.js 是否正确。';
            render();
        }
    };

    // 增加分数
    const addScore = (speedRatio, similarityTypes) => {
        let baseScore = 100;

        // 相似度倍率
        // 'char' (字同): 1.5倍
        // 'pinyin_exact' (调同): 1.2倍
        // 'pinyin_base' (音同): 1.0倍
        let similarityMultiplier = 0;
        if (similarityTypes.includes('char')) similarityMultiplier += 1.5;
        if (similarityTypes.includes('pinyin_exact')) similarityMultiplier += 1.2;
        if (similarityTypes.includes('pinyin_base')) similarityMultiplier += 1.0;

        // 如果没有任何匹配，给个保底 1.0（虽然逻辑上不应该走到这里）
        if (similarityMultiplier === 0) similarityMultiplier = 1.0;

        // 速度加成 (0 到 100 之间)
        // 速度越快 (time 越大)，得分越高
        const speedBonus = Math.round(speedRatio * 50);

        const addedScore = Math.round((baseScore * similarityMultiplier) + speedBonus);

        // Calculate time taken for display in review
        const timeTaken = state.setTime - state.time;

        state.score += addedScore;
        state.time = state.setTime;
        render();
        return { addedScore, timeTaken };
    };

    // 校验输入
    const check = e => {
        e.preventDefault(); // 阻止表单提交刷新页面

        if (!state.run) return;

        const rawInput = els.inputField.value.trim();
        const cleanedInput = rawInput.replace(/[,， ]/g, '');

        if (!cleanedInput) return;

        const foundWord = state.dict.get(cleanedInput);

        if (!foundWord) {
            showFeedback('所填之词非成语，请重试。', 'error');
            return;
        }

        const { word: newWord, pinyin: newPinyin } = foundWord;

        // Check rules:
        const lastChar = state.word.at(-1);
        const lastPinyinFull = state.pinyin.at(-1);
        const lastPinyinBase = removeTone(lastPinyinFull);

        const firstChar = newWord.at(0);
        const firstPinyinFull = newPinyin.at(0);
        const firstPinyinBase = removeTone(firstPinyinFull);

        let similarityTypes = [];

        if (firstChar === lastChar) {
            similarityTypes.push('char'); // 字同
        }
        if (firstPinyinFull === lastPinyinFull) {
            similarityTypes.push('pinyin_exact'); // 调同
        }
        if (firstPinyinBase === lastPinyinBase) {
            similarityTypes.push('pinyin_base'); // 音同
        }

        if (similarityTypes.length === 0) {
            showFeedback('首尾文字或读音不匹配，请再思。', 'error');
        } else if (state.past.has(newWord)) {
            showFeedback('此词已用过，请另择他词。', 'error');
        } else {
            const speedRatio = state.time / state.setTime;
            const { addedScore, timeTaken } = addScore(speedRatio, similarityTypes);

            let praise = '妙哉！';
            if (similarityTypes.includes('char')) praise = '字同接龙，绝妙！';
            else if (similarityTypes.includes('pinyin_exact')) praise = '音调皆同，好辞！';

            showFeedback(`${praise} 增加 ${addedScore} 雅量`, 'success');
            setWord(foundWord, { addedScore, timeTaken, similarityTypes });

            // Check if there are any available words to connect next
            // If not, it's a dead end, randomly pick a new word
            const nextHints = getHints(foundWord.word, foundWord.pinyin);
            if (nextHints.length === 0) {
                // Pause timer briefly
                if (state.timer) clearInterval(state.timer);

                showFeedback('此词已绝，系统将为你重新起头！', 'success');

                setTimeout(() => {
                    // Random new word
                    const randomItem = state.idiomData[Math.floor(Math.random() * state.idiomData.length)];
                    const cleanedWord = randomItem.word.replace(/[,， ]/g, '');
                    const initialWord = state.dict.get(cleanedWord);

                    if (initialWord) setWord(initialWord);

                    // Restart timer
                    state.timer = setInterval(interval, 1000);
                }, 2500);
            }
        }
    };

    // 开始游戏
    const startGame = () => {
        els.startScreen.style.opacity = '0';
        setTimeout(() => {
            els.startScreen.style.display = 'none';
            els.gameDisplay.style.display = 'flex';
            els.gameDisplay.style.opacity = '0';
            // trigger reflow
            void els.gameDisplay.offsetWidth;
            els.gameDisplay.style.opacity = '1';

            // Start the actual game logic
            start();
            els.inputField.focus();
        }, 500);
    };

    const restartGame = (startWord = null) => {
        els.reviewScreen.style.opacity = '0';

        setTimeout(() => {
            els.reviewScreen.style.display = 'none';

            // Reset state
            state.score = 0;
            state.past.clear();
            historyRecords = [];
            els.historyContainer.setAttribute('data-past-count', '0');
            els.historyContainer.innerHTML = '';

            els.gameDisplay.style.display = 'flex';
            els.gameDisplay.style.opacity = '0';
            // trigger reflow
            void els.gameDisplay.offsetWidth;
            els.gameDisplay.style.opacity = '1';

            start(startWord);
            els.inputField.focus();
        }, 500);
    };

    const showReviewScreen = () => {
        // Populate review list
        els.reviewList.innerHTML = '';
        historyRecords.forEach((record, idx) => {
            const itemDiv = el('div', 'review-item');

            const headerDiv = el('div', 'review-item-header');

            // Create ruby text for each character
            Array.from(record.word).forEach((char, index) => {
                const charBox = el('div', 'review-char-box');
                const rubyEl = document.createElement('ruby');
                rubyEl.textContent = char;
                const rtEl = document.createElement('rt');
                rtEl.classList.add('ruby');
                rtEl.textContent = record.pinyin[index];
                rubyEl.appendChild(rtEl);
                charBox.appendChild(rubyEl);
                headerDiv.appendChild(charBox);
            });

            // Stats Section (Skip for the first word)
            let statsDiv = null;
            if (idx > 0 && record.stats) {
                statsDiv = el('div', 'review-stats');

                let badgesHTML = `<span class="stat-badge score">+${record.stats.addedScore}</span>`;

                if (record.stats.similarityTypes.includes('char')) {
                    badgesHTML += `<span class="stat-badge">字同</span>`;
                }
                if (record.stats.similarityTypes.includes('pinyin_exact')) {
                    badgesHTML += `<span class="stat-badge">调同</span>`;
                }
                if (record.stats.similarityTypes.includes('pinyin_base')) {
                    badgesHTML += `<span class="stat-badge">音同</span>`;
                }

                const timeTakenSec = record.stats.timeTaken.toFixed(1);
                badgesHTML += `<span class="stat-badge">耗时 ${timeTakenSec}s</span>`;

                statsDiv.innerHTML = badgesHTML;
            }

            const expDiv = el('div', 'review-exp');
            expDiv.innerHTML = `<span class="review-label">释义：</span>${record.explanation}`;

            itemDiv.appendChild(headerDiv);
            itemDiv.appendChild(expDiv);

            if (record.derivation) {
                const derDiv = el('div', 'review-exp derivation');
                derDiv.innerHTML = `<span class="review-label">出处：</span>${record.derivation}`;
                itemDiv.appendChild(derDiv);
            }

            if (statsDiv) itemDiv.appendChild(statsDiv);

            els.reviewList.appendChild(itemDiv);
        });

        // Generate hints for the last word and append to list
        const lastRecord = historyRecords.at(-1);
        const hintsContainer = el('div', 'hints-container');
        hintsContainer.id = 'review-hints-container';

        if (lastRecord) {
            const hints = getHints(lastRecord.word, lastRecord.pinyin);
            if (hints.length > 0) {
                const title = el('div', 'hints-title', '以这些成语重新开始：');
                const list = el('div', 'hints-list');
                hints.forEach(hint => {
                    const hintBtn = el('span', 'hint-word', hint);
                    hintBtn.addEventListener('click', () => restartGame(hint));
                    list.appendChild(hintBtn);
                });

                const orRandomDiv = el('div', 'hints-title', '或者 ');
                orRandomDiv.style.marginTop = '1rem';
                const randomLink = el('a', 'random-restart-link', '随机重开');
                randomLink.href = 'javascript:void(0)';
                randomLink.addEventListener('click', () => restartGame(null));
                orRandomDiv.appendChild(randomLink);

                hintsContainer.append(title, list, orRandomDiv);
            } else {
                const title = el('div', 'hints-title', '真厉害，此词已无词可接！');
                const randomLink = el('a', 'random-restart-link', '随机重开');
                randomLink.href = 'javascript:void(0)';
                randomLink.addEventListener('click', () => restartGame(null));
                title.appendChild(document.createElement('br'));
                title.appendChild(randomLink);
                hintsContainer.appendChild(title);
            }
        }

        els.reviewList.appendChild(hintsContainer);

        if (state.score > 0) {
            els.reviewScoreVal.textContent = state.score;
            els.reviewScoreContainer.style.display = 'flex';
        } else {
            els.reviewScoreContainer.style.display = 'none';
        }

        els.reviewScreen.style.display = 'flex';
        els.reviewScreen.style.opacity = '0';
        void els.reviewScreen.offsetWidth;
        els.reviewScreen.style.opacity = '1';
    };

    // 事件监听
    els.answerForm.addEventListener('submit', check);
    els.startBtn.addEventListener('click', startGame);

    // Ensure input keeps focus when clicking anywhere on the game board
    document.addEventListener('click', (e) => {
        if (state.run && e.target !== els.restartBtn && e.target !== els.startBtn) {
            els.inputField.focus();
        }
    });

    // 初始化渲染
    render();

    // 开始加载数据
    load();
});