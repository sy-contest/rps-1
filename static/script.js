let database;
let currentGameId = null;
let currentPlayer = null;

// Fetch Firebase config from server
fetch('/config')
    .then(response => {
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        return response.json();
    })
    .then(firebaseConfig => {
        firebase.initializeApp(firebaseConfig);
        database = firebase.database();
        initializeEventListeners();
    })
    .catch(error => {
        console.error('Error loading Firebase config:', error);
        alert('Failed to load Firebase configuration. Please try again later.');
    });

function initializeEventListeners() {
    document.getElementById('login-button').addEventListener('click', login);

    document.querySelectorAll('.choice').forEach(button => {
        button.addEventListener('click', () => confirmChoice(button.dataset.choice));
    });
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
        body: JSON.stringify({ username, game_id: gameId }),
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
            document.getElementById('game-area').style.display = 'block';
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
        }

        // Access act1 and act2 values
        const act1 = game.act1 || false;
        const act2 = game.act2 || false;

        // Start the timer when both players are active
        if (act1 && act2) {
            console.log('Both players are active');
            if (!game.timerStarted) {
                startTimer(gameRef);
            } else {
                updateTimerFromDatabase(game.timerEnd);
            }
        } else {
            stopTimer();
            console.log('Not all players are active');
        }
    });
}

let timerInterval;
const timerElement = document.getElementById('timer');

function startTimer(gameRef) {
    const timerEnd = Date.now() + 20000; // 20 seconds from now
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
    }, 100); // Update more frequently for smoother countdown
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
        if (game.player1_choice && game.player2_choice) {
            const winner = determineWinner(game.player1_choice, game.player2_choice);
            updateScores(gameRef, game, winner);
        } else if (game.player1_choice || game.player2_choice) {
            const winner = game.player1_choice ? 'player1' : 'player2';
            updateScores(gameRef, game, winner);
        } else {
            updateScores(gameRef, game, 'tie');
        }
        // Restart the timer after updating scores
        startTimer(gameRef);
    });
}

function updateScores(gameRef, game, winner) {
    if (winner !== 'tie') {
        game[`${winner}_score`] = (game[`${winner}_score`] || 0) + 1;
    }
    gameRef.update({
        player1_choice: null,
        player2_choice: null,
        [`${winner}_score`]: game[`${winner}_score`] || 0,
        round_result: winner === 'tie' ? 'Tie' : `${winner} wins`,
        timerStarted: false, // Reset timer started flag
        timerEnd: null // Clear timer end
    });
}