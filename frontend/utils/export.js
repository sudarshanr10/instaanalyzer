const ExportUtils = {
    toCSV(data, filename = 'export.csv') {
        if (!data || data.length === 0) {
            alert('No data to export');
            return;
        }

        const headers = Object.keys(data[0]);
        const rows = data.map(row =>
            headers.map(header => `"${String(row[header] ?? '').replace(/"/g, '""')}"`).join(',')
        );

        this.downloadFile([headers.join(','), ...rows].join('\n'), filename, 'text/csv');
    },

    toJSON(data, filename = 'export.json') {
        if (!data) {
            alert('No data to export');
            return;
        }
        this.downloadFile(JSON.stringify(data, null, 2), filename, 'application/json');
    },

    downloadFile(content, filename, mimeType) {
        const blob = new Blob([content], { type: mimeType });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = filename;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
    },

    exportAllData(analysisData) {
        this.toJSON({
            exportedAt: new Date().toISOString(),
            summary: {
                totalFollowers: analysisData.followers?.length || 0,
                totalFollowing: analysisData.following?.length || 0,
                dontFollowBack: analysisData.dontFollowBack?.length || 0,
                iDontFollowBack: analysisData.iDontFollowBack?.length || 0,
                mutuals: analysisData.mutuals?.length || 0
            },
            followers: analysisData.followers || [],
            following: analysisData.following || [],
            dontFollowBack: analysisData.dontFollowBack || [],
            iDontFollowBack: analysisData.iDontFollowBack || [],
            mutuals: analysisData.mutuals || []
        }, 'instagram-analysis.json');
    }
};

if (typeof window !== 'undefined') {
    window.ExportUtils = ExportUtils;
}
