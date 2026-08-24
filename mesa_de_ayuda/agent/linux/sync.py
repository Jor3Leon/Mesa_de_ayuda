"""
STIC Agent - Synchronization Module (Linux)
Handles HTTP/HTTPS communication with the Helpdesk backend.
100% Native Python 3 Standard Library (urllib), zero external dependencies.
"""

import json
import urllib.request
import urllib.error
import ssl
import sys


def sync_to_server(payload, server_url="https://mesa-de-ayuda-rho.vercel.app", api_key="", proxy="", verify_tls=True):
    """
    Send system inventory payload to Helpdesk backend API.
    Returns (success: bool, message: str, asset_id: int/None)
    """
    server_url = server_url.rstrip("/")
    if not server_url.endswith("/api/assets/sync"):
        if server_url.endswith("/api"):
            endpoint = f"{server_url}/assets/sync"
        else:
            endpoint = f"{server_url}/api/assets/sync"
    else:
        endpoint = server_url

    headers = {
        "Content-Type": "application/json; charset=utf-8",
        "User-Agent": "STIC-Agent/2.0.0 (Linux; Python 3)",
        "X-Organization-Slug": payload.get("organizationSlug", "stic")
    }

    if api_key:
        headers["X-Agent-Key"] = api_key

    data_bytes = json.dumps(payload, ensure_ascii=False).encode("utf-8")

    # SSL Context
    ssl_context = None
    if not verify_tls:
        ssl_context = ssl._create_unverified_context()

    # Proxy support
    handlers = []
    if proxy:
        handlers.append(urllib.request.ProxyHandler({"http": proxy, "https": proxy}))
    
    if ssl_context:
        handlers.append(urllib.request.HTTPSHandler(context=ssl_context))

    opener = urllib.request.build_opener(*handlers) if handlers else urllib.request.build_opener()

    req = urllib.request.Request(endpoint, data=data_bytes, headers=headers, method="POST")

    try:
        with opener.open(req, timeout=30) as resp:
            status_code = resp.getcode()
            body = resp.read().decode("utf-8")
            try:
                res_json = json.loads(body)
            except Exception:
                res_json = {}

            if status_code in (200, 201):
                asset_id = res_json.get("assetId")
                return True, f"Sincronizacion exitosa (ID de activo: {asset_id})", asset_id
            else:
                return False, f"El servidor respondio con codigo {status_code}: {body}", None

    except urllib.error.HTTPError as e:
        err_body = e.read().decode("utf-8", errors="ignore")
        return False, f"Error HTTP {e.code}: {err_body or e.reason}", None
    except urllib.error.URLError as e:
        return False, f"No se pudo conectar con el servidor: {e.reason}", None
    except Exception as e:
        return False, f"Error inesperado: {str(e)}", None
