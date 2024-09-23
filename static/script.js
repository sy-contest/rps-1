// Declare a variable to hold the Firebase database reference
let database;
// Declare a variable to hold the current game ID
let currentGameId = null;
// Declare a variable to hold the current player information
let currentPlayer = null;

// Fetch Firebase config from server
fetch('/config')
    .then(response => {
        // Check if the response is not OK (status code not in the range 200-299)
        if (!response.ok) {
            // Throw an error with the response status
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        // Return the response as JSON
        return response.json();
    })
    .then(firebaseConfig => {
        // Initialize Firebase with the fetched configuration
        firebase.initializeApp(firebaseConfig);
        // Get a reference to the Firebase database
        database = firebase.database();
        // Initialize event listeners for the game
        initializeEventListeners();
    })
    .catch(error => {
        // Log an error message to the console if there is an error loading Firebase config
        console.error('Error loading Firebase config:', error);
        // Show an alert to the user indicating that the Firebase configuration failed to load
        alert('Failed to load Firebase configuration. Please try again later.');
    });

// Function to initialize event listeners for the game
function initializeEventListeners() {
    // Add a click event listener to the login button
    document.getElementById('login-button').addEventListener('click', login);

    // Add click event listeners to all choice buttons (rock, paper, scissors)
    document.querySelectorAll('.choice').forEach(button => {
        // When a choice button is clicked, call the confirmChoice function with the button's data-choice attribute
        button.addEventListener('click', () => confirmChoice(button.dataset.choice));
    });
}

// Function to handle the login process
function login() {
    // Get the username entered by the user
    const username = document.getElementById('username').value;
    // Get the game ID entered by the user
    const gameId = document.getElementById('game-id').value;

    // Check if either the username or game ID is empty
    if (!username || !gameId) {
        // Show an alert to the user indicating that both fields are required
        alert('Please enter both username and game ID');
        return;
    }

    // Send a POST request to the server to log in
    // Use the fetch API to send a POST request to the '/login' endpoint
    fetch('/login', {
        // Specify the HTTP method as POST
        method: 'POST',
        // Set the headers for the request
        headers: {
            // Indicate that the request body will be in JSON format
            'Content-Type': 'application/json',
        },
        // Include the request body, which contains the username and game ID
        // JSON.stringify converts the JavaScript object into a JSON string
        body: JSON.stringify({ 
            // The username entered by the user
            username, 
            // The game ID entered by the user
            game_id: gameId 
        }),
    })
    .then(response => {
        // Check if the response is not OK
        if (!response.ok) {
            // Return the response as JSON and throw an error with the error message
            return response.json().then(err => {
                throw new Error(err.message || `HTTP error! status: ${response.status}`);
            });
        }
        // Return the response as JSON
        return response.json();
    })
    .then(data => {
        // Check if the login was successful
        if (data.success) {
            // Set the current game ID to the entered game ID
            currentGameId = gameId;
            // Set the current player information to the data received from the server
            currentPlayer = data.player;
            // Hide the login form
            document.getElementById('login-form').style.display = 'none';
            // Show the game area
            document.getElementById('game-area').style.display = 'block';
            // Display the current game ID in the game area
            document.getElementById('current-game-id').textContent = currentGameId;
            // Start listening for game updates
            listenForGameUpdates();
        } else {
            // Show an alert to the user indicating that the login failed
            alert(data.message || 'Failed to login');
        }
    })
    .catch(error => {
        // Log an error message to the console if there is an error during login
        console.error('Error:', error);
        // Show an alert to the user indicating that an error occurred during login
        alert('An error occurred while logging in: ' + error.message);
    });
}

// Function to confirm the player's choice (rock, paper, or scissors)
function confirmChoice(choice) {
    // Show a confirmation dialog to the user
    if (confirm(`Are you sure you want to choose ${choice}?`)) {
        // If the user confirms, call the makeChoice function with the chosen option
        makeChoice(choice);
    }
}

// Function to send the player's choice to the server
function makeChoice(choice) {
    // Log the chosen option to the console
    console.log(`Making choice: ${choice}`);
    // Send a POST request to the server with the chosen option
    fetch('/make_choice', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        // Send the chosen option as JSON in the request body
        body: JSON.stringify({ choice: choice }),
    })
    .then(response => {
        // Check if the response is not OK
        if (!response.ok) {
            // Return the response as JSON and throw an error with the error message
            return response.json().then(err => {
                throw new Error(err.message || 'An error occurred while making a choice');
            });
        }
        // Return the response as JSON
        return response.json();
    })
    .then(data => {
        // Check if the choice was successfully made
        if (data.success) {
            // Log a success message to the console
            console.log('Choice made successfully');
            // Check if there is a round winner
            if (data.round_winner) {
                // Log the round winner to the console
                console.log(`Round finished. Winner: ${data.round_winner}`);
            }
        } else {
            // Log an error message to the console if there was an error making the choice
            console.error('Error making choice:', data.message);
            // Show an alert to the user indicating that there was an error making the choice
            alert('Error making choice: ' + data.message);
        }
    })
    .catch(error => {
        // Log an error message to the console if there is an error during the choice process
        console.error('Error:', error);
        // Show an alert to the user indicating that an error occurred while making the choice
        alert('An error occurred while making a choice: ' + error.message);
    });
}

// Function to disable all choice buttons (rock, paper, scissors)
function disableChoiceButtons() {
    // Select all choice buttons and disable them
    document.querySelectorAll('.choice').forEach(button => {
        button.disabled = true;
    });
}

// Function to enable all choice buttons (rock, paper, scissors)
function enableChoiceButtons() {
    // Select all choice buttons and enable them
    document.querySelectorAll('.choice').forEach(button => {
        button.disabled = false;
    });
}

// Function to listen for game updates from the Firebase database
function listenForGameUpdates() {
    // Check if the Firebase database is not initialized
    if (!database) {
        // Log a message to the console indicating that the Firebase database is not initialized
        console.log('Firebase database not initialized');
        return;
    }
    // Get a reference to the current game's data in the Firebase database
    const gameRef = database.ref(`games/${currentGameId}`);
    // Set up a listener for changes to the game's data
    gameRef.on('value', (snapshot) => {
        // Get the game's data from the snapshot
        const game = snapshot.val();
        // Update the player names and scores in the game area
        document.getElementById('player1-name').textContent = `${game.player1} (${game.player1_score || 0})`;
        document.getElementById('player2-name').textContent = game.player2 ? `${game.player2} (${game.player2_score || 0})` : 'Waiting for player...';

        // Check the game's status
        if (game.status === 'waiting') {
            // If the game is waiting for another player, update the result text and disable choice buttons
            document.getElementById('result').textContent = 'Waiting for other player to join...';
            disableChoiceButtons();
        } else if (game.status === 'playing') {
            // If the game is in progress, check if the current player has made a choice
            if (game[`${currentPlayer}_choice`]) {
                // If the current player has made a choice, update the result text and disable choice buttons
                document.getElementById('result').textContent = `You chose ${game[`${currentPlayer}_choice`]}. Waiting for other player...`;
                disableChoiceButtons();
            } else {
                // If the current player has not made a choice, update the result text and enable choice buttons
                document.getElementById('result').textContent = 'Make your choice!';
                enableChoiceButtons();
            }
        } else if (game.status === 'finished') {
            // If the game is finished, determine the result and update the result text
            let result = '';
            if (game.winner === 'player1') {
                result = currentPlayer === 'player1' ? 'You win the game!' : 'You lose the game!';
            } else if (game.winner === 'player2') {
                result = currentPlayer === 'player2' ? 'You win the game!' : 'You lose the game!';
            } else {
                result = 'The game ended in a tie!';
            }
            document.getElementById('result').textContent = result;
            // Disable choice buttons and stop the timer
            disableChoiceButtons();
            stopTimer();
            return; // Exit the function to prevent timer from starting
        }

        // Access act1 and act2 values to check if both players are active
        const act1 = game.act1 || false;
        const act2 = game.act2 || false;

        // Start or restart the timer when both players are active and the game is not finished
        if (act1 && act2 && game.status !== 'finished') {
            console.log('Both players are active');
            // Check if the timer has not started or if both players have made their choices
            if (!game.timerStarted || (game.player1_choice && game.player2_choice)) {
                // Start the timer
                startTimer(gameRef);
            } else {
                // Update the timer from the database
                updateTimerFromDatabase(game.timerEnd);
            }
        } else {
            // Stop the timer if not all players are active or the game is finished
            stopTimer();
            console.log('Not all players are active or game is finished');
        }
    });
}

// Declare a variable to hold the timer interval ID
let timerInterval;
// Get a reference to the timer element in the game area
const timerElement = document.getElementById('timer');

// Function to start the timer for the game
function startTimer(gameRef) {
    // Calculate the timer end time (20 seconds from now)
    const timerEnd = Date.now() + 20000; // 20 seconds from now
    // Update the game's data in the Firebase database to indicate that the timer has started and set the timer end time
    gameRef.update({
        timerStarted: true,
        timerEnd: timerEnd
    });
    // Update the timer display from the database
    updateTimerFromDatabase(timerEnd);
}

// Function to update the timer display from the database
function updateTimerFromDatabase(timerEnd) {
    // Clear any existing timer interval
    clearInterval(timerInterval);
    
    // Set a new interval to update the timer display every 100 milliseconds
    timerInterval = setInterval(() => {
        // Calculate the time left in seconds
        const timeLeft = Math.max(0, Math.ceil((timerEnd - Date.now()) / 1000));
        // Update the timer display with the time left
        updateTimerDisplay(timeLeft);

        // Check if the time left is less than or equal to 0
        if (timeLeft <= 0) {
            // Clear the timer interval
            clearInterval(timerInterval);
            // Handle the end of the timer
            handleTimerEnd();
        }
    }, 100); // Update more frequently for smoother countdown
}

// Function to stop the timer
function stopTimer() {
    // Clear the timer interval
    clearInterval(timerInterval);
    // Clear the timer display
    timerElement.textContent = '';
}

// Function to update the timer display with the time left
function updateTimerDisplay(timeLeft) {
    // Set the timer element's text content to the time left
    timerElement.textContent = timeLeft;
}

// Function to handle the end of the timer
function handleTimerEnd() {
    // Get a reference to the current game's data in the Firebase database
    const gameRef = database.ref(`games/${currentGameId}`);
    // Get the game's data once from the Firebase database
    gameRef.once('value', (snapshot) => {
        // Get the game's data from the snapshot
        const game = snapshot.val();
        // Check if the game is already finished
        if (game.status === 'finished') {
            return; // Don't process if the game is already finished
        }
        // Check if both players have made their choices
        if (game.player1_choice && game.player2_choice) {
            // Determine the winner based on the players' choices
            const winner = determineWinner(game.player1_choice, game.player2_choice);
            // Update the scores in the Firebase database
            updateScores(gameRef, game, winner);
        } else if (game.player1_choice || game.player2_choice) {
            // Determine the winner based on which player has made a choice
            const winner = game.player1_choice ? 'player1' : 'player2';
            // Update the scores in the Firebase database
            updateScores(gameRef, game, winner);
        } else {
            // If neither player has made a choice, update the scores as a tie
            updateScores(gameRef, game, 'tie');
        }
    });
}

// Function to update the scores in the Firebase database
function updateScores(gameRef, game, winner) {
    // Check if the winner is not a tie
    if (winner !== 'tie') {
        // Increment the winner's score by 1
        game[`${winner}_score`] = (game[`${winner}_score`] || 0) + 1;
    }
    // Create an object to hold the updates for the game's data
    const updates = {
        player1_choice: null,
        player2_choice: null,
        [`${winner}_score`]: game[`${winner}_score`] || 0,
        round_result: winner === 'tie' ? 'Tie' : `${winner} wins`,
        timerStarted: false,
        timerEnd: null
    };

    // Check if the winner's score is greater than or equal to 3
    if (game[`${winner}_score`] >= 3) {
        // Update the game's status to finished and set the winner
        updates.status = 'finished';
        updates.winner = winner;
    }

    // Update the game's data in the Firebase database with the updates
    gameRef.update(updates);
}