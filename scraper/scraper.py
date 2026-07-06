import requests
import time
from utils.logger import logger
from config import TIMEOUT, MAX_RETRIES

HEADERS = {
    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
}

def get_page(url):
    """Fetches HTML content from a URL with retry logic."""
    for attempt in range(MAX_RETRIES):
        try:
            logger.info(f"Fetching URL: {url} (Attempt {attempt + 1}/{MAX_RETRIES})")
            response = requests.get(url, headers=HEADERS, timeout=TIMEOUT)
            response.raise_for_status()
            return response.text
        except requests.RequestException as e:
            logger.warning(f"Attempt {attempt + 1} failed for {url}: {e}")
            if attempt < MAX_RETRIES - 1:
                time.sleep(2)
    logger.error(f"Failed to fetch {url} after {MAX_RETRIES} attempts.")
    return None
