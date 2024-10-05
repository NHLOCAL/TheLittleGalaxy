// הגדרת הקנבס
const canvas = document.getElementById('canvas');
const ctx = canvas.getContext('2d');

const miniMapCanvas = document.getElementById('miniMapCanvas');
const miniMapCtx = miniMapCanvas.getContext('2d');

function resizeCanvas() {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
}
resizeCanvas();
window.addEventListener('resize', resizeCanvas);

// משתנים כלליים
let stars = [];
let keys = {};
let currentDialogue = null;
let inDialogue = false;
let visitedPlanets = new Set();

// טעינת תמונות
const images = {};
function loadImages(sources, callback) {
    let loadedImages = 0;
    let numImages = Object.keys(sources).length;

    for (let src in sources) {
        images[src] = new Image();
        images[src].onload = function() {
            if (++loadedImages >= numImages) {
                callback();
            }
        };
        images[src].src = sources[src];
    }
}

const imageSources = {
    prince: 'assets/prince.png',
    rose: 'assets/rose.png',
    sheep: 'assets/sheep.png',
    king: 'assets/king.png',
    conceited: 'assets/conceited.png',
    drunkard: 'assets/drunkard.png',
    businessman: 'assets/businessman.png',
    lamplighter: 'assets/lamplighter.png',
    geographer: 'assets/geographer.png',
    fox: 'assets/fox.png',
    snake: 'assets/snake.png',
    pilot: 'assets/pilot.png',
    baobab: 'assets/baobab.png',
    planet: 'assets/planet.png',
    earth: 'assets/earth.png',
    desert: 'assets/desert.png',
};

// דמויות וכוכבים
let prince = {
    x: 0,
    y: 0,
    size: 70,
    speed: 8,
    sprite: null,
};

let planets = []; // יתמלא לאחר יצירת מיקומים

// יצירת מיקומי כוכבים
function generatePlanetPositions(numberOfPlanets, minDistance) {
    const positions = [];
    const margin = 1000; // מרחק מהקצוות
    const max = 5000 - margin; // הגדלת שטח המשחק
    const min = -5000 + margin;

    for (let i = 0; i < numberOfPlanets; i++) {
        let positionValid = false;
        let attempts = 0;
        let x, y;

        while (!positionValid && attempts < 2000) {
            x = Math.floor(Math.random() * (max - min + 1)) + min;
            y = Math.floor(Math.random() * (max - min + 1)) + min;

            positionValid = true;

            for (let pos of positions) {
                let dx = x - pos.x;
                let dy = y - pos.y;
                let distance = Math.sqrt(dx * dx + dy * dy);

                if (distance < minDistance) {
                    positionValid = false;
                    break;
                }
            }

            attempts++;
        }

        if (attempts >= 2000) {
            console.warn('לא נמצא מיקום מתאים לכוכב לאחר 2000 ניסיונות.');
        }

        positions.push({ x: x, y: y });
    }

    return positions;
}

// הגדרת הכוכבים
function createPlanets() {
    const planetData = [
        {
            size: 200,
            name: 'כוכב הבית',
            spriteName: 'baobab',
            characterSpriteName: 'rose',
            dialogues: [
                { name: 'הנסיך הקטן', text: 'שלום, ורד יקרה. איך את מרגישה היום?' },
                { name: 'הוורד', text: 'אני מרגישה נפלא כשאתה איתי.' },
                { name: 'הנסיך הקטן', text: 'אני יוצא למסע כדי להבין את העולם טוב יותר.' },
                { name: 'הוורד', text: 'אשמח שתשוב אליי בקרוב.' },
            ],
            hasSheep: true,
        },
        {
            size: 150,
            name: 'המלך',
            spriteName: 'planet',
            characterSpriteName: 'king',
            dialogues: [
                { name: 'המלך', text: 'ברוך הבא לכוכבי, נסיך צעיר!' },
                { name: 'הנסיך הקטן', text: 'שלום, על מה אתה שולט?' },
                { name: 'המלך', text: 'אני שולט על הכל. כל הכוכבים מצייתים לי.' },
                { name: 'הנסיך הקטן', text: 'האם תוכל להורות לשמש לשקוע?' },
                { name: 'המלך', text: 'בוודאי, אבל יש להמתין לזמן הנכון.' },
            ],
        },
        {
            size: 140,
            name: 'האיש הגאה',
            spriteName: 'planet',
            characterSpriteName: 'conceited',
            dialogues: [
                { name: 'האיש הגאה', text: 'אה! הנה מעריץ מגיע!' },
                { name: 'הנסיך הקטן', text: 'שלום, מה אתה עושה?' },
                { name: 'האיש הגאה', text: 'אני האדם היפה, העשיר והחכם ביותר כאן.' },
                { name: 'הנסיך הקטן', text: 'אבל אתה לבד בכוכב הזה.' },
                { name: 'האיש הגאה', text: 'ובכל זאת, הערצה היא הערצה.' },
            ],
        },
        {
            size: 130,
            name: 'השיכור',
            spriteName: 'planet',
            characterSpriteName: 'drunkard',
            dialogues: [
                { name: 'הנסיך הקטן', text: 'מדוע אתה שותה?' },
                { name: 'השיכור', text: 'כדי לשכוח.' },
                { name: 'הנסיך הקטן', text: 'לשכוח מה?' },
                { name: 'השיכור', text: 'לשכוח שאני מתבייש.' },
                { name: 'הנסיך הקטן', text: 'במה אתה מתבייש?' },
                { name: 'השיכור', text: 'בזה שאני שותה.' },
            ],
        },
        {
            size: 160,
            name: 'איש העסקים',
            spriteName: 'planet',
            characterSpriteName: 'businessman',
            dialogues: [
                { name: 'איש העסקים', text: '1, 2, 3... אני עסוק מאוד!' },
                { name: 'הנסיך הקטן', text: 'מה אתה סופר?' },
                { name: 'איש העסקים', text: 'אני סופר את הכוכבים. הם שלי.' },
                { name: 'הנסיך הקטן', text: 'איך אתה יכול להיות בעלים של הכוכבים?' },
                { name: 'איש העסקים', text: 'אני הראשון שחשב על זה, ולכן הם שלי.' },
            ],
        },
        {
            size: 120,
            name: 'מדליק הפנסים',
            spriteName: 'planet',
            characterSpriteName: 'lamplighter',
            dialogues: [
                { name: 'הנסיך הקטן', text: 'מדוע אתה מדליק ומכבה את הפנס ללא הפסקה?' },
                { name: 'מדליק הפנסים', text: 'זו ההוראה. אני חייב לבצע אותה.' },
                { name: 'הנסיך הקטן', text: 'זה ודאי מתיש מאוד.' },
                { name: 'מדליק הפנסים', text: 'כן, אבל ההוראה לא משתנה.' },
            ],
        },
        {
            size: 140,
            name: 'הגאוגרף',
            spriteName: 'planet',
            characterSpriteName: 'geographer',
            dialogues: [
                { name: 'הגאוגרף', text: 'אני גאוגרף, רושם את המפות.' },
                { name: 'הנסיך הקטן', text: 'האם חקרת את הכוכב שלך?' },
                { name: 'הגאוגרף', text: 'לא, אני מחכה לחוקרים.' },
                { name: 'הנסיך הקטן', text: 'אני יכול להיות חוקר עבורך?' },
                { name: 'הגאוגרף', text: 'בהחלט! ספר לי על המקומות שביקרת בהם.' },
            ],
        },
        {
            size: 140,
            name: 'השועל',
            spriteName: 'earth',
            characterSpriteName: 'fox',
            dialogues: [
                { name: 'השועל', text: 'בוא ואלף אותי!' },
                { name: 'הנסיך הקטן', text: 'מה פירוש "לאלף"?' },
                { name: 'השועל', text: 'ליצור קשרים מיוחדים. אתה תהיה מיוחד עבורי.' },
                { name: 'הנסיך הקטן', text: 'אני מתחיל להבין...' },
                { name: 'השועל', text: 'הנה הסוד שלי: העיקר סמוי מן העין.' },
            ],
        },
        {
            size: 150,
            name: 'כדור הארץ',
            spriteName: 'desert',
            characterSpriteName: 'pilot',
            dialogues: [
                { name: 'הנסיך הקטן', text: 'שלום! מה אתה עושה במדבר הזה?' },
                { name: 'הטייס', text: 'המטוס שלי התקלקל כאן. אני מנסה לתקן אותו.' },
                { name: 'הנסיך הקטן', text: 'אני יכול לעזור לך?' },
                { name: 'הטייס', text: 'אשמח מאוד. ספר לי על המסע שלך.' },
            ],
            isEarth: true,
        },
        {
            size: 130,
            name: 'הנחש',
            spriteName: 'desert',
            characterSpriteName: 'snake',
            dialogues: [
                { name: 'הנחש', text: 'אני יכול לעזור לך לחזור לכוכב שלך...' },
                { name: 'הנסיך הקטן', text: 'איך תעשה זאת?' },
                { name: 'הנחש', text: 'אני יכול להחזיר אותך למקום שממנו באת.' },
                { name: 'הנסיך הקטן', text: 'האם זה יכאב?' },
                { name: 'הנחש', text: 'לא, זה יהיה מהיר ושקט.' },
            ],
            isSnake: true,
            accessible: false,
        },
    ];

    const positions = generatePlanetPositions(planetData.length - 1, 1500); // מלבד כוכב הבית

    planets = [];

    // כוכב הבית ב-(0, 0)
    const homePlanet = planetData[0];
    homePlanet.x = 0;
    homePlanet.y = 0;
    homePlanet.sprite = images[homePlanet.spriteName];
    homePlanet.characterSprite = images[homePlanet.characterSpriteName];
    planets.push(homePlanet);

    // מיקום לשאר הכוכבים
    for (let i = 1; i < planetData.length; i++) {
        const data = planetData[i];
        data.x = positions[i - 1].x;
        data.y = positions[i - 1].y;
        data.sprite = images[data.spriteName];
        data.characterSprite = images[data.characterSpriteName];
        planets.push(data);
    }
}

// עדכון גישה לנחש
function updateSnakeAccessibility() {
    if (visitedPlanets.size >= planets.length - 1) { // מלבד הנחש
        let snakePlanet = planets.find(p => p.isSnake);
        if (snakePlanet) {
            snakePlanet.accessible = true;
        }
    }
}

// יצירת כוכבים
function createStars() {
    stars = [];
    for (let i = 0; i < 1000; i++) { // הגדלת מספר הכוכבים
        stars.push({
            x: Math.random() * canvas.width * 10 - canvas.width * 5,
            y: Math.random() * canvas.height * 10 - canvas.height * 5,
            size: Math.random() * 2,
            color: 'white',
            twinkle: Math.random() * 0.5 + 0.5,
        });
    }
}

// טיפול באירועי מקלדת
window.addEventListener('keydown', function(e) {
    keys[e.keyCode] = true;
});
window.addEventListener('keyup', function(e) {
    delete keys[e.keyCode];
});

// אלמנטים של דו-שיח
const dialogueBox = document.getElementById('dialogueBox');
const characterNameElem = document.getElementById('characterName');
const dialogueTextElem = document.getElementById('dialogueText');
const nextButton = document.getElementById('nextButton');

nextButton.addEventListener('click', function() {
    if (currentDialogue && currentDialogue.length > 0) {
        showDialogue();
    } else {
        dialogueBox.style.display = 'none';
        inDialogue = false;

        // בדיקה אם הנחש הוכש את הנסיך
        if (currentPlanet && currentPlanet.isSnake && !gameEnded) {
            endGame(); // סיום המשחק
        } else {
            updateSnakeAccessibility();
        }
    }
});

// משתנים נוספים
let currentPlanet = null;
let gameEnded = false;

// לולאת המשחק
function gameLoop() {
    update();
    draw();
    if (!gameEnded) {
        requestAnimationFrame(gameLoop);
    }
}

// עדכון מצב המשחק
function update() {
    if (inDialogue || gameEnded) return;

    if (keys[37]) prince.x -= prince.speed; // חץ שמאל
    if (keys[39]) prince.x += prince.speed; // חץ ימין
    if (keys[38]) prince.y -= prince.speed; // חץ מעלה
    if (keys[40]) prince.y += prince.speed; // חץ מטה

    // שמירה על גבולות המסך
    if (prince.x < -5000) prince.x = -5000;
    if (prince.x > 5000) prince.x = 5000;
    if (prince.y < -5000) prince.y = -5000;
    if (prince.y > 5000) prince.y = 5000;

    // אינטראקציה עם כוכבים
    if (keys[32]) { // מקש רווח
        planets.forEach(planet => {
            let dx = planet.x - prince.x;
            let dy = planet.y - prince.y;
            let distance = Math.sqrt(dx * dx + dy * dy);
            if (distance < planet.size + prince.size) {
                if (planet.isSnake && !planet.accessible) {
                    alert('עדיין אינך יכול לגשת לכאן. בקר בכל הכוכבים תחילה.');
                    delete keys[32]; // מניעת הפעלה מרובה
                } else {
                    initiateDialogue(planet);
                    delete keys[32]; // מניעת הפעלה מרובה
                }
            }
        });
    }
}

// התחלת דו-שיח
function initiateDialogue(planet) {
    if (inDialogue) return;
    currentDialogue = planet.dialogues.slice();
    inDialogue = true;
    currentPlanet = planet;
    showDialogue();
    visitedPlanets.add(planet.name);
}

// הצגת דו-שיח
function showDialogue() {
    if (currentDialogue.length === 0) {
        dialogueBox.style.display = 'none';
        inDialogue = false;

        // בדיקה אם הנחש הוכש את הנסיך
        if (currentPlanet && currentPlanet.isSnake && !gameEnded) {
            endGame(); // סיום המשחק
        } else {
            updateSnakeAccessibility();
        }
        return;
    }
    let dialogueLine = currentDialogue.shift();
    characterNameElem.textContent = dialogueLine.name;
    dialogueTextElem.textContent = dialogueLine.text;
    dialogueBox.style.display = 'block';
}

// סיום המשחק
function endGame() {
    gameEnded = true;
    alert('הנחש הכיש את הנסיך הקטן והוא חוזר לכוכב שלו...');
    // אנימציית ריחוף חזרה לכוכב הבית
    let startX = prince.x;
    let startY = prince.y;
    let endX = 0;
    let endY = 0;
    let duration = 3000; // 3 שניות
    let startTime = null;

    function animateReturn(timestamp) {
        if (!startTime) startTime = timestamp;
        let progress = timestamp - startTime;
        let t = Math.min(progress / duration, 1);

        // ריחוף הנסיך לכוכב הבית
        prince.x = startX + (endX - startX) * easeInOutQuad(t);
        prince.y = startY + (endY - startY) * easeInOutQuad(t);

        if (t < 1) {
            requestAnimationFrame(animateReturn);
        } else {
            setTimeout(() => {
                alert('הנסיך הקטן חזר הביתה.');
                showRestartButton();
            }, 500);
        }
    }

    function easeInOutQuad(t) {
        return t < 0.5 ? 2 * t * t : -1 + (4 - 2 * t) * t;
    }

    requestAnimationFrame(animateReturn);
}

// הצגת כפתור התחל מחדש
function showRestartButton() {
    const restartBtn = document.createElement('button');
    restartBtn.id = 'restartButton';
    restartBtn.textContent = 'התחל מחדש';
    restartBtn.style.position = 'absolute';
    restartBtn.style.top = '50%';
    restartBtn.style.left = '50%';
    restartBtn.style.transform = 'translate(-50%, -50%)';
    restartBtn.style.padding = '20px 40px';
    restartBtn.style.fontSize = '24px';
    restartBtn.style.cursor = 'pointer';
    restartBtn.style.zIndex = '30';
    document.body.appendChild(restartBtn);

    restartBtn.addEventListener('click', function() {
        document.body.removeChild(restartBtn);
        resetGame();
    });
}

// איפוס המשחק
function resetGame() {
    prince.x = 0;
    prince.y = 0;
    visitedPlanets.clear();
    gameEnded = false;
    currentPlanet = null;
    planets.forEach(planet => {
        if (planet.isSnake) {
            planet.accessible = false;
        }
    });
    initiateDialogue(planets[0]); // התחלת המשחק בדו-שיח עם השושנה
    gameLoop();
}

// ציור כל האלמנטים
function draw() {
    // ניקוי הקנבס
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // ציור שכבת רקע לתחושת עומק
    drawBackground();

    // ציור כוכבים
    planets.forEach(planet => {
        let x = planet.x - prince.x + canvas.width / 2;
        let y = planet.y - prince.y + canvas.height / 2;

        // ציור הכוכב
        if (planet.sprite) {
            ctx.drawImage(planet.sprite, x - planet.size, y - planet.size, planet.size * 2, planet.size * 2);
        } else {
            ctx.beginPath();
            ctx.arc(x, y, planet.size, 0, Math.PI * 2);
            ctx.fillStyle = 'gray';
            ctx.fill();
        }

        // ציור הדמות על הכוכב
        if (planet.characterSprite) {
            ctx.drawImage(planet.characterSprite, x - 40, y - planet.size / 2 - 110, 110, 110);
        }

        // ציור הכבשה בכוכב הבית
        if (planet.hasSheep) {
            ctx.drawImage(images.sheep, x + 20, y + 10, 120, 120);
        }

        // שם הכוכב אם קרוב
        let dx = planet.x - prince.x;
        let dy = planet.y - prince.y;
        let distance = Math.sqrt(dx * dx + dy * dy);

        if (distance < 800) {
            ctx.fillStyle = 'white';
            ctx.font = '20px Arial';
            ctx.fillText(planet.name, x - 40, y + planet.size + 30);
        }
    });

    // ציור הנסיך
    if (prince.sprite) {
        ctx.drawImage(prince.sprite, canvas.width / 2 - prince.size, canvas.height / 2 - prince.size, prince.size * 2, prince.size * 2);
    } else {
        ctx.beginPath();
        ctx.arc(canvas.width / 2, canvas.height / 2, prince.size, 0, Math.PI * 2);
        ctx.fillStyle = 'yellow';
        ctx.fill();
    }

    // ציור המיני מפה
    drawMiniMap();
}

// ציור רקע עם אפקט Parallax
function drawBackground() {
    stars.forEach(star => {
        ctx.fillStyle = star.color;
        let x = star.x - prince.x * (star.twinkle / 2) + canvas.width / 2;
        let y = star.y - prince.y * (star.twinkle / 2) + canvas.height / 2;
        ctx.globalAlpha = Math.abs(Math.sin(Date.now() * 0.005 * star.twinkle)) * 0.5 + 0.5;
        ctx.fillRect(x, y, star.size, star.size);
    });
    ctx.globalAlpha = 1.0;
}

// ציור מיני מפה
function drawMiniMap() {
    miniMapCtx.clearRect(0, 0, miniMapCanvas.width, miniMapCanvas.height);

    planets.forEach(planet => {
        let x = (planet.x / 10000) * miniMapCanvas.width + miniMapCanvas.width / 2;
        let y = (planet.y / 10000) * miniMapCanvas.height + miniMapCanvas.height / 2;
        miniMapCtx.fillStyle = planet.isSnake ? (planet.accessible ? 'red' : 'gray') : 'gray';
        miniMapCtx.beginPath();
        miniMapCtx.arc(x, y, 3, 0, Math.PI * 2);
        miniMapCtx.fill();
    });

    // ציור הנסיך במיני מפה
    let princeX = (prince.x / 10000) * miniMapCanvas.width + miniMapCanvas.width / 2;
    let princeY = (prince.y / 10000) * miniMapCanvas.height + miniMapCanvas.height / 2;
    miniMapCtx.fillStyle = 'yellow';
    miniMapCtx.beginPath();
    miniMapCtx.arc(princeX, princeY, 3, 0, Math.PI * 2);
    miniMapCtx.fill();
}

// התחלת המשחק לאחר טעינת התמונות
loadImages(imageSources, function() {
    prince.sprite = images.prince;
    createPlanets();
    createStars();
    initiateDialogue(planets[0]); // התחלת המשחק בדו-שיח עם השושנה
    gameLoop();
});
