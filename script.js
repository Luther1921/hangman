import {
  getFirestore,
  collection,
  addDoc,
  getDocs,
  query,
  orderBy,
  limit,
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";
import { db } from "./firebase-init.js";
const firestore = { collection, addDoc, getDocs, query, orderBy, limit };

// Game configuration
const maxWrong = 6;
const faceImages = [
  {
    name: "Addy",
    src: "images/face2.png",
    unlocked: true,
    surviveMessage: "🧠 Addy lives to code another SP1 game",
    deathMessage: "😵 Addy hit a prover timeout this round.",
  },
  {
    name: "zkDan",
    src: "images/face1.png",
    unlocked: true,
    surviveMessage: "🧠 zkDan lives to drop another viral campaign!",
    deathMessage: "😵 zkDan couldn’t hype the puzzle.",
  },
  {
    name: "Wylo",
    src: "images/wylo.png",
    unlocked: true,
    surviveMessage: "🧠 Wylo shone with baddie hype power!",
    deathMessage: "😵 Wylo missed the meme drop.",
  },
  {
    name: "Yinger",
    src: "images/yinger.png",
    unlocked: false,
    unlockAt: 3,
    surviveMessage: "🔥 Yinger lives to spark another Discord rally!",
    deathMessage: "😵 Yinger got caught in the spam filter net.",
  },
  {
    name: "Zaharon",
    src: "images/zaharon.png",
    unlocked: true,
    surviveMessage: "🧠 Zaharon lives to stake another $prove gem!",
    deathMessage: "😵 Zaharon wiped out this round.",
  },
  {
    name: "Stepaks",
    src: "images/stepaks.png",
    unlocked: true,
    surviveMessage: "🧠 Stepaks lives to verify another $prove block!",
    deathMessage: "😵 Stepaks got snared in the prover’s loop.",
  },
  {
    name: "Saigon",
    src: "images/saigon.png",
    unlocked: true,
    surviveMessage: "🧠 Saigon survived with starry HODL energy",
    deathMessage: "😵 Saigon got stumped this time.",
  },
  {
    name: "COCO",
    src: "images/coco.png",
    unlocked: true,
    surviveMessage: "🔥 COOCOOWAVESS mastered the SP1 flow",
    deathMessage: "😵 COOCOOWAVESS missed the current’s rhythm.",
  },
  {
    name: "Uma",
    src: "images/uma.png",
    unlocked: false,
    unlockAt: 5,
    surviveMessage: "🎉 Uma survived with cryptographic genius energy",
    deathMessage: "🔒  Uma got trapped in the zero-knowledge labyrinth..",
  },
];

faceImages.forEach((face) => {
  const storedUnlocked = localStorage.getItem(`faceUnlocked_${face.name}`);
  if (storedUnlocked === "true") {
    face.unlocked = true;
  }
});

const wordsWithHints = [
  { word: "myntusd", hint: "Succinct’s stablecoin partner for ZK innovation" },
  {
    word: "zkbridge",
    hint: "Sends messages between chains using zero-knowledge proofs",
  },
  {
    word: "opstack",
    hint: "The modular rollup framework that SP1 integrates with",
  },
  { word: "recursive", hint: "A type of proof that can verify another proof" },
  { word: "blobs", hint: "Data containers used in rollups and danksharding" },
  { word: "sasha", hint: "Addy's name on discord" },
  { word: "ethereum", hint: "The base layer many ZK systems are built on" },
  { word: "eclair", hint: "The testnet powered by SP1, OP Stack, and EigenDA" },
  { word: "sequencer", hint: "Orders transactions in a rollup" },
  {
    word: "latency",
    hint: "Succinct's prover network aims to reduce this for proof generation",
  },
];

let selectedWord = "";
let selectedFaceName = "";
let selectedFace = null;
let guessedLetters = [];
let wrongGuesses = 0;
let winStreak = 0;
let highScore = parseInt(localStorage.getItem("highScore")) || 0;
let selectedFaceImage = "";
let resetAnimation = false;
let remainingQuestions = [...wordsWithHints];
let currentQuestionIndex = 0;

const wordDiv = document.getElementById("word");
const keyboardDiv = document.getElementById("keyboard");
const messageDiv = document.getElementById("message");
const hintDiv = document.getElementById("hint");
const canvas = document.getElementById("hangmanCanvas");
const ctx = canvas.getContext("2d");
const volumeSlider = document.getElementById("volume");
const muteBtn = document.getElementById("muteBtn");
const highScoreDisplay = document.getElementById("highScoreDisplay");

const sounds = {
  correct: new Audio("sounds/correct.mp3"),
  wrong: new Audio("sounds/wrong.mp3"),
  win: new Audio("sounds/win.wav"),
  lose: new Audio("sounds/game-over.mp3"),
  bg: new Audio("sounds/bg-music2.mp3"),
};

const savedVolume = parseFloat(localStorage.getItem("volume"));
const defaultVolume = isNaN(savedVolume) ? 0.3 : savedVolume;

sounds.bg.loop = true;
sounds.bg.volume = defaultVolume;
sounds.bg.muted = true;
sounds.bg.play().catch(() => {
  console.log("Autoplay blocked. Will unmute on user interaction.");
});

function enableMusicPlayback() {
  sounds.bg.muted = false;
  sounds.bg.play().catch((e) => {
    console.warn("Still blocked:", e);
  });
  document.removeEventListener("pointerdown", enableMusicPlayback);
}

document.addEventListener("pointerdown", enableMusicPlayback);

volumeSlider.value = defaultVolume;
updateVolume(defaultVolume);

const faceOptionsDiv = document.getElementById("faceOptions");
const gameArea = document.getElementById("gameArea");
const faceSelection = document.getElementById("faceSelection");

function showUnlockPopup(faceName) {
  const popup = document.createElement("div");
  popup.className = "unlock-popup";
  popup.textContent = `🎉 New Face Unlocked: ${faceName}!`;
  document.body.appendChild(popup);

  setTimeout(() => {
    popup.remove();
  }, 3000);
}

function displayFaceOptions() {
  const faceOptionsDiv = document.getElementById("faceOptions");
  faceOptionsDiv.innerHTML = "";

  faceImages.forEach((face, index) => {
    if (!face.unlocked && winStreak >= (face.unlockAt || 0)) {
      face.unlocked = true;
      localStorage.setItem(`faceUnlocked_${face.name}`, "true");
      showUnlockPopup(face.name);
    }
    const isUnlocked = face.unlocked;
    const faceContainer = document.createElement("div");
    faceContainer.className = "face-option";
    if (!isUnlocked) faceContainer.classList.add("locked");

    if (!isUnlocked) {
      const overlay = document.createElement("div");
      overlay.className = "locked-overlay";
      overlay.textContent = `🔒 Unlock at ${face.unlockAt} wins`;
      faceContainer.appendChild(overlay);
    }

    const img = document.createElement("img");
    img.src = face.src;
    img.alt = face.name;
    img.className = "face-img";
    if (!isUnlocked) img.style.filter = "grayscale(100%)";

    const name = document.createElement("p");
    name.textContent = face.name;

    if (isUnlocked) {
      faceContainer.onclick = () => {
        selectedFaceImage = face.src;
        selectedFaceName = face.name;
        selectedFace = face;
        document.getElementById("faceSelection").style.display = "none";
        document.getElementById("gameArea").style.display = "block";
        startNewWord();
      };
    }

    faceContainer.appendChild(img);
    faceContainer.appendChild(name);
    faceOptionsDiv.appendChild(faceContainer);
  });
}

function updateHighScoreDisplay() {
  highScoreDisplay.textContent = `🏆 High Score: ${highScore} wins`;
}

function drawHangman(step, reset = false) {
  if (reset) {
    resetAnimation = true;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    drawBase();
    return;
  }

  const parts = [
    drawHead,
    drawBody,
    drawLeftArm,
    drawRightArm,
    drawLeftLeg,
    drawRightLeg,
  ];
  if (step > 0 && step <= parts.length) animatePart(parts[step - 1]);
}

function drawBase() {
  ctx.lineWidth = 2;
  ctx.strokeStyle = "#333";
  ctx.beginPath();
  ctx.moveTo(10, 230);
  ctx.lineTo(150, 230);
  ctx.moveTo(40, 230);
  ctx.lineTo(40, 20);
  ctx.lineTo(120, 20);
  ctx.lineTo(120, 40);
  ctx.stroke();
}

function animatePart(drawFn) {
  let progress = 0;
  resetAnimation = false;

  function animate() {
    if (resetAnimation) return;
    progress += 0.05;
    if (progress >= 1) drawFn(1);
    else {
      drawFn(progress);
      requestAnimationFrame(animate);
    }
  }

  animate();
}

function drawHead(progress) {
  const img = new Image();
  img.src = selectedFaceImage + "?v=" + Date.now();

  img.onload = () => {
    const maxSize = 40;
    const size = maxSize * progress;
    const radius = size / 2;
    const centerX = 120;
    const centerY = 60;

    ctx.save();
    ctx.beginPath();
    ctx.arc(centerX, centerY, radius, 0, Math.PI * 2);
    ctx.clip();
    ctx.drawImage(img, centerX - radius, centerY - radius, size, size);
    ctx.restore();
  };

  img.onerror = () => console.error(" Could not load face image:", img.src);
}

function drawBody(p) {
  ctx.lineWidth = 3;
  ctx.strokeStyle = "#333";
  ctx.beginPath();
  ctx.moveTo(120, 80);
  ctx.lineTo(120, 80 + 60 * p);
  ctx.stroke();
}

function drawLeftArm(p) {
  ctx.lineWidth = 3;
  ctx.strokeStyle = "#333";
  ctx.beginPath();
  ctx.moveTo(120, 100);
  ctx.lineTo(120 - 30 * p, 100 + 20 * p);
  ctx.stroke();
}

function drawRightArm(p) {
  ctx.lineWidth = 3;
  ctx.strokeStyle = "#333";
  ctx.beginPath();
  ctx.moveTo(120, 100);
  ctx.lineTo(120 + 30 * p, 100 + 20 * p);
  ctx.stroke();
}

function drawLeftLeg(p) {
  ctx.lineWidth = 3;
  ctx.strokeStyle = "#333";
  ctx.beginPath();
  ctx.moveTo(120, 140);
  ctx.lineTo(120 - 20 * p, 140 + 40 * p);
  ctx.stroke();
}

function drawRightLeg(p) {
  ctx.lineWidth = 3;
  ctx.strokeStyle = "#333";
  ctx.beginPath();
  ctx.moveTo(120, 140);
  ctx.lineTo(120 + 20 * p, 140 + 40 * p);
  ctx.stroke();
}

function displayWord() {
  wordDiv.innerHTML = selectedWord
    .split("")
    .map((letter) => (guessedLetters.includes(letter) ? letter : "_"))
    .join(" ");
}

function createKeyboard() {
  keyboardDiv.innerHTML = "";
  for (let i = 65; i <= 90; i++) {
    const letter = String.fromCharCode(i).toLowerCase();
    const btn = document.createElement("button");
    btn.textContent = letter;
    btn.onclick = () => guess(letter);
    keyboardDiv.appendChild(btn);
  }
}

function guess(letter) {
  if (guessedLetters.includes(letter)) return;
  guessedLetters.push(letter);

  if (selectedWord.includes(letter)) {
    sounds.correct.play();
    displayWord();
    checkWin();
  } else {
    wrongGuesses++;
    drawHangman(wrongGuesses);
    sounds.wrong.play();
    if (wrongGuesses === maxWrong) endGame(false);
  }

  document.querySelectorAll("#keyboard button").forEach((btn) => {
    if (btn.textContent === letter) btn.disabled = true;
  });
}

function checkWin() {
  const won = selectedWord
    .split("")
    .every((letter) => guessedLetters.includes(letter));

  if (won) {
    winStreak++;
    if (winStreak > highScore) {
      highScore = winStreak;
      localStorage.setItem("highScore", highScore.toString());
    }
    updateHighScoreDisplay();
    sounds.win.play();
    messageDiv.textContent =
      selectedFace?.surviveMessage ||
      `🎉 ${selectedFaceName} survived! Moving to next word...`;

    disableKeyboard();

    checkAndUnlockFaces();

    // Show share button if streak is at least 2
    if (winStreak >= 2) {
      document.getElementById("shareBtn").style.display = "inline-block";
    }

    setTimeout(() => {
      document.getElementById("shareBtn").style.display = "none";
      startNewWord();
    }, 1500);
  }
}

function endGame(won) {
  disableKeyboard();

  if (won && remainingQuestions.length === 0) {
    messageDiv.innerHTML = `
    🎉 You completed all ${wordsWithHints.length} questions!<br>
    🥳 Win Streak: ${winStreak}<br>
    
  `;
    sounds.win.play();
    confetti();

    document.getElementById("shareBtn").style.display = "inline-block";

    if (winStreak > 0) {
      const name = prompt("Enter your name for the leaderboard:");
      if (name) saveScore(name, winStreak);
    }

    return;
  }

  messageDiv.textContent = `${
    selectedFace?.deathMessage || `💀 ${selectedFaceName} was hanged!`
  } The word was "${selectedWord}"`;

  sounds.lose.play();

  document.getElementById("shareBtn").style.display = "inline-block";

  if (winStreak > 0) {
    const name = prompt("Enter your name for the leaderboard:");
    if (name) saveScore(name, winStreak);
  }
  checkAndUnlockFaces();
  winStreak = 0;
  updateHighScoreDisplay();
}

function disableKeyboard() {
  document
    .querySelectorAll("#keyboard button")
    .forEach((btn) => (btn.disabled = true));
}

function startNewWord() {
  if (remainingQuestions.length === 0) {
    endGame(true); // All questions answered
    return;
  }

  const randomIndex = Math.floor(Math.random() * remainingQuestions.length);
  const random = remainingQuestions.splice(randomIndex, 1)[0];
  currentQuestionIndex = wordsWithHints.length - remainingQuestions.length;

  selectedWord = random.word;
  hintDiv.textContent = `💡 Hint: ${random.hint} (Question ${currentQuestionIndex} of ${wordsWithHints.length})`;
  guessedLetters = [];
  wrongGuesses = 0;

  drawHangman(0, true);
  displayWord();
  createKeyboard();
  messageDiv.textContent = "";
}

function restartGame() {
  // winStreak = 0;
  remainingQuestions = [...wordsWithHints];
  updateHighScoreDisplay();
  startNewWord();
}

function updateVolume(vol) {
  Object.values(sounds).forEach((audio) => (audio.volume = vol));
}

volumeSlider.addEventListener("input", (e) => {
  const vol = parseFloat(e.target.value);
  updateVolume(vol);
  localStorage.setItem("volume", vol);
  muteBtn.textContent = vol === 0 ? "🔊 Unmute" : "🔇 Mute";
});

muteBtn.addEventListener("click", () => {
  const isMuted = sounds.bg.volume > 0;
  updateVolume(isMuted ? 0 : parseFloat(volumeSlider.value) || 1);
  muteBtn.textContent = isMuted ? "🔊 Unmute" : "🔇 Mute";
});

async function saveScore(name, score) {
  const ref = firestore.collection(db, "leaderboard");
  try {
    await firestore.addDoc(ref, { name, score, timestamp: Date.now() });
    loadLeaderboard();
  } catch (e) {
    console.error("Error saving score:", e);
  }
}

async function loadLeaderboard() {
  const ref = firestore.collection(db, "leaderboard");
  const q = firestore.query(
    ref,
    firestore.orderBy("score", "desc"),
    firestore.limit(10)
  );

  try {
    const snapshot = await firestore.getDocs(q);
    const tbody = document.querySelector("#leaderboardTable tbody");
    tbody.innerHTML = "";
    snapshot.forEach((doc) => {
      const { name, score } = doc.data();
      tbody.innerHTML += `<tr><td>${name}</td><td>${score}</td></tr>`;
    });
  } catch (e) {
    console.error("Error loading leaderboard:", e);
  }
}

function confetti() {
  const duration = 4000;
  const animationEnd = Date.now() + duration;
  const defaults = { startVelocity: 30, spread: 360, ticks: 60, zIndex: 1000 };

  function randomInRange(min, max) {
    return Math.random() * (max - min) + min;
  }

  const interval = setInterval(() => {
    const timeLeft = animationEnd - Date.now();

    if (timeLeft <= 0) {
      clearInterval(interval);
      return;
    }

    window.confetti({
      particleCount: 50,
      origin: {
        x: randomInRange(0.1, 0.9),
        y: Math.random() - 0.2,
      },
      ...defaults,
    });
  }, 250);
}
function checkAndUnlockFaces() {
  faceImages.forEach((face) => {
    if (!face.unlocked && winStreak >= (face.unlockAt || 0)) {
      face.unlocked = true;
      localStorage.setItem(`faceUnlocked_${face.name}`, "true");
      showUnlockPopup(face.name);
    }
  });
}

document.getElementById("changeFaceBtn").addEventListener("click", () => {
  document.getElementById("gameArea").style.display = "none";
  document.getElementById("faceSelection").style.display = "block";
  displayFaceOptions();
});

document.getElementById("viewLeaderboardBtn").addEventListener("click", () => {
  window.location.href = "leaderboard.html";
});
document.getElementById("shareBtn").addEventListener("click", () => {
  const tweetText = `I just survived ${winStreak} faces in this wild hangman game 🎯😈
Think you can beat my streak?

Play here 👉 [YOUR_GAME_URL]

#Hangman #SuccinctLabs`;

  const twitterUrl = `https://twitter.com/intent/tweet?text=${encodeURIComponent(
    tweetText
  )}`;
  window.open(twitterUrl, "_blank");
});

setTimeout(() => {
  updateHighScoreDisplay();
  loadLeaderboard();
  displayFaceOptions();
}, 1000);

window.restartGame = restartGame;
