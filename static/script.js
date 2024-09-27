let database;
let currentGameId = null;
let currentPlayer = null;
let currentSlide = 0;
let youtubePlayer;
let backgroundMusic;
let isMusicPlaying = false;
let isSoundEnabled = true;
let earnPointSound;
let losePointSound;

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
    document.querySelectorAll('.next-slide').forEach(button => button.addEventListener('click', nextSlide));
    document.getElementById('start-button').addEventListener('click', showRulesPage);
    document.getElementById('next-button').addEventListener('click', () => {
        youtubePlayer?.pauseVideo();
        showMenu();
    });
    document.getElementById('watch-stream-button').addEventListener('click', watchStream);
    document.getElementById('play-button').addEventListener('click', showLoginForm);
    document.getElementById('rules-button').addEventListener('click', showRulesPage);
    document.getElementById('login-button').addEventListener('click', login);

    document.querySelectorAll('.choice').forEach(button => button.addEventListener('click', () => confirmChoice(button.dataset.choice)));

    backgroundMusic = document.getElementById('background-music');
    earnPointSound = document.getElementById('earn-point-sound');
    losePointSound = document.getElementById('lose-point-sound');
    document.getElementById('play-music-btn').addEventListener('click', toggleMusic);
    document.getElementById('mute-music-btn').addEventListener('click', toggleMusic);
    document.getElementById('enable-sound-btn').addEventListener('click', toggleSound);
    document.getElementById('disable-sound-btn').addEventListener('click', toggleSound);
    
    // Initialize control buttons
    updateMusicControls();
    updateSoundControls();
    
    console.log('Background music initialized:', backgroundMusic);
}

function toggleMusic() {
    if (isMusicPlaying) {
        backgroundMusic.pause();
        isMusicPlaying = false;
    } else {
        backgroundMusic.play();
        isMusicPlaying = true;
    }
    updateMusicControls();
}

function toggleSound() {
    isSoundEnabled = !isSoundEnabled;
    updateSoundControls();
}

function updateMusicControls() {
    const playBtn = document.getElementById('play-music-btn');
    const muteBtn = document.getElementById('mute-music-btn');
    
    if (isMusicPlaying) {
        playBtn.style.display = 'block';
        muteBtn.style.display = 'none';
    } else {
        playBtn.style.display = 'none';
        muteBtn.style.display = 'block';
    }
}

function updateSoundControls() {
    const enableBtn = document.getElementById('enable-sound-btn');
    const disableBtn = document.getElementById('disable-sound-btn');
    
    if (isSoundEnabled) {
        enableBtn.style.display = 'block';
        disableBtn.style.display = 'none';
    } else {
        enableBtn.style.display = 'none';
        disableBtn.style.display = 'block';
    }
}

function playBackgroundMusic() {
    console.log('Attempting to play background music');
    if (backgroundMusic) {
        backgroundMusic.play().then(() => {
            console.log('Background music started successfully');
            isMusicPlaying = true;
            updateMusicControls();
        }).catch(error => {
            console.error('Error playing background music:', error);
        });
    } else {
        console.error('Background music element not found');
    }
}

function stopBackgroundMusic() {
    console.log('Stopping background music');
    if (backgroundMusic) {
        backgroundMusic.pause();
        backgroundMusic.currentTime = 0;
        isMusicPlaying = false;
        updateMusicControls();
    }
}

function initYouTubePlayer() {
    const tag = document.createElement('script');
    tag.src = "https://www.youtube.com/iframe_api";
    document.getElementsByTagName('script')[0].parentNode.insertBefore(tag, document.getElementsByTagName('script')[0]);
}

function onYouTubeIframeAPIReady() {
    youtubePlayer = new YT.Player('youtube-player', {
        events: {
            'onReady': onPlayerReady,
        }
    });
}

function onPlayerReady(event) {
    console.log('YouTube player is ready');
}

function showSlide(n) {
    const slides = document.querySelectorAll('.slide');
    slides.forEach(slide => slide.classList.remove('active'));
    slides[n].classList.add('active');
    document.getElementById('mobile-content').setAttribute('data-active-slide', n);
}

function nextSlide() {
    currentSlide = (currentSlide + 1) % document.querySelectorAll('.slide').length;
    showSlide(currentSlide);
}
 
function showRulesPage() {
    document.getElementById('mobile-content').className = 'container rules-page';
    document.getElementById('slider-container').style.display = 'none';
    document.getElementById('menu').style.display = 'none';
    document.getElementById('rules-page').style.display = 'grid';
}

function showMenu() {
    document.getElementById('mobile-content').className = 'container menu-page';
    document.getElementById('slider-container').style.display = 'none';
    document.getElementById('rules-page').style.display = 'none';
    document.getElementById('login-form').style.display = 'none';
    document.getElementById('game-area').style.display = 'none';
    document.getElementById('menu').style.display = 'grid';
    stopBackgroundMusic();
}

function watchStream() {
    alert('Watch Stream feature is not implemented yet.');
}

function showLoginForm() {
    document.getElementById('mobile-content').className = 'container login-page';
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
            listenForGameUpdates();
            playBackgroundMusic();
            updateMusicControls();
            updateSoundControls();
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
    document.querySelectorAll('.choice').forEach(button => button.disabled = true);
}

function enableChoiceButtons() {
    document.querySelectorAll('.choice').forEach(button => button.disabled = false);
}

let previousGame = null;

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
        
        updateCurrentPlayerInfo(game);

        if (game.status === 'waiting') {
            disableChoiceButtons();
        } else if (game.status === 'playing') {
            if (game[`${currentPlayer}_choice`]) {
                disableChoiceButtons();
            } else {
                enableChoiceButtons();
            }
            
            // Check for score changes and play sounds
            if (game.player1_score !== undefined && game.player2_score !== undefined) {
                const isPlayer1 = currentPlayer === 'player1';
                const currentScore = isPlayer1 ? game.player1_score : game.player2_score;
                const opponentScore = isPlayer1 ? game.player2_score : game.player1_score;
                
                // Update score displays
                document.getElementById('current-player-score').textContent = currentScore;
                document.getElementById('opponent-score').textContent = opponentScore;
                
                if (previousGame) {
                    const previousCurrentScore = isPlayer1 ? previousGame.player1_score : previousGame.player2_score;
                    const previousOpponentScore = isPlayer1 ? previousGame.player2_score : previousGame.player1_score;
                    
                    if (currentScore > previousCurrentScore) {
                        playEarnPointSound();
                    } else if (opponentScore > previousOpponentScore) {
                        playLosePointSound();
                    }
                }
            }
            
            previousGame = {...game};
        } else if (game.status === 'finished') {
            disableChoiceButtons();
            document.getElementById('result').textContent = '';
        }
    });
}

function updateCurrentPlayerInfo(gameData) {
    const currentPlayerPhoto = document.getElementById('current-player-photo');
    const currentPlayerName = document.getElementById('current-player-name');
    const opponentPhoto = document.getElementById('opponent-photo');
    const opponentName = document.getElementById('opponent-name');

    if (currentPlayer === 'player1') {
        currentPlayerPhoto.src = `/static/images/${currentGameId}/player1.png`;
        currentPlayerName.textContent = gameData.player1;
        opponentPhoto.src = `/static/images/${currentGameId}/player2.png`;
        opponentName.textContent = gameData.player2;
    } else if (currentPlayer === 'player2') {
        currentPlayerPhoto.src = `/static/images/${currentGameId}/player2.png`;
        currentPlayerName.textContent = gameData.player2;
        opponentPhoto.src = `/static/images/${currentGameId}/player1.png`;
        opponentName.textContent = gameData.player1;
    }

    currentPlayerPhoto.onerror = function() {
        console.warn(`Failed to load image for ${currentPlayer}, using default avatar`);
        this.onerror = null;
        this.src = '/static/default-avatar.png';
    };

    opponentPhoto.onerror = function() {
        console.warn(`Failed to load image for opponent, using default avatar`);
        this.onerror = null;
        this.src = '/static/default-avatar.png';
    };
}

function checkOrientation() {
    const desktopMessage = document.getElementById('desktop-message');
    const rotateMessage = document.getElementById('rotate-message');
    const mobileContent = document.getElementById('mobile-content');

    if (window.innerWidth >= 768) {
        if (desktopMessage) desktopMessage.style.display = 'flex';
        if (rotateMessage) rotateMessage.style.display = 'none';
        if (mobileContent) mobileContent.style.display = 'none';
    } else if (window.innerHeight < window.innerWidth) {
        if (desktopMessage) desktopMessage.style.display = 'none';
        if (rotateMessage) rotateMessage.style.display = 'flex';
        if (mobileContent) mobileContent.style.display = 'none';
    } else {
        if (desktopMessage) desktopMessage.style.display = 'none';
        if (rotateMessage) rotateMessage.style.display = 'none';
        if (mobileContent) mobileContent.style.display = 'block';
    }
}

window.addEventListener('load', checkOrientation);
window.addEventListener('resize', checkOrientation);

function showGameArea() {
    console.log('Showing game area');
    document.getElementById('mobile-content').className = 'container game-page';
    document.getElementById('menu').style.display = 'none';
    document.getElementById('game-area').style.display = 'grid';
}

function playEarnPointSound() {
    if (isSoundEnabled) {
        earnPointSound.play().catch(error => console.error('Error playing earn point sound:', error));
    }
}

function playLosePointSound() {
    if (isSoundEnabled) {
        losePointSound.play().catch(error => console.error('Error playing lose point sound:', error));
    }
}