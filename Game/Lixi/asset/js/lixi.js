// Available denominations
        const denominations = [
            { label: '1k', value: 1000 },
            { label: '2k', value: 2000 },
            { label: '5k', value: 5000 },
            { label: '10k', value: 10000 },
            { label: '20k', value: 20000 },
            { label: '50k', value: 50000 },
            { label: '100k', value: 100000 },
            { label: '200k', value: 200000 },
            { label: '500k', value: 500000 }
        ];

        // Store selected quantities for each denomination {value: count}
        const selectedQuantities = {};
        denominations.forEach(d => {
            selectedQuantities[d.value] = 0;
        });

        // DOM elements
        const settingSection = document.getElementById('settingSection');
        const wheelSection = document.getElementById('wheelSection');
        const totalMoney = document.getElementById('totalMoney');
        const moneyGrid = document.getElementById('moneyGrid');
        const clearBtn = document.getElementById('clearBtn');
        const doneBtn = document.getElementById('doneBtn');

        const canvas = document.getElementById('wheelCanvas');
        const spinBtn = document.getElementById('spinBtn');
        const remainingMoneyText = document.getElementById('remainingMoneyText');
        const backToSettingsBtn = document.getElementById('backToSettingsBtn');

        const celebrationModal = document.getElementById('celebrationModal');
        const modalPrizeAmount = document.getElementById('modalPrizeAmount');
        const claimBtn = document.getElementById('claimBtn');

        const outOfMoneyModal = document.getElementById('outOfMoneyModal');
        const backToWheelBtn = document.getElementById('backToWheelBtn');

        // State variables
        let wheelItems = []; // List of all denominations x 2
        let startAngle = 0;   // Current wheel rotation in radians
        let isSpinning = false;
        let audioCtx = null;

        // Formats values to display in a clean string
        function formatMoney(value) {
            if (value >= 1000) return `${value / 1000}k`;
            return `${value}đ`;
        }

        // Play boundary ticking sound via Web Audio API Synthesizer
        function playTickSound() {
            try {
                if (!audioCtx) {
                    audioCtx = new (window.AudioContext || window.webkitAudioContext)();
                }
                if (audioCtx.state === 'suspended') {
                    audioCtx.resume();
                }

                const osc = audioCtx.createOscillator();
                const gain = audioCtx.createGain();
                osc.connect(gain);
                gain.connect(audioCtx.destination);

                osc.type = 'sine';
                osc.frequency.setValueAtTime(600, audioCtx.currentTime);
                osc.frequency.exponentialRampToValueAtTime(150, audioCtx.currentTime + 0.08);

                gain.gain.setValueAtTime(0.08, audioCtx.currentTime);
                gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.08);

                osc.start();
                osc.stop(audioCtx.currentTime + 0.08);
            } catch (e) {
                console.log('Audio Context error: ', e);
            }
        }

        // Play retro celebratory win music note cascade
        function playWinSound() {
            try {
                if (!audioCtx) {
                    audioCtx = new (window.AudioContext || window.webkitAudioContext)();
                }
                if (audioCtx.state === 'suspended') {
                    audioCtx.resume();
                }

                const notes = [523.25, 659.25, 783.99, 1046.50]; // C5, E5, G5, C6
                notes.forEach((freq, index) => {
                    const osc = audioCtx.createOscillator();
                    const gain = audioCtx.createGain();
                    osc.connect(gain);
                    gain.connect(audioCtx.destination);

                    osc.type = 'triangle';
                    osc.frequency.value = freq;

                    const time = audioCtx.currentTime + index * 0.12;
                    gain.gain.setValueAtTime(0.12, time);
                    gain.gain.exponentialRampToValueAtTime(0.001, time + 0.35);

                    osc.start(time);
                    osc.stop(time + 0.35);
                });
            } catch (e) {
                console.log('Audio Context error: ', e);
            }
        }

        // Calculates sum of selected money
        function calculateTotal() {
            let total = 0;
            for (const [val, qty] of Object.entries(selectedQuantities)) {
                total += Number(val) * qty;
            }
            return total;
        }

        // Refreshes the display of total sum and enables/disables complete button
        function updateTotalDisplay() {
            const total = calculateTotal();
            totalMoney.textContent = total ? `${formatMoney(total)} đ` : '0đ';

            // Check if at least 1 bill has been selected
            let hasSelection = false;
            for (const qty of Object.values(selectedQuantities)) {
                if (qty > 0) {
                    hasSelection = true;
                    break;
                }
            }
            doneBtn.disabled = !hasSelection;
        }

        // Refreshes remaining budget on Wheel screen
        function updateRemainingDisplay() {
            const total = calculateTotal();
            remainingMoneyText.textContent = total ? `${formatMoney(total)} đ` : '0đ';
        }

        // Renders Grid of Money Cards
        function renderMoneyGrid() {
            moneyGrid.innerHTML = '';

            denominations.forEach(item => {
                const qty = selectedQuantities[item.value] || 0;

                const card = document.createElement('div');
                card.className = `money-card ${qty > 0 ? 'active' : ''}`;

                // Allow clicking the card itself to increase quantity
                card.addEventListener('click', (e) => {
                    // Prevent trigger if clicking adjust buttons directly
                    if (e.target.classList.contains('btn-adjust')) return;
                    adjustQuantity(item.value, 1);
                });

                const label = document.createElement('div');
                label.className = 'val-label';
                label.textContent = item.label;

                const controls = document.createElement('div');
                controls.className = 'controls';

                const minusBtn = document.createElement('button');
                minusBtn.className = 'btn-adjust';
                minusBtn.textContent = '-';
                minusBtn.addEventListener('click', () => adjustQuantity(item.value, -1));

                const qtySpan = document.createElement('span');
                qtySpan.className = 'qty-display';
                qtySpan.textContent = qty;

                const plusBtn = document.createElement('button');
                plusBtn.className = 'btn-adjust';
                plusBtn.textContent = '+';
                plusBtn.addEventListener('click', () => adjustQuantity(item.value, 1));

                controls.appendChild(minusBtn);
                controls.appendChild(qtySpan);
                controls.appendChild(plusBtn);

                card.appendChild(label);
                card.appendChild(controls);

                moneyGrid.appendChild(card);
            });
        }

        // Adjusts quantities up or down
        function adjustQuantity(value, delta) {
            const currentQty = selectedQuantities[value] || 0;
            const newQty = Math.max(0, currentQty + delta);
            selectedQuantities[value] = newQty;

            updateTotalDisplay();
            renderMoneyGrid();
        }

        function shuffleArray(items) {
            const shuffled = [...items];
            for (let i = shuffled.length - 1; i > 0; i--) {
                const j = Math.floor(Math.random() * (i + 1));
                [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
            }
            return shuffled;
        }

        // Create the wheel segments array (All denominations x 2)
        function makeWheelItems() {
            wheelItems = shuffleArray([...denominations, ...denominations]);
        }

        // Draws highly polished Canvas wheel
        function drawWheel(angle = 0) {
            const ctx = canvas.getContext('2d');
            const cw = canvas.width;
            const ch = canvas.height;
            const cx = cw / 2;
            const cy = ch / 2;
            const radius = cx - 18; // Margin for LED viền

            ctx.clearRect(0, 0, cw, ch);

            // 1. Draw outer gold decorative rim shadow/body
            ctx.beginPath();
            ctx.arc(cx, cy, radius + 12, 0, Math.PI * 2);
            ctx.fillStyle = '#cc9900'; // Dark Gold Base
            ctx.fill();

            ctx.beginPath();
            ctx.arc(cx, cy, radius + 8, 0, Math.PI * 2);
            const goldGrad = ctx.createLinearGradient(0, 0, cw, ch);
            goldGrad.addColorStop(0, '#ffe875');
            goldGrad.addColorStop(0.5, '#f5ac00');
            goldGrad.addColorStop(1, '#9e6b00');
            ctx.fillStyle = goldGrad;
            ctx.fill();

            // 2. Draw Wheel Inner Circle background
            ctx.beginPath();
            ctx.arc(cx, cy, radius, 0, Math.PI * 2);
            ctx.fillStyle = '#80000a';
            ctx.fill();

            // 3. Draw Slices
            const sliceCount = wheelItems.length;
            const sliceAngle = (Math.PI * 2) / sliceCount;

            for (let i = 0; i < sliceCount; i++) {
                const start = angle + i * sliceAngle;
                const end = start + sliceAngle;

                // Draw sector fill
                ctx.beginPath();
                ctx.moveTo(cx, cy);
                ctx.arc(cx, cy, radius, start, end);
                // Alternate deep red / brighter lucky red segments
                ctx.fillStyle = (i % 2 === 0) ? '#cc1428' : '#e62237';
                ctx.fill();

                // Draw golden border slice lines
                ctx.beginPath();
                ctx.moveTo(cx, cy);
                ctx.arc(cx, cy, radius, start, end);
                ctx.strokeStyle = 'rgba(255, 215, 0, 0.4)';
                ctx.lineWidth = 2;
                ctx.stroke();

                // 4. Draw labels rotated towards the center (using Segoe UI/Arial fallback which fully supports Vietnamese)
                ctx.save();
                ctx.translate(cx, cy);
                ctx.rotate(start + sliceAngle / 2);

                ctx.textAlign = 'right';
                ctx.textBaseline = 'middle';
                ctx.fillStyle = '#ffd700'; // Yellow/Gold text
                ctx.font = 'bold 16px "Segoe UI", Arial, sans-serif';

                // Shadow for text legibility
                ctx.shadowColor = 'rgba(0, 0, 0, 0.6)';
                ctx.shadowBlur = 4;
                ctx.shadowOffsetX = 1;
                ctx.shadowOffsetY = 1;

                // Position labels near outer edge of wheel
                ctx.fillText(wheelItems[i].label, radius - 26, 0);
                ctx.restore();
            }

            // 5. Center gold hub (glowing button style)
            ctx.save();
            ctx.beginPath();
            ctx.arc(cx, cy, 40, 0, Math.PI * 2);
            const hubGrad = ctx.createRadialGradient(cx, cy, 4, cx, cy, 40);
            hubGrad.addColorStop(0, '#fffbe6');
            hubGrad.addColorStop(0.4, '#ffe45f');
            hubGrad.addColorStop(1, '#ff9900');
            ctx.fillStyle = hubGrad;
            ctx.strokeStyle = '#80000a';
            ctx.lineWidth = 5;
            ctx.shadowColor = 'rgba(0,0,0,0.5)';
            ctx.shadowBlur = 10;
            ctx.fill();
            ctx.stroke();
            ctx.restore();

            // Center Text
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillStyle = '#80000a';
            ctx.font = '900 16px "Segoe UI", Arial, sans-serif';
            ctx.fillText('LÌ XÌ', cx, cy);

            // 6. Draw LED Blinkers around gold border
            const ledCount = 18;
            const blinkState = Math.floor(Date.now() / 250) % 2; // LED toggle interval

            for (let i = 0; i < ledCount; i++) {
                const ledAngle = i * ((Math.PI * 2) / ledCount);
                const lx = cx + (radius + 4) * Math.cos(ledAngle);
                const ly = cy + (radius + 4) * Math.sin(ledAngle);

                ctx.beginPath();
                ctx.arc(lx, ly, 5, 0, Math.PI * 2);

                // Alternate blink state
                const active = (i % 2 === blinkState);
                ctx.fillStyle = active ? '#ffffff' : '#ffd700';

                if (active) {
                    ctx.save();
                    ctx.shadowColor = '#ffffff';
                    ctx.shadowBlur = 12;
                    ctx.fill();
                    ctx.restore();
                } else {
                    ctx.fill();
                }
            }
        }

        // Animation frame Loop to draw static blinking LED Viền
        function startLedLoop() {
            function frame() {
                if (!isSpinning) {
                    drawWheel(startAngle);
                }
                requestAnimationFrame(frame);
            }
            requestAnimationFrame(frame);
        }

        // Spins the wheel and computes deceleration stopping exactly on a selected bill segment
        function spinWheel() {
            if (isSpinning) return;

            // Gather selected bills array
            const activePool = [];
            for (const [val, qty] of Object.entries(selectedQuantities)) {
                if (qty > 0) {
                    for (let i = 0; i < qty; i++) {
                        activePool.push(Number(val));
                    }
                }
            }

            // If out of money, trigger outOfMoneyModal warning popup
            if (!activePool.length) {
                outOfMoneyModal.classList.add('show');
                return;
            }

            isSpinning = true;
            spinBtn.disabled = true;

            // Pick a random prize from selection
            const prizeValue = activePool[Math.floor(Math.random() * activePool.length)];

            // Deduct 1 from the quantity of that prize value (Spin-to-Deplete)
            selectedQuantities[prizeValue]--;
            updateRemainingDisplay();

            // Find matching wheel segments
            const matchedSlices = [];
            wheelItems.forEach((item, index) => {
                if (item.value === prizeValue) {
                    matchedSlices.push(index);
                }
            });

            // Randomly target one of the two identical segments
            const targetedSliceIndex = matchedSlices[Math.floor(Math.random() * matchedSlices.length)];
            const sliceCount = wheelItems.length;
            const sliceAngle = (Math.PI * 2) / sliceCount;

            // Pointer lies at 12 o'clock (270deg = 3*Math.PI/2)
            // Sector landing formula
            const currentNorm = startAngle % (Math.PI * 2);
            let targetDiff = (3 * Math.PI / 2) - (targetedSliceIndex * sliceAngle + sliceAngle / 2);

            // Format to positive values
            targetDiff = (targetDiff + Math.PI * 4) % (Math.PI * 2);

            const extraRounds = 8 + Math.floor(Math.random() * 4); // 8-12 spins
            const destinationAngle = startAngle + (extraRounds * Math.PI * 2) + (targetDiff - currentNorm);

            const startTime = performance.now();
            const duration = 5200; // 5.2s transition
            const startingSpinAngle = startAngle;
            let lastAudioTickAngle = startingSpinAngle;

            function animateSpin(now) {
                const elapsed = now - startTime;

                if (elapsed >= duration) {
                    startAngle = destinationAngle;
                    drawWheel(startAngle);

                    isSpinning = false;
                    spinBtn.disabled = false;

                    // Show celebration modal
                    triggerCelebration(prizeValue);
                    return;
                }

                // Smooth decelerating cubic-bezier transition curve
                const progress = elapsed / duration;
                const easeOut = 1 - Math.pow(1 - progress, 3.5);
                startAngle = startingSpinAngle + (destinationAngle - startingSpinAngle) * easeOut;

                // Ticking audio triggers as divisions boundaries pass
                if (Math.abs(startAngle - lastAudioTickAngle) >= sliceAngle) {
                    playTickSound();
                    lastAudioTickAngle = startAngle;
                }

                drawWheel(startAngle);
                requestAnimationFrame(animateSpin);
            }

            requestAnimationFrame(animateSpin);
        }

        // Activates pop-up and particle drops
        function triggerCelebration(prizeValue) {
            playWinSound();
            modalPrizeAmount.textContent = formatMoney(prizeValue);
            celebrationModal.classList.add('show');
            createConfettiEffect();
        }

        // Golden & Red Confetti Drops
        function createConfettiEffect() {
            const colors = ['#ffd700', '#ff3b30', '#ffffff', '#ffcc00'];

            for (let i = 0; i < 90; i++) {
                const piece = document.createElement('div');
                piece.className = 'confetti';
                piece.style.left = `${Math.random() * 100}vw`;
                piece.style.background = colors[Math.floor(Math.random() * colors.length)];
                piece.style.width = `${Math.random() * 8 + 6}px`;
                piece.style.height = `${Math.random() * 14 + 8}px`;
                piece.style.animationDelay = `${Math.random() * 0.4}s`;
                piece.style.animationDuration = `${Math.random() * 1.5 + 1.5}s`;
                piece.style.transform = `rotate(${Math.random() * 360}deg)`;

                document.body.appendChild(piece);
                setTimeout(() => piece.remove(), 2800);
            }
        }

        // Reset Settings and total sum
        clearBtn.addEventListener('click', () => {
            for (const key in selectedQuantities) {
                selectedQuantities[key] = 0;
            }
            updateTotalDisplay();
            renderMoneyGrid();
        });

        // Trigger settings completion
        doneBtn.addEventListener('click', () => {
            makeWheelItems();
            drawWheel(0);

            settingSection.style.display = 'none';
            wheelSection.style.display = 'block';
            updateRemainingDisplay();
        });

        // Run wheel spin
        spinBtn.addEventListener('click', spinWheel);

        // Claim prize triggers: closes modal and keeps user on Wheel screen
        claimBtn.addEventListener('click', () => {
            celebrationModal.classList.remove('show');
            updateRemainingDisplay();
        });

        // Navigation back to Setting screen
        backToSettingsBtn.addEventListener('click', () => {
            wheelSection.style.display = 'none';
            settingSection.style.display = 'block';
            startAngle = 0;
            updateTotalDisplay();
            renderMoneyGrid();
        });

        // Nút Trở Lại trên modal hết tiền: Chỉ đóng modal và ở lại màn hình vòng quay
        backToWheelBtn.addEventListener('click', () => {
            outOfMoneyModal.classList.remove('show');
        });

        // Initialize App
        document.title = `🧧 Lì Xì May Mắn - Vòng Quay Tết ${new Date().getFullYear()} 🧧`;
        renderMoneyGrid();
        updateTotalDisplay();
        startLedLoop();

