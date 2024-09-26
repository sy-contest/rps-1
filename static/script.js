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

    document.querySelector('.current-player-info .up-arrow').addEventListener('click', toggleCurrentPlayerInfo);
}

function toggleCurrentPlayerInfo() {
    const currentPlayerInfo = document.querySelector('.current-player-info');
    const arrow = currentPlayerInfo.querySelector('.up-arrow');
    const emojiGrid = currentPlayerInfo.querySelector('.emoji-grid');
    
    currentPlayerInfo.classList.toggle('expanded');
    arrow.classList.toggle('rotated');
    
    if (currentPlayerInfo.classList.contains('expanded')) {
        loadEmojis(emojiGrid);
        emojiGrid.style.display = 'grid';
    } else {
        emojiGrid.style.display = 'none';
    }
}

function loadEmojis(emojiGrid) {
    // Clear existing emojis
    emojiGrid.innerHTML = '';
    
    // Load 16 emojis from the static/images/emoji/ folder
    for (let i = 1; i <= 16; i++) {
        const img = document.createElement('img');
        img.src = `/static/images/emoji/emoji${i}.png`;
        img.alt = `Emoji ${i}`;
        emojiGrid.appendChild(img);
    }
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
    
    // Add this line to update the container background color
    document.getElementById('mobile-content').setAttribute('data-active-slide', n);
}

function nextSlide() {
    currentSlide++;
    if (currentSlide >= document.querySelectorAll('.slide').length) {
        currentSlide = 0;
    }
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
        
        updateCurrentPlayerInfo(game);  // Pass the game data here

        if (game.status === 'waiting') {
            disableChoiceButtons();
        } else if (game.status === 'playing') {
            if (game[`${currentPlayer}_choice`]) {
                disableChoiceButtons();
            } else {
                enableChoiceButtons();
            }
        } else if (game.status === 'finished') {
            disableChoiceButtons();
            document.getElementById('result').textContent = '';
        }
    });
}

function updateCurrentPlayerInfo(gameData) {
    const currentPlayerPhoto = document.getElementById('current-player-photo');
    const currentPlayerName = document.getElementById('current-player-name');
    
    if (currentPlayer === 'player1') {
        currentPlayerPhoto.src = `/static/images/${currentGameId}/player1.png`;
        currentPlayerName.textContent = gameData.player1;
    } else if (currentPlayer === 'player2') {
        currentPlayerPhoto.src = `/static/images/${currentGameId}/player2.png`;
        currentPlayerName.textContent = gameData.player2;
    }

    // Add error handling for the image
    currentPlayerPhoto.onerror = function() {
        console.warn(`Failed to load image for ${currentPlayer}, using default avatar`);
        this.onerror = null; // Prevent infinite loop
        this.src = '/static/default-avatar.png'; // Fallback to default avatar
    };
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