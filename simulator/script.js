// Bonding Curve Simulator
// Final V1 Formulas & Protocol Configuration
// The reserve formula is the source of truth:
// Reserve(S) = curveAlpha * S^3 + curveBeta * S
// Price(S) = derivative of Reserve = 3 * curveAlpha * S^2 + curveBeta

// Simulated ProtocolConfig parameters
const curveAlpha = 0.000333333333; // 3 * alpha = 0.001 steepness
const curveBeta = 0.1;

let currentSupply = 0;
let currentReserve = 0;

// Price function (Derivative)
function getPriceAtSupply(s) {
    return (3 * curveAlpha * Math.pow(s, 2)) + curveBeta;
}

// Reserve function (Source of Truth)
function getReserveAtSupply(s) {
    return (curveAlpha * Math.pow(s, 3)) + (curveBeta * s);
}

function calculateBuyCost(n) {
    const reserveAfter = getReserveAtSupply(currentSupply + n);
    return reserveAfter - getReserveAtSupply(currentSupply);
}

function calculateSellReward(n) {
    if (currentSupply < n) return 0;
    const reserveAfter = getReserveAtSupply(currentSupply - n);
    return getReserveAtSupply(currentSupply) - reserveAfter;
}

// Inverse function to find supply given a target reserve
// Since R(S) is strictly increasing, we can use binary search
function getSupplyForReserve(targetReserve) {
    let low = 0;
    let high = 1000000;
    let mid;
    for(let i = 0; i < 60; i++) {
        mid = (low + high) / 2;
        if (getReserveAtSupply(mid) < targetReserve) {
            low = mid;
        } else {
            high = mid;
        }
    }
    return mid;
}

// DOM Elements
const elPrice = document.getElementById('currentPrice');
const elSupply = document.getElementById('currentSupply');
const elReserve = document.getElementById('currentReserve');

// Chart initialization
const chartContainer = document.getElementById('chartContainer');
const chart = LightweightCharts.createChart(chartContainer, {
    layout: {
        background: { type: 'solid', color: 'transparent' },
        textColor: '#94a3b8',
    },
    grid: {
        vertLines: { color: 'rgba(255, 255, 255, 0.05)' },
        horzLines: { color: 'rgba(255, 255, 255, 0.05)' },
    },
    rightPriceScale: {
        borderVisible: false,
    },
    timeScale: {
        borderVisible: false,
        timeVisible: true,
        secondsVisible: true,
    },
    crosshair: {
        mode: LightweightCharts.CrosshairMode.Normal,
    },
});

// Make chart responsive
new ResizeObserver(entries => {
    if (entries.length === 0 || entries[0].target !== chartContainer) { return; }
    const newRect = entries[0].contentRect;
    chart.applyOptions({ height: newRect.height, width: newRect.width });
}).observe(chartContainer);

const candleSeries = chart.addCandlestickSeries({
    upColor: '#34d399',
    downColor: '#f43f5e',
    borderVisible: false,
    wickUpColor: '#34d399',
    wickDownColor: '#f43f5e',
});

// Candle State Manager
let currentCandle = null;
let lastCandleTime = 0;

function updateCandle(price) {
    const now = Math.floor(Date.now() / 1000);
    
    if (now > lastCandleTime) {
        if (currentCandle) {
            candleSeries.update(currentCandle);
        }
        currentCandle = {
            time: now,
            open: price,
            high: price,
            low: price,
            close: price
        };
        lastCandleTime = now;
    } else {
        if (!currentCandle) return;
        currentCandle.close = price;
        currentCandle.high = Math.max(currentCandle.high, price);
        currentCandle.low = Math.min(currentCandle.low, price);
    }
    
    candleSeries.update(currentCandle);
}

// Initial point
updateCandle(getPriceAtSupply(currentSupply));

function updateUI() {
    const currentPrice = getPriceAtSupply(currentSupply);
    elPrice.textContent = `${currentPrice.toFixed(3)} SOL`;
    elSupply.textContent = `${currentSupply.toFixed(3)} Shares`;
    elReserve.textContent = `${currentReserve.toFixed(3)} SOL`;
    
    // Update chart
    updateCandle(currentPrice);
}



// Initialize
updateUI();

// ==========================================
// Chaos Testing / Bot Simulation
// ==========================================
const btnStartSim = document.getElementById('btnStartSim');
const btnResetSim = document.getElementById('btnResetSim');
const simStats = document.getElementById('simStats');
const simBotCount = document.getElementById('simBotCount');
const simTradeCount = document.getElementById('simTradeCount');
const simTimeLeft = document.getElementById('simTimeLeft');
const simLog = document.getElementById('simLog');
const simStatus = document.getElementById('simStatus');

let simInterval = null;
let simTimer = null;
let bots = [];
let activeShareholders = [];
let totalTrades = 0;
let lastChartUpdate = 0;

btnStartSim.addEventListener('click', () => {
    if (simInterval) {
        stopSimulation();
        return;
    }
    
    simStatus.textContent = 'Running...';
    simStatus.style.color = '#a855f7';
    btnStartSim.textContent = 'Stop Simulation';
    btnStartSim.style.background = '#ef4444';
    
    simStats.style.display = 'block';
    simLog.innerHTML = '';
    totalTrades = 0;
    activeShareholders = [];
    
    // Initialize 100,000 bots
    const numBots = 100000;
    simBotCount.textContent = numBots;
    
    bots = Array.from({ length: numBots }, () => ({
        sol: Math.random() * 50 + 10, // 10 to 60 SOL
        shares: 0
    }));
    
    let timeLeft = 120; // 2 minutes
    simTimeLeft.textContent = `${timeLeft}s`;
    
    simTimer = setInterval(() => {
        timeLeft--;
        simTimeLeft.textContent = `${timeLeft}s`;
        if (timeLeft <= 0) {
            stopSimulation();
        }
    }, 1000);
    
    // Bots trade every 50ms (20 trades per second)
    simInterval = setInterval(() => {
        let isBuy = Math.random() > 0.4; // 60% chance to buy, 40% chance to sell
        let bot;
        
        if (!isBuy) {
            if (activeShareholders.length > 0) {
                bot = activeShareholders[Math.floor(Math.random() * activeShareholders.length)];
            } else {
                isBuy = true;
            }
        }
        
        if (isBuy) {
            bot = bots[Math.floor(Math.random() * bots.length)];
        }
        
        try {
            if (isBuy && bot.sol > 0.1) {
                // Buy a random amount of SOL between 0.1 and 10
                const amountSol = Math.min(bot.sol, Math.random() * 9.9 + 0.1);
                const targetReserve = currentReserve + amountSol;
                const newSupply = getSupplyForReserve(targetReserve);
                
                const sharesDelta = newSupply - currentSupply;
                
                if (newSupply < currentSupply) throw new Error("Buy decreased supply!");
                if (targetReserve < currentReserve) throw new Error("Buy decreased reserve!");
                
                if (bot.shares === 0) {
                    activeShareholders.push(bot);
                }
                bot.sol -= amountSol;
                bot.shares += sharesDelta;
                currentReserve = targetReserve;
                currentSupply = newSupply;
                totalTrades++;
                
            } else if (!isBuy && bot.shares > 0.001) {
                // Sell random % of shares
                const percentToSell = 0.1 + Math.random() * 0.9;
                const sharesDelta = bot.shares * percentToSell;
                
                if (currentSupply < sharesDelta) {
                    throw new Error("Attempting to sell more than circulating supply!");
                }
                
                const rewardSol = calculateSellReward(sharesDelta);
                
                bot.shares -= sharesDelta;
                if (bot.shares < 0.0001) {
                    bot.shares = 0;
                    activeShareholders = activeShareholders.filter(b => b !== bot);
                }
                bot.sol += rewardSol;
                currentSupply -= sharesDelta;
                currentReserve -= rewardSol;
                
                // Precision clamping
                if (currentSupply < 0.000001) currentSupply = 0;
                if (currentReserve < 0.000001) currentReserve = 0;
                if (currentSupply === 0 && currentReserve > 0.000001) {
                    throw new Error(`Orphaned Reserve! Supply is 0 but reserve is ${currentReserve}`);
                }
                
                totalTrades++;
            }
        } catch (e) {
            simLog.innerHTML = `<div style="margin-bottom:2px;">[Trade ${totalTrades}] Error: ${e.message}</div>` + simLog.innerHTML;
        }
        
        simTradeCount.textContent = totalTrades;
        
        // Throttle UI/Chart updates to ~10fps so the browser doesn't freeze
        const now = Date.now();
        if (now - lastChartUpdate > 100) {
            updateUI();
            lastChartUpdate = now;
        }
    }, 50);
});

function stopSimulation() {
    clearInterval(simInterval);
    clearInterval(simTimer);
    simInterval = null;
    simTimer = null;
    
    simStatus.textContent = 'Finished';
    simStatus.style.color = '#10b981';
    btnStartSim.textContent = 'Run Again';
    btnStartSim.style.background = 'linear-gradient(to right, #a855f7, #6366f1)';
    
    updateUI(); // One final render
}

btnResetSim.addEventListener('click', () => {
    stopSimulation();
    
    currentSupply = 0;
    currentReserve = 0;
    totalTrades = 0;
    
    // Clear chart data
    candleSeries.setData([]);
    currentCandle = null;
    lastCandleTime = 0;
    
    simStats.style.display = 'none';
    simStatus.textContent = 'Idle';
    simStatus.style.color = '#94a3b8';
    simLog.innerHTML = '';
    
    updateUI();
});
