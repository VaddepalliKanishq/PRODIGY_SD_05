import logging
import os
import queue

# Thread-safe queue to stream logs to the frontend UI
log_queue = queue.Queue()

class QueueHandler(logging.Handler):
    """Custom logging handler to push formatted records into log_queue."""
    def __init__(self, target_queue):
        super().__init__()
        self.target_queue = target_queue

    def emit(self, record):
        try:
            msg = self.format(record)
            self.target_queue.put(msg)
        except Exception:
            self.handleError(record)

def setup_logger():
    os.makedirs("logs", exist_ok=True)
    logger = logging.getLogger("ScraperLogger")
    logger.setLevel(logging.INFO)
    
    # Check if handlers are already set up to prevent duplicate registrations
    if not logger.handlers:
        file_handler = logging.FileHandler("logs/scraper.log", mode="a", encoding="utf-8")
        console_handler = logging.StreamHandler()
        queue_handler = QueueHandler(log_queue)
        
        formatter = logging.Formatter('%(asctime)s [%(levelname)s] %(message)s')
        file_handler.setFormatter(formatter)
        console_handler.setFormatter(formatter)
        queue_handler.setFormatter(formatter)
        
        logger.addHandler(file_handler)
        logger.addHandler(console_handler)
        logger.addHandler(queue_handler)
        
    return logger

logger = setup_logger()
