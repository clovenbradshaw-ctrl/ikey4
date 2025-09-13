// Fetch the number of pull requests for this repository and display it as the app version
// The version is shown in the Settings tab under the element with id "app-version".

async function updateAppVersion() {
    const versionEl = document.getElementById('app-version');
    if (!versionEl) return;

    // Attempt to derive owner and repo from GitHub Pages URL (owner.github.io/repo)
    let owner = null;
    let repo = null;

    const hostMatch = window.location.hostname.match(/^([^\.]+)\.github\.io$/);
    if (hostMatch) {
        owner = hostMatch[1];
        const pathParts = window.location.pathname.split('/').filter(Boolean);
        if (pathParts.length > 0) {
            repo = pathParts[0];
        }
    }

    // If owner or repo cannot be determined, abort
    if (!owner || !repo) {
        return;
    }

    try {
        const response = await fetch(`https://api.github.com/search/issues?q=repo:${owner}/${repo}+type:pr`);
        const data = await response.json();
        if (data && typeof data.total_count === 'number') {
            versionEl.textContent = `Version ${data.total_count}`;
        }
    } catch (err) {
        console.error('Failed to fetch pull request count', err);
    }
}

document.addEventListener('DOMContentLoaded', updateAppVersion);
