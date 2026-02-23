document.addEventListener('DOMContentLoaded', async () => {
  const userList = document.getElementById('userList');
  const searchInput = document.getElementById('searchInput');
  const themeToggle = document.getElementById('themeToggle');
  const tabs = document.querySelectorAll('.tab');
  const exportCSV = document.getElementById('exportCSV');
  const exportJSON = document.getElementById('exportJSON');

  let data = {
    followers: [],
    following: [],
    dontFollowBack: [],
    iDontFollowBack: [],
    mutuals: []
  };

  let currentTab = 'dontFollowBack';

  await loadData();
  initTheme();

  themeToggle.addEventListener('click', toggleTheme);
  searchInput.addEventListener('input', () => renderList(currentTab));
  exportCSV.addEventListener('click', () => downloadCSV(currentTab));
  exportJSON.addEventListener('click', () => downloadJSON(currentTab));

  tabs.forEach(tab => {
    tab.addEventListener('click', () => {
      tabs.forEach(t => t.classList.remove('active'));
      tab.classList.add('active');
      currentTab = tab.dataset.tab;
      renderList(currentTab);
    });
  });

  async function loadData() {
    try {
      const stored = await chrome.storage.local.get(['instagramData']);

      if (!stored.instagramData) {
        userList.innerHTML = '<div class="empty">No data found. Please run the analyzer first.</div>';
        return;
      }

      const { followers, following } = stored.instagramData;

      data.followers = followers;
      data.following = following;

      const followerUsernames = new Set(followers.map(f => f.username.toLowerCase()));
      const followingUsernames = new Set(following.map(f => f.username.toLowerCase()));

      data.dontFollowBack = following.filter(u => !followerUsernames.has(u.username.toLowerCase()));
      data.iDontFollowBack = followers.filter(u => !followingUsernames.has(u.username.toLowerCase()));
      data.mutuals = following.filter(u => followerUsernames.has(u.username.toLowerCase()));

      document.getElementById('followersCount').textContent = followers.length.toLocaleString();
      document.getElementById('followingCount').textContent = following.length.toLocaleString();
      document.getElementById('dontFollowBackCount').textContent = data.dontFollowBack.length.toLocaleString();
      document.getElementById('iDontFollowBackCount').textContent = data.iDontFollowBack.length.toLocaleString();
      document.getElementById('mutualsCount').textContent = data.mutuals.length.toLocaleString();

      renderList(currentTab);
    } catch (error) {
      console.error('Error loading data:', error);
      userList.innerHTML = '<div class="empty">Error loading data. Please try again.</div>';
    }
  }

  function renderList(tabName) {
    const users = data[tabName] || [];
    const searchTerm = searchInput.value.toLowerCase();

    const filtered = users.filter(u =>
      u.username.toLowerCase().includes(searchTerm) ||
      (u.full_name && u.full_name.toLowerCase().includes(searchTerm))
    );

    if (filtered.length === 0) {
      userList.innerHTML = '<div class="empty">No users found</div>';
      return;
    }

    userList.innerHTML = filtered.map(user => `
      <div class="user-item">
        <img class="user-avatar" src="${user.profile_pic_url || 'data:image/svg+xml,<svg xmlns=%22http://www.w3.org/2000/svg%22 viewBox=%220 0 24 24%22><circle cx=%2212%22 cy=%2212%22 r=%2210%22 fill=%22%23ddd%22/></svg>'}" alt="${user.username}" onerror="this.src='data:image/svg+xml,<svg xmlns=%22http://www.w3.org/2000/svg%22 viewBox=%220 0 24 24%22><circle cx=%2212%22 cy=%2212%22 r=%2210%22 fill=%22%23ddd%22/></svg>'">
        <div class="user-info">
          <a class="user-username" href="https://www.instagram.com/${user.username}/" target="_blank">@${escapeHtml(user.username)}</a>
          ${user.full_name ? `<div class="user-fullname">${escapeHtml(user.full_name)}</div>` : ''}
        </div>
      </div>
    `).join('');
  }

  function initTheme() {
    if (localStorage.getItem('insta-analyzer-theme') === 'dark') {
      document.body.classList.add('dark-mode');
    }
  }

  function toggleTheme() {
    document.body.classList.toggle('dark-mode');
    const isDark = document.body.classList.contains('dark-mode');
    localStorage.setItem('insta-analyzer-theme', isDark ? 'dark' : 'light');
  }

  function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }

  function downloadCSV(tabName) {
    const users = data[tabName] || [];
    if (users.length === 0) return;

    const headers = ['username', 'full_name', 'profile_url'];
    const rows = users.map(u => [
      u.username,
      u.full_name || '',
      `https://www.instagram.com/${u.username}/`
    ]);

    const csv = [headers.join(','), ...rows.map(r => r.map(c => `"${c}"`).join(','))].join('\n');
    downloadFile(csv, `instagram-${tabName}.csv`, 'text/csv');
  }

  function downloadJSON(tabName) {
    const users = data[tabName] || [];
    downloadFile(JSON.stringify(users, null, 2), `instagram-${tabName}.json`, 'application/json');
  }

  function downloadFile(content, filename, mimeType) {
    const blob = new Blob([content], { type: mimeType });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
  }
});
