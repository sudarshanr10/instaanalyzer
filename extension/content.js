chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'fetchData') {
    fetchInstagramData()
      .then(data => sendResponse({ data }))
      .catch(error => sendResponse({ error: error.message }));
    return true;
  }
});

async function fetchInstagramData() {
  const userId = await getCurrentUserId();
  if (!userId) {
    throw new Error('Could not get user ID. Make sure you\'re logged in.');
  }

  const [followers, following] = await Promise.all([
    fetchAllFollowers(userId),
    fetchAllFollowing(userId)
  ]);

  return { followers, following };
}

async function getCurrentUserId() {
  try {
    const scripts = document.querySelectorAll('script[type="application/json"]');
    for (const script of scripts) {
      try {
        const data = JSON.parse(script.textContent);
        const userId = findUserId(data);
        if (userId) return userId;
      } catch (e) {}
    }

    const response = await fetch('https://www.instagram.com/api/v1/users/web_profile_info/?username=' + getLoggedInUsername(), {
      headers: { 'x-ig-app-id': '936619743392459' }
    });
    const data = await response.json();
    return data.data?.user?.id;
  } catch (error) {
    console.error('Error getting user ID:', error);
    return null;
  }
}

function getLoggedInUsername() {
  const cookies = document.cookie.split(';');
  for (const cookie of cookies) {
    if (cookie.trim().startsWith('ds_user_id=')) {
      const usernameMatch = document.body.innerHTML.match(/"username":"([^"]+)"/);
      if (usernameMatch) return usernameMatch[1];
    }
  }

  const match = window.location.pathname.match(/^\/([^\/]+)\/?$/);
  if (match && match[1] !== 'direct' && match[1] !== 'explore') {
    return match[1];
  }

  return null;
}

function findUserId(obj, depth = 0) {
  if (depth > 10) return null;
  if (!obj || typeof obj !== 'object') return null;

  if (obj.id && obj.username && obj.full_name !== undefined) {
    return obj.id;
  }

  for (const key of Object.keys(obj)) {
    const result = findUserId(obj[key], depth + 1);
    if (result) return result;
  }

  return null;
}

async function fetchAllFollowers(userId) {
  const followers = [];
  let after = null;
  let hasNext = true;

  sendProgress(0, 'Fetching followers...');

  while (hasNext) {
    const variables = { id: userId, include_reel: false, fetch_mutual: false, first: 50, after };

    const response = await fetch(
      `https://www.instagram.com/graphql/query/?query_hash=c76146de99bb02f6415203be841dd25a&variables=${encodeURIComponent(JSON.stringify(variables))}`,
      { headers: { 'x-ig-app-id': '936619743392459' } }
    );

    if (!response.ok) throw new Error('Failed to fetch followers. Instagram may be rate limiting.');

    const data = await response.json();
    const edgeData = data.data?.user?.edge_followed_by;

    if (!edgeData) throw new Error('Could not fetch followers. Try refreshing Instagram and try again.');

    hasNext = edgeData.page_info.has_next_page;
    after = edgeData.page_info.end_cursor;

    for (const edge of edgeData.edges) {
      followers.push({
        username: edge.node.username,
        full_name: edge.node.full_name,
        id: edge.node.id,
        profile_pic_url: edge.node.profile_pic_url
      });
    }

    const total = edgeData.count || followers.length;
    sendProgress(Math.min(45, Math.round((followers.length / total) * 45)), `Fetching followers... ${followers.length}/${total}`);
    await sleep(150);
  }

  return followers;
}

async function fetchAllFollowing(userId) {
  const following = [];
  let after = null;
  let hasNext = true;

  sendProgress(50, 'Fetching following...');

  while (hasNext) {
    const variables = { id: userId, include_reel: false, fetch_mutual: false, first: 50, after };

    const response = await fetch(
      `https://www.instagram.com/graphql/query/?query_hash=d04b0a864b4b54837c0d870b0e77e076&variables=${encodeURIComponent(JSON.stringify(variables))}`,
      { headers: { 'x-ig-app-id': '936619743392459' } }
    );

    if (!response.ok) throw new Error('Failed to fetch following. Instagram may be rate limiting.');

    const data = await response.json();
    const edgeData = data.data?.user?.edge_follow;

    if (!edgeData) throw new Error('Could not fetch following. Try refreshing Instagram and try again.');

    hasNext = edgeData.page_info.has_next_page;
    after = edgeData.page_info.end_cursor;

    for (const edge of edgeData.edges) {
      following.push({
        username: edge.node.username,
        full_name: edge.node.full_name,
        id: edge.node.id,
        profile_pic_url: edge.node.profile_pic_url
      });
    }

    const total = edgeData.count || following.length;
    sendProgress(50 + Math.min(45, Math.round((following.length / total) * 45)), `Fetching following... ${following.length}/${total}`);
    await sleep(150);
  }

  return following;
}

function sendProgress(percent, text) {
  chrome.runtime.sendMessage({ type: 'progress', percent, text });
}

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}
