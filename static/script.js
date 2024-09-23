let database;
let currentGameId = null;
let currentPlayer = null;

let loadingProgress = 0;
const totalSteps = 7; // Increased to account for static resources
let resourcesLoaded = 0;
const totalResources = 2; // Adjust this based on the number of resources (images, gifs, etc.)

function updateLoadingProgress(step) {
    loadingProgress = (step / totalSteps) * 100;
    document.getElementById('progress').style.width = `${loadingProgress}%`;
    document.getElementById('loading-text').textContent = `Loading... ${Math.round(loadingProgress)}%`;
    
    if (loadingProgress >= 100) {
        setTimeout(() => {
            document.getElementById('loading-page').style.display = 'none';
            document.getElementById('main-content').style.display = 'block';
        }, 500);
    }
}

function resourceLoaded() {
    resourcesLoaded++;
    if (resourcesLoaded === totalResources) {
        updateLoadingProgress(7); // Final step
    }
}

// Preload images and other resources
function preloadResources() {
    const imagesToPreload = [
        '/static/game-trophy.png',
        // Add other image/gif URLs here
    ];

    imagesToPreload.forEach(src => {
        const img = new Image();
        img.src = src;
        img.onload = resourceLoaded;
        img.onerror = resourceLoaded; // Count errors to avoid hanging
    });
}

fetch('/config')
    .then(response => {
        updateLoadingProgress(1);
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        return response.json();
    })
    .then(firebaseConfig => {
        updateLoadingProgress(2);
        firebase.initializeApp(firebaseConfig);
        updateLoadingProgress(3);
        database = firebase.database();
        updateLoadingProgress(4);
        initializeEventListeners();
        updateLoadingProgress(5);
        preloadResources(); // Start preloading resources
        updateLoadingProgress(6);
    })
    .catch(error => {
        console.error('Error loading Firebase config:', error);
        alert('Failed to load Firebase configuration. Please try again later.');
    });

let currentSlide = 0;
const slides = document.querySelectorAll('.slide');

function initializeEventListeners() {
    document.querySelectorAll('.next-button').forEach((button, index) => {
        button.addEventListener('click', () => nextSlide(index));
    });
    document.getElementById('start-button').addEventListener('click', showRulesPage);
    document.getElementById('next-button').addEventListener('click', showMenu);
    document.getElementById('watch-stream-button').addEventListener('click', watchStream);
    document.getElementById('play-button').addEventListener('click', showLoginForm);
    document.getElementById('rules-button').addEventListener('click', showRules);
    document.getElementById('login-button').addEventListener('click', login);
    document.getElementById('choices').addEventListener('click', handleChoiceClick);
}

function handleChoiceClick(event) {
    if (event.target.classList.contains('choice')) {
        confirmChoice(event.target.dataset.choice);
    }
}

function nextSlide(index) {
    slides[index].style.display = 'none';
    slides[index + 1].style.display = 'block';
    currentSlide = index + 1;
}

function showRulesPage() {
    document.getElementById('slider').style.display = 'none';
    document.getElementById('rules-page').style.display = 'block';
}

function showMenu() {
    document.getElementById('rules-page').style.display = 'none';
    document.getElementById('menu').style.display = 'grid';
}

function watchStream() {
    alert('Watch stream functionality not implemented yet.');
}

function showLoginForm() {
    document.getElementById('menu').style.display = 'none';
    document.getElementById('login-form').style.display = 'grid';
}

function showRules() {
    document.getElementById('menu').style.display = 'none';
    document.getElementById('rules-page').style.display = 'block';
}

function login() {
    const username = document.getElementById('username').value;
    const gameId = document.getElementById('game-id').value;

    if (!username || !gameId) {
        alert('Please enter both username and game ID');
        return;
    }

    fetch('/login', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({ 
            username,
            game_id: gameId
        }),
    })
    .then(response => {
        if (!response.ok) {
            return response.json().then(err => {
                throw new Error(err.message || `HTTP error! status: ${response.status}`);
            });
        }
        return response.json();
    })
    .then(data => {
        if (data.success) {
            currentGameId = gameId;
            currentPlayer = data.player;
            document.getElementById('login-form').style.display = 'none';
            document.getElementById('game-area').style.display = 'grid';
            document.getElementById('current-game-id').textContent = currentGameId;
            listenForGameUpdates();
        } else {
            alert(data.message || 'Failed to login');
        }
    })
    .catch(error => {
        console.error('Error:', error);
        alert('An error occurred while logging in: ' + error.message);
    });
}

function confirmChoice(choice) {
    if (confirm(`Are you sure you want to choose ${choice}?`)) {
        makeChoice(choice);
    }
}

function makeChoice(choice) {
    console.log(`Making choice: ${choice}`);
    fetch('/make_choice', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({ choice: choice }),
    })
    .then(response => {
        if (!response.ok) {
            return response.json().then(err => {
                throw new Error(err.message || 'An error occurred while making a choice');
            });
        }
        return response.json();
    })
    .then(data => {
        if (data.success) {
            console.log('Choice made successfully');
            if (data.round_winner) {
                console.log(`Round finished. Winner: ${data.round_winner}`);
            }
        } else {
            console.error('Error making choice:', data.message);
            alert('Error making choice: ' + data.message);
        }
    })
    .catch(error => {
        console.error('Error:', error);
        alert('An error occurred while making a choice: ' + error.message);
    });
}

function disableChoiceButtons() {
    document.querySelectorAll('.choice').forEach(button => {
        button.disabled = true;
    });
}

function enableChoiceButtons() {
    document.querySelectorAll('.choice').forEach(button => {
        button.disabled = false;
    });
}

function listenForGameUpdates() {
    if (!database) {
        console.log('Firebase database not initialized');
        return;
    }
    const gameRef = database.ref(`games/${currentGameId}`);
    gameRef.on('value', (snapshot) => {
        const game = snapshot.val();
        document.getElementById('player1-name').textContent = `${game.player1} (${game.player1_score || 0})`;
        document.getElementById('player2-name').textContent = game.player2 ? `${game.player2} (${game.player2_score || 0})` : 'Waiting for player...';

        if (game.status === 'waiting') {
            document.getElementById('result').textContent = 'Waiting for other player to join...';
            disableChoiceButtons();
        } else if (game.status === 'playing') {
            if (game[`${currentPlayer}_choice`]) {
                document.getElementById('result').textContent = `You chose ${game[`${currentPlayer}_choice`]}. Waiting for other player...`;
                disableChoiceButtons();
            } else {
                document.getElementById('result').textContent = 'Make your choice!';
                enableChoiceButtons();
            }
        } else if (game.status === 'finished') {
            let result = '';
            if (game.winner === 'player1') {
                result = currentPlayer === 'player1' ? 'You win the game!' : 'You lose the game!';
            } else if (game.winner === 'player2') {
                result = currentPlayer === 'player2' ? 'You win the game!' : 'You lose the game!';
            } else {
                result = 'The game ended in a tie!';
            }
            document.getElementById('result').textContent = result;
            disableChoiceButtons();
            stopTimer();
            return;
        }

        const act1 = game.act1 || false;
        const act2 = game.act2 || false;

        if (act1 && act2 && game.status !== 'finished') {
            console.log('Both players are active');
            if (!game.timerStarted || (game.player1_choice && game.player2_choice)) {
                startTimer(gameRef);
            } else {
                updateTimerFromDatabase(game.timerEnd);
            }
        } else {
            stopTimer();
            console.log('Not all players are active or game is finished');
        }
    });
}

let timerInterval;
const timerElement = document.getElementById('timer');

function startTimer(gameRef) {
    const timerEnd = Date.now() + 20000;
    gameRef.update({
        timerStarted: true,
        timerEnd: timerEnd
    });
    updateTimerFromDatabase(timerEnd);
}

function updateTimerFromDatabase(timerEnd) {
    clearInterval(timerInterval);
    
    timerInterval = setInterval(() => {
        const timeLeft = Math.max(0, Math.ceil((timerEnd - Date.now()) / 1000));
        updateTimerDisplay(timeLeft);

        if (timeLeft <= 0) {
            clearInterval(timerInterval);
            handleTimerEnd();
        }
    }, 100);
}

function stopTimer() {
    clearInterval(timerInterval);
    timerElement.textContent = '';
}

function updateTimerDisplay(timeLeft) {
    timerElement.textContent = timeLeft;
}

function handleTimerEnd() {
    const gameRef = database.ref(`games/${currentGameId}`);
    gameRef.once('value', (snapshot) => {
        const game = snapshot.val();
        if (game.status === 'finished') {
            return;
        }
        if (game.player1_choice && game.player2_choice) {
            const winner = determineWinner(game.player1_choice, game.player2_choice);
            updateScores(gameRef, game, winner);
        } else if (game.player1_choice || game.player2_choice) {
            const winner = game.player1_choice ? 'player1' : 'player2';
            updateScores(gameRef, game, winner);
        } else {
            updateScores(gameRef, game, 'tie');
        }
    });
}

function updateScores(gameRef, game, winner) {
    if (winner !== 'tie') {
        game[`${winner}_score`] = (game[`${winner}_score`] || 0) + 1;
    }
    const updates = {
        player1_choice: null,
        player2_choice: null,
        [`${winner}_score`]: game[`${winner}_score`] || 0,
        round_result: winner === 'tie' ? 'Tie' : `${winner} wins`,
        timerStarted: false,
        timerEnd: null
    };

    if (game[`${winner}_score`] >= 3) {
        updates.status = 'finished';
        updates.winner = winner;
    }

    gameRef.update(updates);
}

document.addEventListener('DOMContentLoaded', () => {
    slides[0].style.display = 'block';
    for (let i = 1; i < slides.length; i++) {
        slides[i].style.display = 'none';
    }
    initializeEventListeners();
    preloadResources(); // Start preloading resources
});

// Remove or modify the 'load' event listener if you're using the above method
// window.addEventListener('load', () => {
//     updateLoadingProgress(totalSteps);
// });