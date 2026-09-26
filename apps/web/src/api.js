const BASE_URL = import.meta.env.VITE_API_URL ?? "";
async function get(path) {
    const response = await fetch(`${BASE_URL}${path}`);
    if (!response.ok) {
        throw new Error(`API ${response.status} on ${path}`);
    }
    return (await response.json());
}
export function fetchAnalysis(id) {
    return get(`/api/v1/analyses/${id}`);
}
export function fetchCandidates(id, limit = 50, cursor = "0") {
    return get(`/api/v1/analyses/${id}/candidates?limit=${limit}&cursor=${cursor}`);
}
export function apiConfigured() {
    return BASE_URL.length > 0;
}
