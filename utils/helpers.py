import os

def setup_directories():
    """Creates the necessary directory structure."""
    dirs = [
        "data/raw", "data/processed", "data/backup", 
        "logs", "output", "scraper", "utils", "templates", "static"
    ]
    for d in dirs:
        os.makedirs(d, exist_ok=True)
