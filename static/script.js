let database;
let currentGameId = null;
let currentPlayer = null;
let currentSlide = 0;
let youtubePlayer;

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
        showSlide(currentSlide);
        initYouTubePlayer();
    })
    .catch(error => {
        console.error('Error loading Firebase config:', error);
        alert('Failed to load Firebase configuration. Please try again later.');
    });

function initializeEventListeners() {
    document.querySelectorAll('.next-slide').forEach(button => {
        button.addEventListener('click', nextSlide);
    });
    document.getElementById('start-button').addEventListener('click', showRulesPage);
    document.getElementById('next-button').addEventListener('click', () => {
        if (youtubePlayer && youtubePlayer.getPlayerState() === YT.PlayerState.PLAYING) {
            youtubePlayer.pauseVideo();
        }
        showMenu();
    });
    document.getElementById('watch-stream-button').addEventListener('click', watchStream);
    document.getElementById('play-button').addEventListener('click', showLoginForm);
    document.getElementById('rules-button').addEventListener('click', showRulesPage);
    document.getElementById('login-button').addEventListener('click', login);

    document.querySelectorAll('.choice').forEach(button => {
        button.addEventListener('click', () => confirmChoice(button.dataset.choice));
    });
}

function initYouTubePlayer() {
    // Load the YouTube IFrame Player API code asynchronously
    var tag = document.createElement('script');
    tag.src = "https://www.youtube.com/iframe_api";
    var firstScriptTag = document.getElementsByTagName('script')[0];
    firstScriptTag.parentNode.insertBefore(tag, firstScriptTag);
}

// This function will be called when the YouTube IFrame Player API is ready
function onYouTubeIframeAPIReady() {
    youtubePlayer = new YT.Player('youtube-player', {
        events: {
            'onReady': onPlayerReady,
        }
    });
}

function onPlayerReady(event) {
    // The player is ready
    console.log('YouTube player is ready');
}

function showSlide(n) {
    const slides = document.querySelectorAll('.slide');
    slides.forEach(slide => slide.classList.remove('active'));
    slides[n].classList.add('active');
}

function nextSlide() {
    currentSlide++;
    if (currentSlide >= document.querySelectorAll('.slide').length) {
        currentSlide = 0;
    }
    showSlide(currentSlide);
}

function showRulesPage() {
    document.getElementById('slider-container').style.display = 'none';
    document.getElementById('menu').style.display = 'none';
    document.getElementById('rules-page').style.display = 'grid';
}

function showMenu() {
    document.getElementById('rules-page').style.display = 'none';
    document.getElementById('menu').style.display = 'grid';
}

function watchStream() {
    alert('Watch Stream feature is not implemented yet.');
}

function showLoginForm() {
    document.getElementById('menu').style.display = 'none';
    document.getElementById('login-form').style.display = 'grid';
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
           // document.getElementById('current-game-id').textContent = currentGameId;
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
        console.error('Firebase database not initialized');
        return;
    }
    const gameRef = database.ref(`games/${currentGameId}`);
    gameRef.on('value', (snapshot) => {
        const game = snapshot.val();
        if (!game) {
            console.error('Game data not found');
            return;
        }
        
        document.getElementById('player1-name').textContent = `${game.player1} (${game.player1_score || 0})`;
        
        if (game.player2) {
            document.getElementById('player2-name').textContent = `${game.player2} (${game.player2_score || 0})`;
            updatePlayerPhoto('player2', currentGameId);
        } else {
            document.getElementById('player2-name').textContent = 'Waiting for player...';
            document.getElementById('player2-photo').style.display = 'none';
        }

        updatePlayerPhoto('player1', currentGameId);

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
    });
}

function updatePlayerPhoto(player, gameId) {
    const imgElement = document.getElementById(`${player}-photo`);
    if (!imgElement) {
        console.error(`Image element for ${player} not found`);
        return;
    }
    
    const photoUrl = `/static/images/${gameId}/${player}.png`;
    
    imgElement.onerror = function() {
        console.warn(`Failed to load image for ${player}, using default avatar`);
        this.onerror = null; // Prevent infinite loop
        this.src = '/static/default-avatar.png'; // Fallback to default avatar
    };
    
    imgElement.src = photoUrl;
    imgElement.style.display = 'inline'; // Ensure the image is visible
}

function checkOrientation() {
    const desktopMessage = document.getElementById('desktop-message');
    const rotateMessage = document.getElementById('rotate-message');
    const mobileContent = document.getElementById('mobile-content');

    if (window.innerWidth >= 768) {
        // Desktop view
        if (desktopMessage) desktopMessage.style.display = 'flex';
        if (rotateMessage) rotateMessage.style.display = 'none';
        if (mobileContent) mobileContent.style.display = 'none';
    } else if (window.innerHeight < window.innerWidth) {
        // Mobile landscape view
        if (desktopMessage) desktopMessage.style.display = 'none';
        if (rotateMessage) rotateMessage.style.display = 'flex';
        if (mobileContent) mobileContent.style.display = 'none';
    } else {
        // Mobile portrait view
        if (desktopMessage) desktopMessage.style.display = 'none';
        if (rotateMessage) rotateMessage.style.display = 'none';
        if (mobileContent) mobileContent.style.display = 'block';
    }
}

window.addEventListener('load', checkOrientation);
window.addEventListener('resize', checkOrientation);