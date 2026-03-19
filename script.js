const MAPS = [
  {
    id: 1,
    name: "地图 1",
    unlockScore: 0,
    description: "10 个格子，积分在 50~100 之间，分布更均匀。",
    tiles: generateEvenRangeValues(10, 50, 100)
  },
  {
    id: 2,
    name: "地图 2",
    unlockScore: 1000,
    description: "15 个格子，其中 10 个是 50~75，5 个是 100~120。",
    tiles: shuffle([
      ...generateRandomValues(10, 50, 75),
      ...generateRandomValues(5, 100, 120)
    ])
  },
  {
    id: 3,
    name: "地图 3",
    unlockScore: 3000,
    description: "7 个格子，2 个 0 分，4 个 50~100，1 个 150 分。",
    tiles: shuffle([0, 0, ...generateEvenRangeValues(4, 50, 100), 150])
  }
];

const REWARDS = [
  { score: 300, title: "小试身手", detail: "奖励 3 枚骰子", dice: 3 },
  { score: 800, title: "手气渐热", detail: "奖励 8 枚骰子", dice: 8 },
  { score: 1000, title: "地图 2 解锁", detail: "解锁地图 2，并赠送 10 枚骰子", dice: 10 },
  { score: 2000, title: "高分冲刺", detail: "奖励 15 枚骰子", dice: 15 },
  { score: 3000, title: "地图 3 解锁", detail: "解锁地图 3，并赠送 20 枚骰子", dice: 20 },
  { score: 5000, title: "骰子大亨", detail: "奖励 30 枚骰子", dice: 30 }
];

const state = {
  dice: 6,
  totalScore: 0,
  currentMapId: 1,
  positions: {
    1: 0,
    2: 0,
    3: 0
  },
  isRolling: false,
  claimedRewards: []
};

const elements = {
  diceCount: document.getElementById("diceCount"),
  totalScore: document.getElementById("totalScore"),
  currentMapName: document.getElementById("currentMapName"),
  positionText: document.getElementById("positionText"),
  mapSelector: document.getElementById("mapSelector"),
  board: document.getElementById("board"),
  rollResult: document.getElementById("rollResult"),
  diceFace: document.getElementById("diceFace"),
  logList: document.getElementById("logList")
};

init();

function init() {
  bindEvents();
  renderAll();
  pushLog("欢迎来到订单骰子大富翁，先交付订单拿骰子，再开始投掷吧。");
}

function bindEvents() {
  document.querySelectorAll(".order-button").forEach((button) => {
    button.addEventListener("click", () => {
      const orderCount = Number(button.dataset.order);
      completeOrders(orderCount);
    });
  });

  document.querySelectorAll(".roll-button").forEach((button) => {
    button.addEventListener("click", async () => {
      const multiplier = Number(button.dataset.multiplier);
      await rollDice(multiplier);
    });
  });
}

function completeOrders(orderCount) {
  state.dice += orderCount;
  elements.rollResult.textContent = `已完成 ${orderCount} 单，获得 ${orderCount} 枚骰子`;
  pushLog(`完成 ${orderCount} 单订单，掉落 ${orderCount} 枚骰子。`);
  renderStats();
  renderActionState();
}

async function rollDice(multiplier) {
  if (state.isRolling) {
    return;
  }

  if (state.dice < multiplier) {
    pushLog(`骰子不足，${multiplier}x 投掷需要 ${multiplier} 枚骰子。`);
    elements.rollResult.textContent = `骰子不足，无法进行 ${multiplier}x 投掷`;
    return;
  }

  state.isRolling = true;
  state.dice -= multiplier;
  renderActionState();
  renderStats();

  const diceValue = randomInt(1, 6);
  await animateDice(diceValue);
  await movePlayer(diceValue);

  const map = getCurrentMap();
  const currentPosition = state.positions[state.currentMapId];
  const landedScore = map.tiles[currentPosition];
  const gainedScore = landedScore * multiplier;

  state.totalScore += gainedScore;
  elements.rollResult.textContent = `${multiplier}x 投掷掷出 ${diceValue} 点，获得 ${landedScore} x ${multiplier} = ${gainedScore} 积分`;
  pushLog(`${map.name} 掷出 ${diceValue} 点，停在第 ${currentPosition + 1} 格，获得 ${gainedScore} 积分。`);

  claimAvailableRewards();
  state.isRolling = false;
  renderAll();
}

async function animateDice(finalValue) {
  const animationCount = 8;

  for (let index = 0; index < animationCount; index += 1) {
    elements.diceFace.textContent = randomInt(1, 6);
    await wait(90);
  }

  elements.diceFace.textContent = finalValue;
}

async function movePlayer(steps) {
  const map = getCurrentMap();

  for (let step = 0; step < steps; step += 1) {
    const nextPosition = (state.positions[state.currentMapId] + 1) % map.tiles.length;
    state.positions[state.currentMapId] = nextPosition;
    renderBoard();
    renderStats();
    await wait(180);
  }
}

function claimAvailableRewards() {
  REWARDS.forEach((reward) => {
    const isClaimed = state.claimedRewards.includes(reward.score);
    if (!isClaimed && state.totalScore >= reward.score) {
      state.claimedRewards.push(reward.score);
      state.dice += reward.dice;
      pushLog(`累计达到 ${reward.score} 分，解锁奖励「${reward.title}」，额外获得 ${reward.dice} 枚骰子。`);
    }
  });
}

function renderAll() {
  renderStats();
  renderMaps();
  renderBoard();
  renderActionState();
}

function renderStats() {
  const map = getCurrentMap();
  elements.diceCount.textContent = state.dice;
  elements.totalScore.textContent = state.totalScore;
  elements.currentMapName.textContent = map.name;
  elements.positionText.textContent = `${state.positions[state.currentMapId] + 1} / ${map.tiles.length}`;
}

function renderMaps() {
  elements.mapSelector.innerHTML = "";

  MAPS.forEach((map) => {
    const unlocked = isMapUnlocked(map);
    const card = document.createElement("button");
    card.type = "button";
    card.className = `map-card${map.id === state.currentMapId ? " active" : ""}${unlocked ? "" : " locked"}`;
    card.innerHTML = `
      <h3>${map.name}</h3>
      <p>${map.description}</p>
      <p>${unlocked ? "已解锁，可随时切换" : `累计 ${map.unlockScore} 分后解锁`}</p>
    `;

    card.disabled = !unlocked || state.isRolling;
    card.addEventListener("click", () => {
      state.currentMapId = map.id;
      pushLog(`切换到 ${map.name}。`);
      renderAll();
    });

    elements.mapSelector.appendChild(card);
  });
}

function renderBoard() {
  const map = getCurrentMap();
  const activePosition = state.positions[state.currentMapId];
  elements.board.innerHTML = "";
  elements.board.dataset.tileCount = String(map.tiles.length);

  const center = document.createElement("div");
  center.className = "board-center";
  center.innerHTML = `
    <span>${map.name}</span>
    <strong>方形环道</strong>
    <small>共 ${map.tiles.length} 格</small>
  `;
  elements.board.appendChild(center);

  map.tiles.forEach((score, index) => {
    const tile = document.createElement("div");
    tile.className = `tile${index === activePosition ? " active" : ""}`;
    const position = getSquareTrackPosition(index, map.tiles.length);
    tile.style.left = `${position.x}%`;
    tile.style.top = `${position.y}%`;
    tile.innerHTML = `
      <div class="tile-index">格子 ${index + 1}</div>
      <div class="tile-score">${score}</div>
      <div class="tile-label">${score === 0 ? "空白格" : "积分格"}</div>
      ${index === activePosition ? '<div class="token">我</div>' : ""}
    `;
    elements.board.appendChild(tile);
  });
}

function renderActionState() {
  document.querySelectorAll(".order-button, .roll-button").forEach((button) => {
    const multiplier = Number(button.dataset.multiplier || 0);
    const isRollButton = button.classList.contains("roll-button");
    button.disabled = state.isRolling || (isRollButton && state.dice < multiplier);
  });
}

function getCurrentMap() {
  return MAPS.find((map) => map.id === state.currentMapId);
}

function isMapUnlocked(map) {
  return state.totalScore >= map.unlockScore;
}

function getSquareTrackPosition(index, total) {
  const inset = total >= 15 ? 13 : (total >= 10 ? 12 : 11);
  const span = 100 - inset * 2;
  const progress = (index / total) * 4;
  const side = Math.floor(progress);
  const sideProgress = progress - side;

  if (side === 0) {
    return {
      x: inset + span * (1 - sideProgress),
      y: 100 - inset
    };
  }

  if (side === 1) {
    return {
      x: inset,
      y: 100 - inset - span * sideProgress
    };
  }

  if (side === 2) {
    return {
      x: inset + span * sideProgress,
      y: inset
    };
  }

  return {
    x: 100 - inset,
    y: inset + span * sideProgress
  };
}

function generateEvenRangeValues(count, min, max) {
  const values = [];
  const step = (max - min) / Math.max(count - 1, 1);

  for (let index = 0; index < count; index += 1) {
    const baseValue = min + step * index;
    const jitter = randomInt(-4, 4);
    const value = Math.round(baseValue + jitter);
    values.push(clamp(value, min, max));
  }

  return shuffle(values);
}

function generateRandomValues(count, min, max) {
  return Array.from({ length: count }, () => randomInt(min, max));
}

function shuffle(list) {
  const cloned = [...list];

  for (let index = cloned.length - 1; index > 0; index -= 1) {
    const swapIndex = randomInt(0, index);
    [cloned[index], cloned[swapIndex]] = [cloned[swapIndex], cloned[index]];
  }

  return cloned;
}

function randomInt(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

function wait(ms) {
  return new Promise((resolve) => {
    window.setTimeout(resolve, ms);
  });
}

function pushLog(message) {
  const item = document.createElement("li");
  item.textContent = message;
  elements.logList.prepend(item);

  while (elements.logList.children.length > 8) {
    elements.logList.removeChild(elements.logList.lastChild);
  }
}
