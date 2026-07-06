import os

BASE_URL = "https://books.toscrape.com/catalogue/page-{}.html"
MAX_PAGES = 5  # Default max pages to scrape
TIMEOUT = 10
MAX_RETRIES = 3

# Directories
DATA_DIR = "data"
RAW_DATA = os.path.join(DATA_DIR, "raw", "products_raw.csv")
CLEAN_DATA = os.path.join(DATA_DIR, "processed", "products_clean.csv")
CLEAN_JSON = os.path.join(DATA_DIR, "processed", "products_clean.json")
REPORT_FILE = os.path.join("output", "report.txt")
LOG_FILE = os.path.join("logs", "scraper.log")
