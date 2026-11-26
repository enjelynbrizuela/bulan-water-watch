
const API_BASE_URL = "https://bulan-water-watch.up.railway.app/api";

function getAuthToken() {
    return sessionStorage.getItem("waterWatchToken");
}

async function apiRequest(endpoint, options = {}) {
    const token = getAuthToken();

    const headers = {
        "Content-Type": "application/json",
        ...(options.headers || {})
    };

    if (token) {
        headers.Authorization = `Bearer ${token}`;
    }

    const response = await fetch(
        `${API_BASE_URL}${endpoint}`,
        {
            ...options,
            headers
        }
    );

    let data;

    try {
        data = await response.json();
    } catch {
        throw new Error("Invalid server response.");
    }

    if (!response.ok) {
        if (response.status === 401 || response.status === 403) {
            sessionStorage.removeItem("waterWatchToken");
            sessionStorage.removeItem("waterWatchCurrentUser");
        }

        throw new Error(
            data.message || "Something went wrong."
        );
    }

    return data;
}
