export function resolveAssetUrl(path: string): URL {
    if (/^https?:\/\//i.test(path)) return new URL(path);
    const base = `http://${import.meta.env.VITE_WS_HOST}:${import.meta.env.VITE_WS_PORT}`;
    return new URL(path, base);
}

export async function fetchAsset(path: string): Promise<Response> {
    const url = resolveAssetUrl(path);
    const response = await fetch(url.toString());
    if (!response.ok) {
        throw new Error(`Failed to fetch asset: ${response.status}`);
    }
    return response;
}