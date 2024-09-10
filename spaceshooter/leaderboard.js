// leaderboard.js

const LEADERBOARD_KEY = 'spaceShooterLeaderboard';
const MAX_LEADERBOARD_ENTRIES = 5;

function getLeaderboard() {
    const leaderboardJSON = localStorage.getItem(LEADERBOARD_KEY);
    return leaderboardJSON ? JSON.parse(leaderboardJSON) : [];
}

function saveLeaderboard(leaderboard) {
    localStorage.setItem(LEADERBOARD_KEY, JSON.stringify(leaderboard));
}

function addScoreToLeaderboard(name, score) {
    const leaderboard = getLeaderboard();
    leaderboard.push({ name, score });
    leaderboard.sort((a, b) => b.score - a.score);
    if (leaderboard.length > MAX_LEADERBOARD_ENTRIES) {
        leaderboard.length = MAX_LEADERBOARD_ENTRIES;
    }
    saveLeaderboard(leaderboard);
}

function displayLeaderboard() {
    const leaderboard = getLeaderboard();
    const leaderboardElement = document.getElementById('leaderboard');
    leaderboardElement.innerHTML = '<h2>Leaderboard</h2>';
    const leaderboardList = document.createElement('ol');
    leaderboard.forEach(entry => {
        const listItem = document.createElement('li');
        listItem.textContent = `${entry.name}: ${entry.score}`;
        leaderboardList.appendChild(listItem);
    });
    leaderboardElement.appendChild(leaderboardList);
}

function promptForName(score) {
    const name = prompt("Enter your name (3-5 characters):", "");
    if (name && name.length >= 3 && name.length <= 5) {
        addScoreToLeaderboard(name.toUpperCase(), score);
        displayLeaderboard();
    } else if (name !== null) {
        alert("Invalid name. Please enter 3-5 characters.");
        promptForName(score);
    }
}

function toggleLeaderboard() {
    const leaderboardElement = document.getElementById('leaderboard');
    if (leaderboardElement.style.display === 'none') {
        leaderboardElement.style.display = 'block';
        displayLeaderboard();
    } else {
        leaderboardElement.style.display = 'none';
    }
}


