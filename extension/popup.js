document.addEventListener('DOMContentLoaded', async () => {
  const analyzeBtn = document.getElementById('analyzeBtn');
  const dashboardBtn = document.getElementById('dashboardBtn');
  const status = document.getElementById('status');
  const progress = document.getElementById('progress');
  const progressFill = document.getElementById('progressFill');
  const progressText = document.getElementById('progressText');
  const statsPreview = document.getElementById('statsPreview');

  await checkExistingData();

  dashboardBtn.addEventListener('click', openDashboard);

  analyzeBtn.addEventListener('click', async () => {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });

    if (!tab.url.includes('instagram.com')) {
      status.textContent = 'Please open Instagram first!';
      status.className = 'status error';
      return;
    }

    analyzeBtn.disabled = true;
    analyzeBtn.innerHTML = '<div class="spinner"></div> Analyzing...';
    status.textContent = 'Fetching your data from Instagram...';
    status.className = 'status loading';
    progress.classList.add('visible');
    statsPreview.style.display = 'none';
    dashboardBtn.style.display = 'none';

    try {
      const response = await chrome.tabs.sendMessage(tab.id, { action: 'fetchData' });

      if (response.error) throw new Error(response.error);

      const { followers, following } = response.data;
      const followerUsernames = new Set(followers.map(f => f.username.toLowerCase()));

      const dontFollowBack = following.filter(u => !followerUsernames.has(u.username.toLowerCase()));
      const mutuals = following.filter(u => followerUsernames.has(u.username.toLowerCase()));

      await chrome.storage.local.set({ instagramData: response.data, fetchedAt: Date.now() });

      status.textContent = `Found ${followers.length} followers and ${following.length} following!`;
      status.className = 'status success';
      progressFill.style.width = '100%';
      progressText.textContent = 'Analysis complete!';

      document.getElementById('previewFollowers').textContent = followers.length;
      document.getElementById('previewFollowing').textContent = following.length;
      document.getElementById('previewDontFollow').textContent = dontFollowBack.length;
      document.getElementById('previewMutuals').textContent = mutuals.length;
      statsPreview.style.display = 'grid';

      analyzeBtn.innerHTML = `
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <polyline points="20 6 9 17 4 12"></polyline>
        </svg>
        Analysis Complete
      `;
      dashboardBtn.style.display = 'flex';

      setTimeout(openDashboard, 1500);

    } catch (error) {
      status.textContent = error.message || 'Error fetching data. Make sure you\'re logged in.';
      status.className = 'status error';
      analyzeBtn.disabled = false;
      analyzeBtn.innerHTML = `
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <circle cx="11" cy="11" r="8"></circle>
          <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
        </svg>
        Try Again
      `;
      progress.classList.remove('visible');
    }
  });

  chrome.runtime.onMessage.addListener((message) => {
    if (message.type === 'progress') {
      progressFill.style.width = `${message.percent}%`;
      progressText.textContent = message.text;
    }
  });

  async function checkExistingData() {
    try {
      const stored = await chrome.storage.local.get(['instagramData', 'fetchedAt']);

      if (stored.instagramData) {
        const { followers, following } = stored.instagramData;
        const followerUsernames = new Set(followers.map(f => f.username.toLowerCase()));

        const dontFollowBack = following.filter(u => !followerUsernames.has(u.username.toLowerCase()));
        const mutuals = following.filter(u => followerUsernames.has(u.username.toLowerCase()));

        document.getElementById('previewFollowers').textContent = followers.length;
        document.getElementById('previewFollowing').textContent = following.length;
        document.getElementById('previewDontFollow').textContent = dontFollowBack.length;
        document.getElementById('previewMutuals').textContent = mutuals.length;
        statsPreview.style.display = 'grid';

        status.textContent = `Last analyzed ${getTimeAgo(new Date(stored.fetchedAt))}`;
        status.className = 'status has-data';

        dashboardBtn.style.display = 'flex';
        analyzeBtn.innerHTML = `
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <polyline points="23 4 23 10 17 10"></polyline>
            <path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10"></path>
          </svg>
          Refresh Data
        `;
      }
    } catch (error) {
      console.error('Error checking existing data:', error);
    }
  }

  function openDashboard() {
    chrome.tabs.create({ url: chrome.runtime.getURL('dashboard/index.html') });
  }

  function getTimeAgo(date) {
    const seconds = Math.floor((new Date() - date) / 1000);
    if (seconds < 60) return 'just now';
    if (seconds < 3600) return `${Math.floor(seconds / 60)} min ago`;
    if (seconds < 86400) return `${Math.floor(seconds / 3600)} hours ago`;
    return `${Math.floor(seconds / 86400)} days ago`;
  }
});
