document.addEventListener('DOMContentLoaded', () => {
    const uploadZone = document.getElementById('uploadZone');
    const fileInput = document.getElementById('fileInput');
    const analyzeBtn = document.getElementById('analyzeBtn');
    const uploadSection = document.getElementById('uploadSection');
    const loading = document.getElementById('loading');
    const results = document.getElementById('results');
    const themeToggle = document.getElementById('themeToggle');
    const followersStatus = document.getElementById('followersStatus');
    const followingStatus = document.getElementById('followingStatus');
    const exportCSV = document.getElementById('exportCSV');
    const exportJSON = document.getElementById('exportJSON');
    const resetBtn = document.getElementById('resetBtn');

    const searchDontFollow = document.getElementById('searchDontFollow');
    const searchIDontFollow = document.getElementById('searchIDontFollow');
    const searchMutuals = document.getElementById('searchMutuals');

    let uploadedData = { followers: null, following: null };

    let analysisResults = {
        followers: [],
        following: [],
        dontFollowBack: [],
        iDontFollowBack: [],
        mutuals: []
    };

    initTheme();

    themeToggle.addEventListener('click', toggleTheme);
    uploadZone.addEventListener('click', () => fileInput.click());
    uploadZone.addEventListener('dragover', handleDragOver);
    uploadZone.addEventListener('dragleave', handleDragLeave);
    uploadZone.addEventListener('drop', handleDrop);
    fileInput.addEventListener('change', handleFileSelect);
    analyzeBtn.addEventListener('click', analyzeData);
    exportCSV.addEventListener('click', handleExportCSV);
    exportJSON.addEventListener('click', handleExportJSON);
    resetBtn.addEventListener('click', resetApp);

    searchDontFollow.addEventListener('input', (e) => filterList('dontFollowBackList', analysisResults.dontFollowBack, e.target.value));
    searchIDontFollow.addEventListener('input', (e) => filterList('iDontFollowBackList', analysisResults.iDontFollowBack, e.target.value));
    searchMutuals.addEventListener('input', (e) => filterList('mutualsList', analysisResults.mutuals, e.target.value));

    function initTheme() {
        const savedTheme = localStorage.getItem('theme');
        const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
        if (savedTheme === 'dark' || (!savedTheme && prefersDark)) {
            document.body.classList.add('dark-mode');
        }
    }

    function toggleTheme() {
        document.body.classList.toggle('dark-mode');
        localStorage.setItem('theme', document.body.classList.contains('dark-mode') ? 'dark' : 'light');
    }

    function handleDragOver(e) {
        e.preventDefault();
        uploadZone.classList.add('dragover');
    }

    function handleDragLeave(e) {
        e.preventDefault();
        uploadZone.classList.remove('dragover');
    }

    function handleDrop(e) {
        e.preventDefault();
        uploadZone.classList.remove('dragover');
        processFiles(e.dataTransfer.files);
    }

    function handleFileSelect(e) {
        processFiles(e.target.files);
    }

    async function processFiles(files) {
        for (const file of files) {
            if (file.name.endsWith('.zip')) {
                await processZipFile(file);
            } else if (file.name.endsWith('.json')) {
                await processJsonFile(file);
            }
        }
        updateFileStatus();
    }

    async function processZipFile(file) {
        alert('Please extract the ZIP file and upload the JSON files directly (followers.json and following.json)');
    }

    async function processJsonFile(file) {
        try {
            const data = JSON.parse(await file.text());
            const fileName = file.name.toLowerCase();

            if (fileName.includes('follower') && !fileName.includes('following')) {
                uploadedData.followers = data;
                updateStatusIcon(followersStatus, true);
            } else if (fileName.includes('following')) {
                uploadedData.following = data;
                updateStatusIcon(followingStatus, true);
            } else {
                if (data.relationships_followers || (Array.isArray(data) && data[0]?.string_list_data)) {
                    if (JSON.stringify(data).includes('followers')) {
                        uploadedData.followers = data;
                        updateStatusIcon(followersStatus, true);
                    } else {
                        uploadedData.following = data;
                        updateStatusIcon(followingStatus, true);
                    }
                }
            }
        } catch (error) {
            console.error('Error processing JSON file:', error);
            alert(`Error reading ${file.name}. Please make sure it's a valid JSON file.`);
        }
    }

    function updateStatusIcon(element, loaded) {
        const icon = element.querySelector('.file-icon');
        icon.textContent = loaded ? '\u2714' : '\u2716';
        icon.classList.toggle('loaded', loaded);
        icon.classList.toggle('pending', !loaded);
    }

    function updateFileStatus() {
        analyzeBtn.disabled = !(uploadedData.followers && uploadedData.following);
    }

    function analyzeData() {
        loading.style.display = 'block';
        uploadSection.style.display = 'none';

        setTimeout(() => {
            try {
                analysisResults.followers = InstagramParser.parseFollowers(uploadedData.followers);
                analysisResults.following = InstagramParser.parseFollowing(uploadedData.following);
                analysisResults.dontFollowBack = InstagramParser.findDontFollowBack(analysisResults.followers, analysisResults.following);
                analysisResults.iDontFollowBack = InstagramParser.findIDontFollowBack(analysisResults.followers, analysisResults.following);
                analysisResults.mutuals = InstagramParser.findMutuals(analysisResults.followers, analysisResults.following);

                displayResults();
            } catch (error) {
                console.error('Error analyzing data:', error);
                alert('Error analyzing data. Please make sure you uploaded the correct files.');
                resetApp();
            }
        }, 100);
    }

    function displayResults() {
        document.getElementById('followersCount').textContent = analysisResults.followers.length.toLocaleString();
        document.getElementById('followingCount').textContent = analysisResults.following.length.toLocaleString();
        document.getElementById('dontFollowBackCount').textContent = analysisResults.dontFollowBack.length.toLocaleString();
        document.getElementById('iDontFollowBackCount').textContent = analysisResults.iDontFollowBack.length.toLocaleString();
        document.getElementById('mutualsCount').textContent = analysisResults.mutuals.length.toLocaleString();

        document.getElementById('dontFollowBackListCount').textContent = `(${analysisResults.dontFollowBack.length})`;
        document.getElementById('iDontFollowBackListCount').textContent = `(${analysisResults.iDontFollowBack.length})`;
        document.getElementById('mutualsListCount').textContent = `(${analysisResults.mutuals.length})`;

        renderList('dontFollowBackList', analysisResults.dontFollowBack);
        renderList('iDontFollowBackList', analysisResults.iDontFollowBack);
        renderList('mutualsList', analysisResults.mutuals);

        loading.style.display = 'none';
        results.style.display = 'block';
    }

    function renderList(containerId, users) {
        const container = document.getElementById(containerId);

        if (users.length === 0) {
            container.innerHTML = '<p class="empty-message">No users found</p>';
            return;
        }

        container.innerHTML = users.map(user => `
            <div class="list-item">
                <a href="${user.href}" target="_blank" rel="noopener noreferrer" class="username">
                    @${escapeHtml(user.username)}
                </a>
                ${user.timestamp ? `<span class="timestamp">${InstagramParser.formatTimestamp(user.timestamp)}</span>` : ''}
            </div>
        `).join('');
    }

    function filterList(containerId, users, searchTerm) {
        renderList(containerId, users.filter(user =>
            user.username.toLowerCase().includes(searchTerm.toLowerCase())
        ));
    }

    function handleExportCSV() {
        [
            { name: "dont-follow-back", data: analysisResults.dontFollowBack },
            { name: "you-dont-follow-back", data: analysisResults.iDontFollowBack },
            { name: "mutuals", data: analysisResults.mutuals }
        ].forEach(item => {
            if (item.data.length > 0) {
                ExportUtils.toCSV(item.data.map(user => ({
                    username: user.username,
                    profile_url: user.href,
                    followed_since: user.timestamp ? InstagramParser.formatTimestamp(user.timestamp) : 'Unknown'
                })), `instagram-${item.name}.csv`);
            }
        });
    }

    function handleExportJSON() {
        ExportUtils.exportAllData(analysisResults);
    }

    function resetApp() {
        uploadedData = { followers: null, following: null };
        analysisResults = { followers: [], following: [], dontFollowBack: [], iDontFollowBack: [], mutuals: [] };

        updateStatusIcon(followersStatus, false);
        updateStatusIcon(followingStatus, false);
        analyzeBtn.disabled = true;
        fileInput.value = '';

        searchDontFollow.value = '';
        searchIDontFollow.value = '';
        searchMutuals.value = '';

        loading.style.display = 'none';
        results.style.display = 'none';
        uploadSection.style.display = 'block';
    }

    function escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }
});
