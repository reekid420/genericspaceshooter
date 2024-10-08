function getLeaderboard() {
    return fetch(`${API_URL}/leaderboard`, {
        method: 'GET',
        headers: {
            'Content-Type': 'application/json',
        },
        credentials: 'include'
    })
    .then(response => {
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        return response.json();
    })
    .catch((error) => {
        console.error("Error fetching leaderboard:", error);
        throw error;
    });
}

function displayLeaderboard() {
    const leaderboardElement = document.getElementById('leaderboard');
    if (!leaderboardElement) return;

    getLeaderboard().then((leaderboard) => {
        let leaderboardHTML = '<h2>Leaderboard</h2><ol>';
        leaderboard.forEach(entry => {
            const username = entry.username || 'Anonymous';
            const score = entry.score || 0;
            leaderboardHTML += `<li>${username}: ${score}</li>`;
        });
        leaderboardHTML += '</ol>';
        leaderboardElement.innerHTML = leaderboardHTML;
    }).catch(error => {
        console.error("Error displaying leaderboard:", error);
        leaderboardElement.innerHTML = '<h2>Leaderboard</h2><p>Error loading leaderboard. Please try again later.</p>';
    });
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