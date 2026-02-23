const InstagramParser = {
    parseFollowers(data) {
        try {
            let followersArray;

            if (data.relationships_followers) {
                followersArray = data.relationships_followers;
            } else if (Array.isArray(data)) {
                followersArray = data;
            } else {
                throw new Error('Unknown followers format');
            }

            return followersArray.map(item => {
                const userData = item.string_list_data?.[0] || {};
                return {
                    username: userData.value || item.value || 'Unknown',
                    timestamp: userData.timestamp || item.timestamp || null,
                    href: userData.href || `https://www.instagram.com/${userData.value || item.value}/`
                };
            }).filter(user => user.username !== 'Unknown');
        } catch (error) {
            console.error('Error parsing followers:', error);
            return [];
        }
    },

    parseFollowing(data) {
        try {
            let followingArray;

            if (data.relationships_following) {
                followingArray = data.relationships_following;
            } else if (Array.isArray(data)) {
                followingArray = data;
            } else {
                throw new Error('Unknown following format');
            }

            return followingArray.map(item => {
                const userData = item.string_list_data?.[0] || {};
                return {
                    username: userData.value || item.value || 'Unknown',
                    timestamp: userData.timestamp || item.timestamp || null,
                    href: userData.href || `https://www.instagram.com/${userData.value || item.value}/`
                };
            }).filter(user => user.username !== 'Unknown');
        } catch (error) {
            console.error('Error parsing following:', error);
            return [];
        }
    },

    findDontFollowBack(followers, following) {
        const followerUsernames = new Set(followers.map(f => f.username.toLowerCase()));
        return following.filter(user => !followerUsernames.has(user.username.toLowerCase()));
    },

    findIDontFollowBack(followers, following) {
        const followingUsernames = new Set(following.map(f => f.username.toLowerCase()));
        return followers.filter(user => !followingUsernames.has(user.username.toLowerCase()));
    },

    findMutuals(followers, following) {
        const followerUsernames = new Set(followers.map(f => f.username.toLowerCase()));
        return following.filter(user => followerUsernames.has(user.username.toLowerCase()));
    },

    formatTimestamp(timestamp) {
        if (!timestamp) return 'Unknown';
        return new Date(timestamp * 1000).toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'short',
            day: 'numeric'
        });
    }
};

if (typeof window !== 'undefined') {
    window.InstagramParser = InstagramParser;
}
