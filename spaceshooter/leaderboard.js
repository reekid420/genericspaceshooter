// Check if we're in a browser environment
const isBrowser = typeof window !== 'undefined' && typeof window.document !== 'undefined';

const API_URL = 'https://server2-88pt.onrender.com/api';

function getLeaderboard() {
    return fetch(`${API_URL}/leaderboard`)
        .then(response => response.json())
        .catch((error) => {
            console.error("Error fetching leaderboard:", error);
            throw error;
        });
}

function addScoreToLeaderboard(name, score) {
    return fetch(`${API_URL}/leaderboard`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({ name, score }),
    })
    .then(response => response.json())
    .catch((error) => {
        console.error("Error adding score to leaderboard:", error);
        throw error;
    });
}

// Browser-specific functions
if (isBrowser) {
    function displayLeaderboard() {
        const leaderboardElement = document.getElementById('leaderboard');
        if (!leaderboardElement) return;
    
        getLeaderboard().then((leaderboard) => {
            let leaderboardHTML = '<h2>Leaderboard</h2><ol>';
            leaderboard.forEach(entry => {
                leaderboardHTML += `<li>${entry.name}: ${entry.score}</li>`;
            });
            leaderboardHTML += '</ol>';
            leaderboardElement.innerHTML = leaderboardHTML;
        }).catch(error => {
            console.error("Error displaying leaderboard:", error);
            leaderboardElement.innerHTML = '<h2>Leaderboard</h2><p>Error loading leaderboard. Please try again later.</p>';
        });
    }

    function promptForName(score) {
        const name = prompt("Enter your name (3-5 characters):", "");
        if (name && name.length >= 3 && name.length <= 5) {
            addScoreToLeaderboard(name.toUpperCase(), score).then(() => {
                displayLeaderboard();
                // Remove the call to restartGame here
            }).catch(error => {
                console.error("Error adding score to leaderboard:", error);
            });
        } else if (name !== null) {
            alert("Invalid name. Please enter 3-5 characters.");
            promptForName(score);
        }
    }

    function toggleLeaderboard() {
        const leaderboardElement = document.getElementById('leaderboard');
        if (leaderboardElement) {
            if (leaderboardElement.style.display === 'none') {
                leaderboardElement.style.display = 'block';
                displayLeaderboard();
            } else {
                leaderboardElement.style.display = 'none';
            }
        }
    }

    // Initialize leaderboard display
    document.addEventListener('DOMContentLoaded', () => {
        const toggleButton = document.getElementById('leaderboard-toggle');
        if (toggleButton) {
            toggleButton.addEventListener('click', toggleLeaderboard);
        }
        displayLeaderboard();
    });
}

// Export functions for Node.js environment
if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        getLeaderboard,
        addScoreToLeaderboard
    };
}